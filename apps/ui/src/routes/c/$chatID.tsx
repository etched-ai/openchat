import InputBox from '@/components/InputBox';
import Message, { AssistantMessage } from '@/components/ui/chat/message';
import { type TRPCOutputs, trpc } from '@/lib/trpc';
import type { DBChatMessage } from '@repo/db';
import { createFileRoute, useLoaderData } from '@tanstack/react-router';
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
    sendMessageGenerator: TRPCOutputs['chatMessages']['send'] | null;
};
export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        // Some page redirecting to the chat could give us an initial chat message that
        // should immediately start preocessing
        const initialChatMessage = context.initialChatMessage;

        const ret: Loader = {
            initialMessage: null,
            sendMessageGenerator: null,
        };

        if (initialChatMessage != null) {
            // If there is an initial chat message, we manually construct a DBChatMessage
            // to be optimistically rendered
            ret.initialMessage = {
                id: ulid(),
                userID: '',
                chatID: params.chatID,
                messageType: 'user',
                messageContent: initialChatMessage,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            };
            // Then send a request for an async generator to get the AI streaming response
            ret.sendMessageGenerator = await trpc.chatMessages.send.mutate({
                message: initialChatMessage,
                chatID: params.chatID,
            });
            // The next time this page loads we don't want to start streaming the message
            // again
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
            // If you pass in a message with the same ID just update it
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
    }, [optimisticMessages, currentlyStreamingMessage]);

    // Save a callback that processes message chunks and adds them to the state
    const handleMessageGenerator = useCallback(
        async (sendMessageGenerator: TRPCOutputs['chatMessages']['send']) => {
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
            const sendMessageGenerator = await trpc.chatMessages.send.mutate({
                message: message,
                chatID: chatID,
            });
            await handleMessageGenerator(sendMessageGenerator);
        };

        // Optimistically add the user's message, then start processing the async
        // generator
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
