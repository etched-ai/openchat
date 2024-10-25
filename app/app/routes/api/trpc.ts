import { createAPIFileRoute } from '@tanstack/start/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '../../server/trpc/router';

const handler = (event: { request: Request; params: Record<never, string> }) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req: event.request,
        router: appRouter,
        createContext: () => event,
    });

export const Route = createAPIFileRoute('/api/trpc')({
    GET: handler,
    POST: handler,
});
