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
import type { QueryClient } from '@tanstack/react-query';

const fetchUser = createServerFn('GET', async () => {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    if (!data.user?.email || error) {
        if (error) console.error(error);
        return null;
    }

    return data.user;
});

export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
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
        const user = await fetchUser();

        return {
            user,
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
