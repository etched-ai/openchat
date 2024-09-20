import InputBox from '@/components/InputBox';
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
import ChatContainer from './components/chatContainer';
import Message, { AssistantMessage } from './components/message';

type InfiniteQueryData = {
    pages: TRPCOutputs['chat']['infiniteListMessages'][];
};

export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        // If they're not logged in redirect to root to be logged in as anonymouse user
        if (!context.session) {
            throw redirect({
                to: '/',
            });
        }

        // Put some data in the cache
        await trpcQueryUtils.chat.infiniteListMessages.prefetchInfinite({
            chatID: params.chatID,
            limit: 10,
        });
    },
    component: Chat,
});

function Chat() {
    const { session } = Route.useRouteContext();
    const { chatID } = Route.useParams();

    const [latestSeenMessageID, setLatestSeenMessageID] = useState<
        string | undefined
    >(undefined);

    const infiniteMessagesQueryKey = getQueryKey(
        trpc.chat.infiniteListMessages,
        {
            chatID,
            limit: 10,
        },
        'infinite',
    );
    const getNewPageData = (
        prevData: InfiniteQueryData,
        message: TRPCOutputs['chat']['infiniteListMessages']['items'][0],
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

    const sendMessageMutation = trpc.chat.sendMessage.useMutation({
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
                        status: 'done',
                        createdAt: DateTime.now().toISO(),
                        updatedAt: DateTime.now().toISO(),
                    }),
            );
        },
        onSuccess: async (data, variables, context) => {
            setLatestSeenMessageID(data.id);
            queryClient.setQueryData(
                infiniteMessagesQueryKey,
                (prevData: InfiniteQueryData) => {
                    const newData = getNewPageData(prevData, data);
                    // Remove optimistic message
                    newData.pages[0].items = newData.pages[0].items.filter(
                        (item) => item.id !== 'OPTIMISTIC_USER_MESSAGE',
                    );
                    return newData;
                },
            );
        },
    });

    trpc.chat.listenNewMessages.useSubscription(
        {
            chatID,
            latestSeenMessageID,
        },
        {
            onData: (data) => {
                queryClient.setQueryData(
                    infiniteMessagesQueryKey,
                    (prevData: InfiniteQueryData) => {
                        let messageToUpdate = prevData.pages[0].items.find(
                            (m) => m.id === data.id,
                        );
                        if (!messageToUpdate) {
                            messageToUpdate = data;
                        } else {
                            if (data.status === 'streaming') {
                                messageToUpdate.messageContent +=
                                    data.messageContent;
                            } else {
                                messageToUpdate = data;
                            }
                        }
                        return getNewPageData(prevData, messageToUpdate);
                    },
                );
                if (data.status === 'done') {
                    setLatestSeenMessageID(data.id);
                }
            },
        },
    );

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
            <ChatContainer chatID={chatID} />
            <div className="fixed bottom-0 min-h-20 max-h-[40rem] self-center w-full max-w-4xl rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-y-scroll pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Charlie..."
                />
            </div>
        </div>
    );
}
