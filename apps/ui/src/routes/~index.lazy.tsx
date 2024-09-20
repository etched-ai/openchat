import InputBox from '@/components/InputBox';
import { Button } from '@/components/ui/button';
import { queryClient } from '@/lib/reactQuery';
import { supabase } from '@/lib/supabase';
import { type TRPCOutputs, trpc } from '@/lib/trpc';
import type { AsyncGeneratorYieldType } from '@/lib/utils';
import type { Session } from '@supabase/supabase-js';
import {
    createLazyFileRoute,
    useRouteContext,
    useRouter,
} from '@tanstack/react-router';
import { getQueryKey } from '@trpc/react-query';
import { DateTime } from 'luxon';
import { useTransition } from 'react';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function maybeGetName(session: Session | null): null | string {
    if (!session) return null;
    const name =
        session.user.identities?.[0]?.identity_data?.full_name ||
        session.user.identities?.[0]?.identity_data?.full_name;
    if (!name) return null;
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
        return nameParts[0];
    }
    return nameParts.slice(0, -1).join(' ');
}

function Index() {
    const router = useRouter();
    const context = useRouteContext({ from: '/' });
    const name = maybeGetName(context.session);

    const [pendingSubmitChatMessage, startSubmitChatMessageTransition] =
        useTransition();
    const createChatMutation = trpc.chat.create.useMutation();

    const getGreeting = () => {
        const hour = DateTime.local().hour;
        if (hour < 12) {
            return 'morning';
        } else if (hour < 18) {
            return 'afternoon';
        } else {
            return 'evening';
        }
    };

    const handleSubmit = (text: string): void =>
        startSubmitChatMessageTransition(async () => {
            // Create the chat and send the first message
            const newChat = await createChatMutation.mutateAsync({
                initialMessage: text,
            });
            await queryClient.invalidateQueries({
                queryKey: getQueryKey(trpc.chat.infiniteList, undefined, 'any'),
            });

            router.navigate({
                from: '/',
                to: '/c/$chatID',
                params: {
                    chatID: newChat.id,
                },
            });
        });

    const [pendingLogin, startLoginTransition] = useTransition();

    const handleLogin = (): void =>
        startLoginTransition(async () => {
            const { data, error } = await supabase.auth.linkIdentity({
                provider: 'google',
            });
            if (error) {
                console.error(error);
                return;
            }
            console.log('SUCCESS', data);
        });

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">
                Good {getGreeting()}
                {name != null ? `, ${name}` : ''} :)
            </h1>
            <div className="rounded-md overflow-hidden flex w-[36rem] min-h-28 max-h-36 border-[0.5px] border-border border-opacity-30 mt-8">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="How can Charlie help you today?"
                />
            </div>
            {(!context.session || context.session.user.is_anonymous) && (
                <Button onClick={handleLogin} className="w-72 mt-6">
                    Log in with Google
                </Button>
            )}
        </div>
    );
}
