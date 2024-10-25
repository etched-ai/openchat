import { createRouter as createTanStackRouter } from '@tanstack/react-router';
import { routerWithQueryClient } from '@tanstack/react-router-with-query';
import { DefaultCatchBoundary } from './components/DefaultCatchBoundary';
import { NotFound } from './components/NotFound';
import { trpcClient } from './lib/api';
import { routeTree } from './routeTree.gen';

export function createRouter() {
    const tanstackRouter = createTanStackRouter({
        routeTree,
        context: { trpcClient },
        defaultPreload: 'intent',
        defaultErrorComponent: DefaultCatchBoundary,
        defaultNotFoundComponent: () => <NotFound />,
    });
    return routerWithQueryClient(tanstackRouter, trpcClient);
}

declare module '@tanstack/react-router' {
    interface Register {
        router: ReturnType<typeof createRouter>;
    }
}
