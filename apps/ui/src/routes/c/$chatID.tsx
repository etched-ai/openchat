import InputBox from '@/components/InputBox';
import Message, { AssistantMessage } from '@/components/ui/chat/message';
import { queryClient } from '@/lib/reactQuery';
import { type TRPCOutputs, trpc, trpcClient, trpcQueryUtils } from '@/lib/trpc';
import type { DBChatMessage } from '@repo/db';
import { infiniteQueryOptions } from '@tanstack/react-query';
import {
    createFileRoute,
    redirect,
    useLoaderData,
} from '@tanstack/react-router';
import { getQueryKey } from '@trpc/react-query';
import { DateTime } from 'luxon';
import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useOptimistic,
    useRef,
    useState,
    useTransition,
} from 'react';
import { ulid } from 'ulid';

type Loader = {
    initialMessage: DBChatMessage | null;
};
export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        // If they're not logged in redirect to root to be logged in as anonymouse user
        if (!context.session) {
            throw redirect({
                to: '/',
            });
        }
        // Some page redirecting to the chat could give us an initial chat message that
        // should immediately start preocessing
        const initialChatMessage = context.initialChatMessage;
        context.initialChatMessage = null;

        // Put some data in the cache
        await trpcQueryUtils.chatMessages.infiniteList.ensureData({
            chatID: params.chatID,
            limit: 10,
        });

        const ret: Loader = {
            initialMessage: null,
        };

        if (initialChatMessage != null) {
            // If there is an initial chat message, we manually construct a DBChatMessage
            // to be optimistically rendered
            ret.initialMessage = {
                id: ulid(),
                userID: context.session.user.id,
                chatID: params.chatID,
                messageType: 'user',
                messageContent: initialChatMessage,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            };
        }

        return ret;
    },
    component: Chat,
});

function Chat() {
    const { session } = Route.useRouteContext();
    const { chatID } = Route.useParams();
    const { initialMessage } = useLoaderData({
        from: '/c/$chatID',
    });

    const messagesInfiniteQuery =
        trpc.chatMessages.infiniteList.useInfiniteQuery(
            {
                chatID,
                limit: 10,
            },
            {
                getNextPageParam: (lastPage) => lastPage.nextCursor,
            },
        );

    const messages = messagesInfiniteQuery.data
        ? messagesInfiniteQuery.data.pages.flatMap((page) =>
              page.items
                  .slice()
                  .reverse()
                  .map((item) => ({
                      ...item,
                      createdAt: DateTime.fromISO(item.createdAt).toJSDate(),
                      updatedAt: DateTime.fromISO(item.updatedAt).toJSDate(),
                  })),
          )
        : [];

    const infiniteMessagesQueryKey = getQueryKey(
        trpc.chatMessages.infiniteList,
        {
            chatID,
            limit: 10,
        },
        'infinite',
    );
    type InfiniteQueryData = {
        pages: TRPCOutputs['chatMessages']['infiniteList'][];
    };
    const getNewPageData = (
        prevData: InfiniteQueryData,
        message: TRPCOutputs['chatMessages']['infiniteList']['items'][0],
    ) => {
        const updatedPage = {
            ...prevData.pages[0],
        };
        updatedPage.items.unshift(message);
        return {
            ...prevData,
            pages: [updatedPage, ...prevData.pages.slice(1)],
        };
    };

    const sendMessageMutation = trpc.chatMessages.send.useMutation({
        onMutate: (variables) => {
            // Optimistically set the user message
            queryClient.setQueryData(
                infiniteMessagesQueryKey,
                (prevData: InfiniteQueryData) =>
                    getNewPageData(prevData, {
                        id: 'OPTIMISTIC_USER_MESSAGE',
                        chatID,
                        userID: session?.user.id ?? '',
                        messageType: 'user',
                        messageContent: variables.message,
                        createdAt: DateTime.now().toISO(),
                        updatedAt: DateTime.now().toISO(),
                    }),
            );
        },
        onSuccess: async (data) => {
            console.log('ON SUCCESS START');
            console.log('START ITERATE');

            for await (const chunk of data) {
                if (chunk.type === 'userMessage') {
                    queryClient.setQueryData(
                        infiniteMessagesQueryKey,
                        (prevData: InfiniteQueryData) => {
                            const newData = getNewPageData(
                                prevData,
                                chunk.message,
                            );
                            // Remove optimistic message
                            newData.pages[0].items =
                                newData.pages[0].items.filter(
                                    (item) =>
                                        item.id !== 'OPTIMISTIC_USER_MESSAGE',
                                );
                            return newData;
                        },
                    );
                } else if (chunk.type === 'messageChunk') {
                    setCurrentlyStreamingMessage((m) => {
                        const chunkContent = chunk.messageChunk.messageContent;
                        if (m === null) {
                            return chunkContent;
                        } else {
                            return m + chunk.messageChunk.messageContent;
                        }
                    });
                } else {
                    queryClient.setQueryData(
                        infiniteMessagesQueryKey,
                        (prevData: InfiniteQueryData) =>
                            getNewPageData(prevData, chunk.message),
                    );
                    // queryClient.setQueryData(
                    //     infiniteMessagesQueryKey,
                    //     prevData,
                    // );
                    setCurrentlyStreamingMessage(null);
                }
            }
        },
    });
    const [currentlyStreamingMessage, setCurrentlyStreamingMessage] = useState<
        string | null
    >(null);

    // We keep a ref to the chat and the bottom of the message
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Util to see if the messages fill up the entire chat window
    const checkContentFillsScreen = () => {
        if (chatContainerRef.current && messagesEndRef.current) {
            const containerHeight = chatContainerRef.current.clientHeight;
            const contentHeight =
                messagesEndRef.current.offsetTop +
                messagesEndRef.current.clientHeight;
            return contentHeight >= containerHeight;
        }
        return false;
    };

    // biome-ignore lint/correctness/useExhaustiveDependencies: Don't need to wrap in useCallback
    useLayoutEffect(() => {
        // If the entire screen is filled out, then we want to start rendering messages
        // from the bottom, like the chat is getting pushed upwards each new message.
        // We do it in a layout effect to apply changes before the DOM gets painted,
        // allowing for smoother animation.
        if (chatContainerRef.current) {
            if (checkContentFillsScreen()) {
                chatContainerRef.current.style.justifyContent = 'flex-end';
            } else {
                chatContainerRef.current.style.justifyContent = 'flex-start';
            }
        }
    }, [messages, currentlyStreamingMessage]);

    // If it was passed an initialMessage then it means we have a message to immediately
    // start rendering
    // useEffect(() => {
    //     console.log('EFFECT', initialMessage);
    //     if (initialMessage) {
    //         sendMessageMutation.mutate({
    //             chatID,
    //             message: initialMessage.messageContent,
    //         });
    //     }
    // }, [chatID, initialMessage, sendMessageMutation.mutate]);

    const handleSubmit = (message: string) => {
        sendMessageMutation.mutate({
            chatID,
            message,
        });
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div
                ref={chatContainerRef}
                className="w-full flex-1 flex flex-col items-center overflow-y-auto"
            >
                <div className="w-full max-w-4xl flex-grow flex flex-col items-center">
                    <div className="h-2" />
                    {messages.map((m) => (
                        <Message key={m.id} message={m} />
                    ))}
                    {currentlyStreamingMessage && (
                        <AssistantMessage message={currentlyStreamingMessage} />
                    )}
                    <div ref={messagesEndRef} className="h-20" />
                </div>
            </div>
            <div className="fixed bottom-0 self-center w-full max-w-4xl rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-hidden pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Charlie..."
                />
            </div>
        </div>
    );
}
