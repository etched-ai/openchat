import type { AppRouter } from '@repo/server/src/trpc/router';
import {
    createTRPCClient,
    httpBatchLink,
    unstable_httpBatchStreamLink,
} from '@trpc/client';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const trpc = createTRPCClient<AppRouter>({
    links: [
        // httpBatchLink({
        //     url: `${API_BASE_URL}/trpc`,
        // }),
        unstable_httpBatchStreamLink({
            url: `${API_BASE_URL}/trpc`,
        }),
    ],
});
