import type { AppRouter } from '@repo/server/src/trpc/router';
import { createTRPCClient, unstable_httpBatchStreamLink } from '@trpc/client';
import type { inferRouterOutputs } from '@trpc/server';

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const trpc = createTRPCClient<AppRouter>({
    links: [
        unstable_httpBatchStreamLink({
            url: `${API_BASE_URL}/trpc`,
        }),
    ],
});

export type TRPCOutputs = inferRouterOutputs<AppRouter>;
