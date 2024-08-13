import InputBox from '@/components/InputBox';
import UserIcon from '@/components/ui/userIcon';
import { type TRPCOutputs, trpc } from '@/lib/trpc';
import { MilkdownProvider } from '@milkdown/react';
import type { DBChatMessage } from '@repo/db';
import {
    createFileRoute,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import { DateTime } from 'luxon';
import {
    useCallback,
    useEffect,
    useOptimistic,
    useState,
    useTransition,
} from 'react';
import { ulid } from 'ulid';

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
                id: ulid(),
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

    const [messageIsPending, startTransition] = useTransition();
    const [messages, setMessages] = useState<DBChatMessage[]>([]);
    const [optimisticMessages, addOptimisticMessage] = useOptimistic(
        messages,
        (state: DBChatMessage[], newMessage: DBChatMessage) => {
            const existingId = state.findIndex((m) => m.id === newMessage.id);
            if (existingId !== -1) {
                const newState = [...state];
                newState[existingId] = newMessage;
                return newState;
            } else {
                return [...state, newMessage];
            }
        },
    );
    const [currentlyStreamingMessage, setCurrentlyStreamingMessage] = useState<
        string | null
    >(null);

    const handleMessageGenerator = useCallback(
        async (sendMessageGenerator: TRPCOutputs['chat']['sendMessage']) => {
            for await (const chunk of sendMessageGenerator) {
                if (chunk.type === 'userMessage') {
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
        },
        [],
    );

    // If it was passed a sendMessageGenerator then it means we have a message to immediately start
    // rendering
    useEffect(() => {
        const processMessages = async () => {
            if (initialMessage && sendMessageGenerator) {
                addOptimisticMessage(initialMessage);
                try {
                    await handleMessageGenerator(sendMessageGenerator);
                } catch (e) {
                    console.error('[ERROR] Initial stream:', e);
                }
            }
        };
        processMessages();
    }, [
        sendMessageGenerator,
        handleMessageGenerator,
        initialMessage,
        addOptimisticMessage,
    ]);

    const handleSubmit = (message: string) => {
        const sendMessage = async () => {
            const sendMessageGenerator = await trpc.chat.sendMessage.mutate({
                message: message,
                chatID: chatID,
            });
            await handleMessageGenerator(sendMessageGenerator);
        };

        startTransition(() => {
            addOptimisticMessage({
                id: ulid(),
                userID: '',
                chatID: chatID,
                messageType: 'user',
                messageContent: message,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            });
            sendMessage();
        });
    };

    return (
        <div className="w-full h-full flex flex-col items-center">
            <div className="w-full flex-1 flex flex-col items-center justify-start">
                <div className="w-full flex overflow-y-scroll flex-col items-center justify-end">
                    <div className="h-2" />
                    {optimisticMessages.map((m) =>
                        m.messageType === 'assistant' ? (
                            <AssistantMessage
                                key={m.id}
                                message={m.messageContent}
                            />
                        ) : (
                            <UserMessage
                                key={m.id}
                                message={m.messageContent}
                            />
                        ),
                    )}
                    {currentlyStreamingMessage && (
                        <AssistantMessage message={currentlyStreamingMessage} />
                    )}
                    <div className="h-20" />
                </div>
            </div>
            <div className="fixed bottom-0 w-[44vw] min-h-20 max-h-[40rem] rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-hidden pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Charlie..."
                />
            </div>
        </div>
    );
}

type MessageProps = {
    message: string;
};
const UserMessage: React.FC<MessageProps> = ({ message }) => {
    return (
        <div className="w-[40vw] p-2 rounded-lg mt-2 mb-2 flex flex-row bg-accent">
            <div>
                <UserIcon userId="temp" className="mr-4" />
            </div>
            <div className="flex-1 pt-2">{message}</div>
        </div>
    );
};
const AssistantMessage: React.FC<MessageProps> = ({ message }) => {
    return (
        <div className="w-[40vw] p-3 rounded-lg mt-2 mb-2 flex flex-row bg-muted/85">
            <div className="flex-1">{message}</div>
        </div>
    );
};
