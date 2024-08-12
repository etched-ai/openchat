import { type TRPCOutputs, trpc } from '@/lib/trpc';
import {
    createFileRoute,
    useLoaderData,
    useRouteContext,
} from '@tanstack/react-router';
import { useEffect } from 'react';

type Loader = {
    sendMessageGenerator: TRPCOutputs['chat']['sendMessage'] | null;
};
export const Route = createFileRoute('/c/$chatID')({
    async loader({ context, params }) {
        const initialChatMessage = context.initialChatMessage;

        const ret: Loader = {
            sendMessageGenerator: null,
        };

        if (initialChatMessage != null) {
            ret.sendMessageGenerator = await trpc.chat.sendMessage.mutate({
                message: initialChatMessage,
                chatID: params.chatID,
            });
        }

        return ret;
    },
    component: Chat,
});

function Chat() {
    const { chatID } = Route.useParams();
    const { sendMessageGenerator } = useLoaderData({ from: '/c/$chatID' });

    useEffect(() => {
        const test = async () => {
            if (sendMessageGenerator) {
                for await (const chunk of sendMessageGenerator) {
                    console.log(chunk);
                }
            }
        };
        test();
    }, [sendMessageGenerator]);
    return <div>hi</div>;
}
