import InputBox from '@/components/InputBox';
import Message, { AssistantMessage } from '@/components/ui/chat/message';
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
    useLayoutEffect,
    useOptimistic,
    useRef,
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

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

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
        if (chatContainerRef.current) {
            if (checkContentFillsScreen()) {
                chatContainerRef.current.style.justifyContent = 'flex-end';
            } else {
                chatContainerRef.current.style.justifyContent = 'flex-start';
            }
        }
    }, [optimisticMessages, currentlyStreamingMessage]);

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
        <div className="w-full h-full flex flex-col">
            <div
                ref={chatContainerRef}
                className="w-full flex-1 flex flex-col items-center overflow-y-auto"
            >
                <div className="w-full max-w-4xl flex-grow flex flex-col items-center">
                    <div className="h-2" />
                    {optimisticMessages.map((m) => (
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
