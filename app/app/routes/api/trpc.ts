import { createContext } from '@/lib/trpc/context';
import { appRouter } from '@/lib/trpc/router';
import {
    type StartAPIMethodCallback,
    createAPIFileRoute,
} from '@tanstack/start/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

const handler: StartAPIMethodCallback<'/api/trpc'> = (event) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req: event.request,
        router: appRouter,
        createContext,
    });

export const Route = createAPIFileRoute('/api/trpc')({
    GET: handler,
    POST: handler,
});
