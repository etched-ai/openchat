import InputBox from '@/components/InputBox';
import Message, { AssistantMessage } from '@/components/ui/chat/message';
import { queryClient } from '@/lib/reactQuery';
import { type TRPCOutputs, trpc, trpcQueryUtils } from '@/lib/trpc';
import type { AsyncGeneratorYieldType } from '@/lib/utils';
import {
    createFileRoute,
    redirect,
    useLoaderData,
} from '@tanstack/react-router';
import { getQueryKey } from '@trpc/react-query';
import { DateTime } from 'luxon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type InfiniteQueryData = {
    pages: TRPCOutputs['chatMessages']['infiniteList'][];
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
        const initialChatStream = context.initialChatStream;
        context.initialChatStream = null;

        // Put some data in the cache
        await trpcQueryUtils.chatMessages.infiniteList.prefetchInfinite({
            chatID: params.chatID,
            limit: 10,
        });

        const ret = {
            initialChatStream,
        };

        return ret;
    },
    component: Chat,
});

function Chat() {
    const { session } = Route.useRouteContext();
    const { chatID } = Route.useParams();
    const { initialChatStream } = useLoaderData({
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
    const getNewPageData = (
        prevData: InfiniteQueryData,
        message: TRPCOutputs['chatMessages']['infiniteList']['items'][0],
    ) => {
        const updatedPage = { ...prevData.pages[0] };
        const existingMessageIndex = updatedPage.items.findIndex(
            (item) => item.id === message.id,
        );

        if (existingMessageIndex !== -1) {
            // If the message already exists, update it in place
            updatedPage.items = [
                ...updatedPage.items.slice(0, existingMessageIndex),
                message,
                ...updatedPage.items.slice(existingMessageIndex + 1),
            ];
        } else {
            // If it's a new message, add it to the beginning of the array
            updatedPage.items = [message, ...updatedPage.items];
        }

        return {
            ...prevData,
            pages: [updatedPage, ...prevData.pages.slice(1)],
        };
    };

    const processMessageChunk = async (
        chunk: AsyncGeneratorYieldType<TRPCOutputs['chatMessages']['send']>,
    ): Promise<void> => {
        if (chunk.type === 'userMessage') {
            queryClient.setQueryData(
                infiniteMessagesQueryKey,
                (prevData: InfiniteQueryData) => {
                    const newData = getNewPageData(prevData, chunk.message);
                    // Remove optimistic message
                    newData.pages[0].items = newData.pages[0].items.filter(
                        (item) => item.id !== 'OPTIMISTIC_USER_MESSAGE',
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
            setCurrentlyStreamingMessage(null);
        }
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
                        responseStatus: 'not_started',
                        createdAt: DateTime.now().toISO(),
                        updatedAt: DateTime.now().toISO(),
                    }),
            );
        },
        onSuccess: async (data, variables, context) => {
            for await (const chunk of data) {
                processMessageChunk(chunk);
            }
            queryClient.invalidateQueries({
                queryKey: infiniteMessagesQueryKey,
            });
        },
    });

    const [currentlyStreamingMessage, setCurrentlyStreamingMessage] = useState<
        string | null
    >(null);

    // We keep a ref to the chat and the bottom of the message
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const [isFull, setIsFull] = useState(false);

    // biome-ignore lint/correctness/useExhaustiveDependencies: It's fine
    useLayoutEffect(() => {
        // If the entire screen is filled out, then we want to start rendering messages
        // from the bottom, like the chat is getting pushed upwards each new message.
        // We do it in a layout effect to apply changes before the DOM gets painted,
        // allowing for smoother animation.

        // Util to see if the messages fill up the entire chat window
        const checkContentFillsScreen = () => {
            if (chatContainerRef.current && chatMessagesRef.current) {
                const containerHeight = chatContainerRef.current.clientHeight;
                const contentHeight = chatMessagesRef.current.scrollHeight;
                return contentHeight > containerHeight;
            }
            return false;
        };

        if (chatMessagesRef.current) {
            if (checkContentFillsScreen()) {
                chatMessagesRef.current.style.flexDirection = 'column-reverse';
                setIsFull(true);
            } else {
                chatMessagesRef.current.style.flexDirection = 'column';
                setIsFull(false);
            }
        }
    }, [messages, currentlyStreamingMessage]);

    // If it was passed an initialMessage then it means we have a message to immediately
    // start rendering
    // biome-ignore lint/correctness/useExhaustiveDependencies: It's fine
    useEffect(() => {
        if (!initialChatStream) return;

        let isMounted = true;
        // This doesn't totally work since the reader is async, so when you release the
        // lock there could be a pending read which would then error. However, it still
        // works so I'm just going to leave it like this because I don't know how to
        // fix it
        const reader = initialChatStream.getReader();

        const readStream = async () => {
            try {
                while (isMounted) {
                    const { done, value: chunk } = await reader.read();
                    if (done) {
                        queryClient.invalidateQueries({
                            queryKey: infiniteMessagesQueryKey,
                        });
                        break;
                    }

                    processMessageChunk(chunk);
                }
            } catch (err) {
                console.error('[ERROR] failed reading stream:', err);
            } finally {
                reader.releaseLock();
            }
        };

        readStream();

        return () => {
            isMounted = false;
            reader.releaseLock();
        };
    }, [initialChatStream]);

    const handleSubmit = (message: string) => {
        if (!sendMessageMutation.isPending) {
            sendMessageMutation.mutate({
                chatID,
                message,
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col">
            <div
                ref={chatContainerRef}
                className="w-full h-full flex flex-col items-center"
            >
                <div
                    ref={chatMessagesRef}
                    className="w-full max-w-4xl flex-grow flex items-center overflow-y-scroll mb-24"
                >
                    <div className="h-2" />
                    {currentlyStreamingMessage && isFull && (
                        <AssistantMessage message={currentlyStreamingMessage} />
                    )}
                    {(isFull ? messages.slice().reverse() : messages).map(
                        (m) => (
                            <Message key={m.id} message={m} />
                        ),
                    )}
                    {currentlyStreamingMessage && !isFull && (
                        <AssistantMessage message={currentlyStreamingMessage} />
                    )}
                </div>
            </div>
            <div className="fixed bottom-0 self-center w-full max-w-4xl rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-hidden pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Vib..."
                />
            </div>
        </div>
    );
}
