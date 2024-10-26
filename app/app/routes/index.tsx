import InputBox from '@/components/InputBox';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { getSupabaseServerClient } from '@/lib/supabase';
import type { User } from '@supabase/supabase-js';
import {
    createFileRoute,
    useRouteContext,
    useRouter,
    useSearch,
} from '@tanstack/react-router';
import { createServerFn } from '@tanstack/start';
import { getQueryKey } from '@trpc/react-query';
import { XCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

const searchSchema = z.object({
    error: z.string().optional(),
    error_code: z.number().optional(),
    error_description: z.string().optional(),
});

export const Route = createFileRoute('/')({
    validateSearch: searchSchema,
    component: Index,
});

const tryLinkIdentity = createServerFn('POST', async () => {
    const supabase = getSupabaseServerClient();
    const res = await supabase.auth.linkIdentity({
        provider: 'google',
        options: {
            redirectTo: 'http://localhost:3000/api/auth/callback',
        },
    });
    return res;
});

function maybeGetName(user: User | null): null | string {
    if (!user) return null;
    const name =
        user.identities?.[0]?.identity_data?.full_name ||
        user.identities?.[0]?.identity_data?.full_name;
    if (!name) return null;
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
        return nameParts[0];
    }
    return nameParts.slice(0, -1).join(' ');
}

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

function Index() {
    const router = useRouter();
    const { user, trpc, queryClient } = useRouteContext({
        from: '/',
    });

    const name = maybeGetName(user);

    const createChatMutation = trpc.chat.create.useMutation();

    const handleSubmit = async (text: string): Promise<void> => {
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
    };

    const handleLogin = async () => {
        const res = await tryLinkIdentity();
        if (res.error) {
            router.navigate({
                to: '/',
                search: () => ({
                    error: res.error.name,
                    error_code: Number.parseInt(res.error.code ?? '400'),
                    error_description: res.error.message,
                }),
            });
        } else {
            window.open(res.data.url, '_self');
        }
    };

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <ErrorAlert />
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
            {(!user || user.is_anonymous) && (
                <Button onClick={handleLogin} className="w-72 mt-6">
                    Log in with Google
                </Button>
            )}
        </div>
    );
}

function ErrorAlert() {
    const search = useSearch({
        from: '/',
    });
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        if (search.error) {
            setShowAlert(true);
            // Auto-hide the alert after 5 seconds
            const timer = setTimeout(() => setShowAlert(false), 5000);
            return () => clearTimeout(timer);
        }
    }, [search.error]);

    if (!search.error) return null;

    let { error, error_code, error_description } = search;
    error_description = error_description?.replace(/\+/g, ' ');

    let title = `Error ${error_code}: ${error}`;
    let description = error_description;

    // We should be reshaping known errors to better error messages
    if (
        error_code === 422 &&
        error_description === 'Identity is already linked to another user'
    ) {
        title = 'Error!';
        description = 'User already existings. Logging in...';
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 mx-auto max-w-md p-4 transition-all duration-300 ease-in-out ${showAlert ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
        >
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
            </Alert>
        </div>
    );
}
