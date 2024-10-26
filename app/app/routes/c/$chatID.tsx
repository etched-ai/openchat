import InputBox from '@/components/InputBox';
import type { TRPCOutputs } from '@/lib/trpc/router';
import {
    createFileRoute,
    redirect,
    useLoaderData,
} from '@tanstack/react-router';
import { getQueryKey } from '@trpc/react-query';
import { DateTime } from 'luxon';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ChatContainer from './-components/chatContainer';

type InfiniteQueryData = {
    pages: TRPCOutputs['chat']['infiniteListMessages'][];
};

export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        // If they're not logged in redirect to root to be logged in as anonymouse user
        if (!context.user) {
            throw redirect({
                to: '/',
            });
        }
    },
    component: Chat,
});

function Chat() {
    console.log(1);
    const { user, trpc, queryClient } = Route.useRouteContext();
    const { chatID } = Route.useParams();
    console.log(2);

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
                        userID: user.id ?? '',
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

    // TEMP: To trigger rerenders until I figure out how to do this better
    const [, setCurrentlyStreamingMessage] = useState<string>('');

    trpc.chat.listenNewMessages.useSubscription(
        {
            chatID,
            latestSeenMessageID,
        },
        {
            onData: (data) => {
                // TODO: Shouldn't rerender the entire list on every update
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
                                setCurrentlyStreamingMessage(
                                    messageToUpdate.messageContent,
                                );
                            } else {
                                messageToUpdate = data;
                                setCurrentlyStreamingMessage('');
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

    console.log(3);
    return (
        <div className="w-full h-full flex flex-col">
            <ChatContainer chatID={chatID} trpc={trpc} />
            <div className="fixed bottom-0 min-h-20 max-h-[40rem] self-center w-full max-w-4xl rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-y-scroll pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Charlie..."
                />
            </div>
        </div>
    );
}
