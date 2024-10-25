import { QueryClient } from '@tanstack/react-query';
import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import {
    createTRPCClient,
    httpBatchLink,
    loggerLink,
    splitLink,
    unstable_httpSubscriptionLink,
} from '@trpc/client';
import { createTRPCQueryUtils, createTRPCReact } from '@trpc/react-query';
import { Fragment } from 'react';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
import { NotFound } from './components/NotFound';
import { routeTree } from './routeTree.gen';
import type { AppRouter } from './server/trpc/router';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '';
    // replace example.com with your actual production url
    if (process.env.NODE_ENV === 'production') return 'https://example.com';
    return `http://localhost:${process.env.PORT ?? 3000}`;
};

export function createRouter() {
    console.log('A');
    const queryClient = new QueryClient();
    console.log('B');

    const trpc = createTRPCReact<AppRouter>();
    console.log('C');
    // create the client
    const trpcClient = trpc.createClient({
        links: [
            // will print out helpful logs when using client
            loggerLink(),
            // identifies what url will handle trpc requests
            splitLink({
                condition: (op) => op.type === 'subscription',
                true: unstable_httpSubscriptionLink({
                    url: `${getBaseUrl()}/api/trpc`,
                }),
                false: httpBatchLink({
                    url: `${getBaseUrl()}/api/trpc`,
                }),
            }),
        ],
    });
    console.log('D');
    const trpcQueryUtils = createTRPCQueryUtils({
        queryClient,
        client: trpcClient,
    });
    console.log('E');

    const baseTanstackRouter = createTanStackRouter({
        routeTree,
        context: { queryClient, trpc, trpcQueryUtils },
        defaultPreload: 'intent',
        defaultErrorComponent: DefaultCatchBoundary,
        defaultNotFoundComponent: () => <NotFound />,
    });
    console.log('F');
    const withQueryClient = routerWithQueryClient(
        baseTanstackRouter,
        queryClient,
    );
    console.log('G');

    const ogOptions = withQueryClient.options;
    withQueryClient.options = {
        ...withQueryClient.options,
        Wrap: ({ children }) => {
            const OGWrap = ogOptions.Wrap || Fragment;
            return (
                <trpc.Provider client={trpcClient} queryClient={queryClient}>
                    <OGWrap>{children}</OGWrap>
                </trpc.Provider>
            );
        },
    };

    return withQueryClient;
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createRouter>;
    }
}
