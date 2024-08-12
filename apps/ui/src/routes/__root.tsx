import type { AppRouter } from '@repo/server/src/trpc/router';
import {
    Link,
    Outlet,
    createRootRoute,
    createRootRouteWithContext,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import type { inferRouterOutputs } from '@trpc/server';

type TRPCOutput = inferRouterOutputs<AppRouter>;

type RouterContext = {
    initialChatMessage: string | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
    component: () => (
        <>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
});
