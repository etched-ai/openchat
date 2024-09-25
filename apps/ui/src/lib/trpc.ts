import type { AppRouter } from '@repo/server/src/trpc/router';
import {
    httpBatchLink,
    splitLink,
    unstable_httpSubscriptionLink,
} from '@trpc/client';
import { createTRPCQueryUtils, createTRPCReact } from '@trpc/react-query';
import type { inferRouterOutputs } from '@trpc/server';
import { EventSourcePolyfill } from 'event-source-polyfill';
import { queryClient } from './reactQuery';

// @ts-expect-error It's fine
globalThis.EventSource = EventSourcePolyfill;

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
        splitLink({
            condition: (op) => op.type === 'subscription',
            true: unstable_httpSubscriptionLink({
                url: `${API_BASE_URL}/trpc`,
                eventSourceOptions() {
                    return {
                        headers: {
                            authorization: `Bearer ${token}`,
                        },
                    } as EventSourceInit;
                },
            }),
            false: httpBatchLink({
                url: `${API_BASE_URL}/trpc`,
                headers() {
                    return {
                        authorization: `Bearer ${token}`,
                    };
                },
            }),
        }),
    ],
});

export const trpcQueryUtils = createTRPCQueryUtils({
    queryClient,
    client: trpcClient,
});
