import { supabase } from '@/lib/supabase';
import { setAuthToken } from '@/lib/trpc';
import {
    Outlet,
    createRootRouteWithContext,
    redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

type RouterContext = {
    initialChatMessage: string | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
    async beforeLoad() {
        let {
            data: { session },
        } = await supabase.auth.getSession();
        let isAnonymous = false;

        // If the user isn't logged in we'll just log them in anonymously and send
        // them to the root page. There they can log in again if needed.
        // TODO: Show a warning if they were logged out reminding them to log in again.
        // Also have to handle potential sign in errors along with that.
        if (!session) {
            const { data } = await supabase.auth.signInAnonymously();
            session = data.session;
            isAnonymous = true;
        }
        setAuthToken(session?.access_token);

        // Only redirect if we're not already going to /.
        if (
            isAnonymous &&
            location.pathname !== '/' &&
            location.pathname !== ''
        ) {
            throw redirect({
                to: '/',
            });
        }

        return { session };
    },
    component: () => (
        <>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
});
