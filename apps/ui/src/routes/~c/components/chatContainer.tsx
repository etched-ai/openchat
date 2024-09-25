import type React from 'react';
import { useLayoutEffect, useRef, useState } from 'react';

import { trpc } from '@/lib/trpc';
import { DateTime } from 'luxon';
import Message, { AssistantMessage } from './message';

type Props = {
    chatID: string;
};
const ChatContainer: React.FC<Props> = ({ chatID }) => {
    const messagesInfiniteQuery =
        trpc.chat.infiniteListMessages.useInfiniteQuery(
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
              page.items.map((item) => ({
                  ...item,
                  createdAt: DateTime.fromISO(item.createdAt).toJSDate(),
                  updatedAt: DateTime.fromISO(item.updatedAt).toJSDate(),
              })),
          )
        : [];

    // We keep a ref to the chat and the bottom of the message
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const chatMessagesRef = useRef<HTMLDivElement>(null);
    const [isFull, setIsFull] = useState(false);

    // biome-ignore lint/correctness/useExhaustiveDependencies: Needs to trigger on every message update
    useLayoutEffect(() => {
        // If the entire screen is filled out, then we want to start rendering messages
        // from the bottom, like the chat is getting pushed upwards each new message.
        // Basically, if the chat doesn't fill the height of the screen we render from
        // top down. If it does we flip it 180 degrees and start rendering from bottom
        // up. We do it in a layout effect to apply changes before the DOM gets painted,
        // allowing for smoother animation.

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
    }, [messages]);

    return (
        <div
            ref={chatContainerRef}
            className="w-full h-full flex flex-col items-center"
        >
            <div
                ref={chatMessagesRef}
                className="w-full max-w-4xl flex-grow flex items-center overflow-y-scroll mb-20"
            >
                <div className="h-2" />
                {/* If the chat fills the screen then we need to reverse the order of the
                messages. However, the messages are *already* in reverse order since
                the API returns them in latest message first. So we don't need to do
                anything if the screen is full, and we need to reverse it again otherwise. */}
                {(isFull ? messages : messages.slice().reverse()).map((m) => (
                    <Message key={m.id} message={m} />
                ))}
            </div>
        </div>
    );
};

export default ChatContainer;
