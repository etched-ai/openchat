import { type TRPCOutputs, trpc } from '@/lib/trpc';
import type { DBChatMessage } from '@repo/db';
import {
    createFileRoute,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';

type Loader = {
    initialMessage: DBChatMessage | null;
    sendMessageGenerator: TRPCOutputs['chat']['sendMessage'] | null;
};
export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        const initialChatMessage = context.initialChatMessage;

        const ret: Loader = {
            initialMessage: null,
            sendMessageGenerator: null,
        };

        if (initialChatMessage != null) {
            ret.initialMessage = {
                id: 'OPTIMISTIC_INITIAL_MESSAGE',
                userID: '',
                chatID: params.chatID,
                messageType: 'user',
                messageContent: initialChatMessage,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            };
            ret.sendMessageGenerator = await trpc.chat.sendMessage.mutate({
                message: initialChatMessage,
                chatID: params.chatID,
            });
            context.initialChatMessage = null;
        }

        return ret;
    },
    component: Chat,
});

function Chat() {
    const { chatID } = Route.useParams();
    const { initialMessage, sendMessageGenerator } = useLoaderData({
        from: '/c/$chatID',
    });

    const [messages, setMessages] = useState<DBChatMessage[]>(() => {
        if (initialMessage === null) return [];
        else return [initialMessage];
    });
    const [currentlyStreamingMessage, setCurrentlyStreamingMessage] = useState<
        string | null
    >(null);

    useEffect(() => {
        const test = async () => {
            if (sendMessageGenerator) {
                try {
                    for await (const chunk of sendMessageGenerator) {
                        if (chunk.type === 'userMessage') {
                            setMessages((ms) => {
                                const initialMessageIdx = ms.findIndex(
                                    (m) =>
                                        m.id === 'OPTIMISTIC_INITIAL_MESSAGE',
                                );
                                if (initialMessageIdx === -1) {
                                    // The impossible happened
                                    console.error(
                                        'NO INITIAL OPTIMISTIC MESSAGE??',
                                    );
                                    return ms;
                                }
                                const newMessages = [...ms];
                                newMessages[initialMessageIdx] = {
                                    ...chunk.message,
                                    createdAt: DateTime.fromISO(
                                        chunk.message.createdAt,
                                    ).toJSDate(),
                                    updatedAt: DateTime.fromISO(
                                        chunk.message.updatedAt,
                                    ).toJSDate(),
                                };
                                return newMessages;
                            });
                        } else if (chunk.type === 'messageChunk') {
                            setCurrentlyStreamingMessage((m) => {
                                const chunkContent =
                                    chunk.messageChunk.messageContent;
                                if (m === null) {
                                    return chunkContent;
                                } else {
                                    return (
                                        m + chunk.messageChunk.messageContent
                                    );
                                }
                            });
                        } else {
                            setMessages((ms) => [
                                ...ms,
                                {
                                    ...chunk.message,
                                    createdAt: DateTime.fromISO(
                                        chunk.message.createdAt,
                                    ).toJSDate(),
                                    updatedAt: DateTime.fromISO(
                                        chunk.message.updatedAt,
                                    ).toJSDate(),
                                },
                            ]);
                            setCurrentlyStreamingMessage(null);
                        }
                    }
                } catch (e) {
                    console.error('[ERROR] Initial stream:', e);
                }
            }
        };
        test();
    }, [sendMessageGenerator]);

    return (
        <div className="w-full h-full flex">
            <div className="w-full h-full max-h-screen overflow-y-scroll flex flex-col items-center">
                {messages.map((m) => (
                    <div
                        key={m.id}
                        className={`
                        w-[40vw] p-2 rounded-lg mt-1 mb-1
                        ${m.messageType === 'assistant' ? 'bg-secondary' : 'bg-muted'}
                    `}
                    >
                        {m.messageContent}
                    </div>
                ))}
                {currentlyStreamingMessage && (
                    <div className="w-[40vw] p-2 rounded-lg mt-1 mb-1 bg-secondary">
                        {currentlyStreamingMessage}
                    </div>
                )}
            </div>
        </div>
    );
}
