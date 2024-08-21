import type { AppRouter } from '@repo/server/src/trpc/router';
import { createTRPCClient, unstable_httpBatchStreamLink } from '@trpc/client';
import { createTRPCQueryUtils, createTRPCReact } from '@trpc/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { queryClient } from './reactQuery';

let token: string | undefined;

export function setAuthToken(newToken: string | undefined) {
    token = newToken;
}

const API_BASE_URL =
    import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export type TRPCOutputs = inferRouterOutputs<AppRouter>;

export const trpc = createTRPCReact<AppRouter>();

export const trpcClient = trpc.createClient({
    links: [
        unstable_httpBatchStreamLink({
            url: `${API_BASE_URL}/trpc`,
            headers() {
                return {
                    authorization: `Bearer ${token}`,
                };
            },
        }),
    ],
});

export const trpcQueryUtils = createTRPCQueryUtils({
    queryClient,
    client: trpcClient,
});

export const vanillaTrpcClient = createTRPCClient({
    links: [
        unstable_httpBatchStreamLink({
            url: `${API_BASE_URL}/trpc`,
            headers() {
                return {
                    authorization: `Bearer ${token}`,
                };
            },
        }),
    ],
});
