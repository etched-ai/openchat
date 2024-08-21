import { supabase } from '@/lib/supabase';
import { type TRPCOutputs, setAuthToken } from '@/lib/trpc';
import type { AsyncGeneratorYieldType } from '@/lib/utils';
import type { Session } from '@supabase/supabase-js';
import {
    Outlet,
    createRootRouteWithContext,
    redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';

type RouterContext = {
    initialChatStream: ReadableStream<
        AsyncGeneratorYieldType<TRPCOutputs['chatMessages']['generateResponse']>
    > | null;
    session: Session | null;
};

export const Route = createRootRouteWithContext<RouterContext>()({
    async beforeLoad({ context }) {
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

        context.session = session;
    },
    component: () => (
        <>
            <Outlet />
            <TanStackRouterDevtools />
        </>
    ),
});
