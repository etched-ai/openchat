import { type TRPCOutputs, trpc } from '@/lib/trpc';
import {
    createFileRoute,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import { useEffect, useState } from 'react';

type Loader = {
    initialMessage: string | null;
    sendMessageGenerator: TRPCOutputs['chat']['sendMessage'] | null;
};
export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        const initialChatMessage = context.initialChatMessage;

        const ret: Loader = {
            initialMessage: initialChatMessage,
            sendMessageGenerator: null,
        };

        if (initialChatMessage != null) {
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

    const [messages, setMessages] = useState<
        { type: 'assistant' | 'user'; content: string }[]
    >(() => {
        if (initialMessage === null) return [];
        else
            return [
                {
                    type: 'user',
                    content: initialMessage,
                },
            ];
    });
    const [currentlyStreamingMessage, setCurrentlyStreamingMessage] = useState<
        string | null
    >(null);

    console.log('RENDER', sendMessageGenerator);
    useEffect(() => {
        const test = async () => {
            if (sendMessageGenerator) {
                try {
                    for await (const chunk of sendMessageGenerator) {
                        if (chunk.type === 'messageChunk') {
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
                                    type: 'assistant',
                                    content: chunk.message.messageContent,
                                },
                            ]);
                            setCurrentlyStreamingMessage(null);
                        }
                    }
                } catch (e) {
                    console.error(e);
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
                        key={m.content}
                        className={`
                        w-[40vw] p-2 rounded-lg mt-1 mb-1
                        ${m.type === 'assistant' ? 'bg-secondary' : 'bg-muted'}
                    `}
                    >
                        {m.content}
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
