import {
    createTRPCClient,
    httpBatchLink,
    loggerLink,
    splitLink,
    unstable_httpSubscriptionLink,
} from '@trpc/client';
import type { AppRouter } from '../server/trpc/router';

const getBaseUrl = () => {
    if (typeof window !== 'undefined') return '';
    // replace example.com with your actual production url
    if (process.env.NODE_ENV === 'production') return 'https://example.com';
    return `http://localhost:${process.env.PORT ?? 3000}`;
};

// create the client, export it
export const trpc = createTRPCClient<AppRouter>({
    links: [
        // will print out helpful logs when using client
        loggerLink(),
        // identifies what url will handle trpc requests
        splitLink({
            condition: (op) => op.type === 'subscription',
            true: unstable_httpSubscriptionLink({
                url: `${getBaseUrl()}/api/trpc`,
            }),
            false: httpBatchLink({ url: `${getBaseUrl()}/api/trpc` }),
        }),
    ],
});
