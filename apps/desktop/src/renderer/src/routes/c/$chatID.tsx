import { createFileRoute } from '@tanstack/react-router';

import type { ReplicacheChatMessage } from '@preload/shared';
import InputBox from '@renderer/components/InputBox';
import { sendChatMessage } from '@renderer/lib/ai';
import { DateTime } from 'luxon';
import { useSubscribe } from 'replicache-react';
import ChatContainer from './-components/chatContainer';

export const Route = createFileRoute('/c/$chatID')({
    component: Chat,
});

function Chat() {
    const { session, replicache } = Route.useRouteContext();
    const { chatID } = Route.useParams();

    const messages = useSubscribe(
        replicache,
        async (tx) => {
            const res = (
                await tx
                    .scan<ReplicacheChatMessage>({
                        indexName: 'chatID',
                        prefix: chatID,
                    })
                    .values()
                    .toArray()
            ).sort(
                (a, b) =>
                    DateTime.fromISO(b.createdAt).toMillis() -
                    DateTime.fromISO(a.createdAt).toMillis(),
            );
            console.log('SUB RES', res);
            return res;
        },
        { default: [] },
    );

    const handleSubmit = async (message: string) => {
        if (!replicache || !session?.user) return;
        await sendChatMessage(
            replicache,
            session.user.id,
            chatID,
            messages,
            message,
        );
    };

    return (
        <div className="w-full h-full flex flex-col">
            <ChatContainer messages={messages} />
            <div className="fixed bottom-0 min-h-20 max-h-[40rem] self-center w-full max-w-xl rounded-t-lg bg-muted border-[0.5px] border-border/20 overflow-y-scroll pb-2">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="Reply to Charlie..."
                />
            </div>
        </div>
    );
}
