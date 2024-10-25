import { createRootRouteWithContext } from '@tanstack/react-router';
import { Outlet, ScrollRestoration } from '@tanstack/react-router';
import {
    Body,
    Head,
    Html,
    Meta,
    Scripts,
    createServerFn,
} from '@tanstack/start';
import type React from 'react';
import '@/styles/app.css';
import { getSupabaseServerClient } from '@/lib/supabase';
import type { AppRouter } from '@/lib/trpc/router';
import type { Session } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import type { TRPCUntypedClient } from '@trpc/client';
import type { CreateTRPCReactBase, createTRPCReact } from '@trpc/react-query';
import type { TRPCQueryUtils, UtilsLike } from '@trpc/react-query/shared';

const fetchSession = createServerFn('GET', async () => {
    const supabase = getSupabaseServerClient();

    let session: Session;

    const { data: getSessionData, error: getSessionError } =
        await supabase.auth.getSession();

    if (!getSessionData.session || getSessionError) {
        if (getSessionError)
            console.error('GET SESSION ERROR', getSessionError);

        const { data: anonSignInData, error: anonSignInError } =
            await supabase.auth.signInAnonymously();
        console.log('ANON SIGNIN', anonSignInData);

        if (!anonSignInData.session || anonSignInError) {
            if (anonSignInError)
                console.error('ANON SIGN IN ERROR', anonSignInError);
            return null;
        }

        session = anonSignInData.session;
    } else {
        session = getSessionData.session;
    }

    return session;
});

export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
    trpc: ReturnType<typeof createTRPCReact<AppRouter>>;
    trpcQueryUtils: UtilsLike<AppRouter>;
}>()({
    meta: () => [
        {
            charSet: 'utf-8',
        },
        {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1',
        },
        {
            title: 'Etched Teachable',
        },
    ],
    beforeLoad: async () => {
        const session = await fetchSession();

        return {
            session,
        };
    },
    component: RootComponent,
});

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <Html>
            <Head>
                <Meta />
            </Head>
            <Body>
                {children}
                <ScrollRestoration />
                <Scripts />
            </Body>
        </Html>
    );
}
