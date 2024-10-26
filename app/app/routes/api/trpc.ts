import {
    type StartAPIMethodCallback,
    createAPIFileRoute,
} from '@tanstack/start/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';

import { createContext } from '@/lib/server/trpc/context';
import { appRouter } from '@/lib/server/trpc/router';

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
