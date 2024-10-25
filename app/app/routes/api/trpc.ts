import { createContext } from '@/lib/trpc/context';
import { appRouter } from '@/lib/trpc/router';
import { createAPIFileRoute } from '@tanstack/start/api';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { type HTTPEvent, parseCookies } from 'vinxi/http';

const handler = (event: HTTPEvent) =>
    fetchRequestHandler({
        endpoint: '/api/trpc',
        req: event.request,
        router: appRouter,
        createContext: () => createContext(event),
    });

export const Route = createAPIFileRoute('/api/trpc')({
    GET: handler,
    POST: handler,
});
