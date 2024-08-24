import LogoBlack from '@/assets/logo-black.svg';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import UserIcon from '@/components/ui/userIcon';
import { supabase } from '@/lib/supabase';
import {
    type TRPCOutputs,
    setAuthToken,
    trpc,
    trpcQueryUtils,
} from '@/lib/trpc';
import { type AsyncGeneratorYieldType, truncateString } from '@/lib/utils';
import type { Session } from '@supabase/supabase-js';
import {
    Link,
    Outlet,
    createRootRouteWithContext,
    redirect,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ChevronLeft, ChevronRight, SquarePlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

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
    loader: async () => {
        await trpcQueryUtils.chat.infiniteList.prefetch({
            limit: 10,
        });
    },
    component: ChatWrapper,
});

function ChatWrapper() {
    const { session } = Route.useRouteContext();

    const chatsQuery = trpc.chat.infiniteList.useQuery({
        limit: 10,
    });
    const chats = chatsQuery.data
        ? chatsQuery.data.items.map((item) => ({
              ...item,
              createdAt: DateTime.fromISO(item.createdAt).toJSDate(),
              updatedAt: DateTime.fromISO(item.updatedAt).toJSDate(),
          }))
        : [];

    const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
    const toggleSidebarOpen = () => setSidebarIsOpen((prev) => !prev);

    return (
        <>
            <div className="flex flex-row w-full h-full">
                <Link to="/">
                    <img
                        src={LogoBlack}
                        alt="Logo"
                        className="w-6 h-6 absolute top-2 left-4 z-50"
                    />
                </Link>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link
                                to="/"
                                className="w-6 h-6 absolute top-12 left-4 z-2"
                            >
                                <SquarePlus />
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>New Chat</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
                <UserIcon
                    userID={session?.user.id ?? 'temp'}
                    className="w-6 h-6 absolute bottom-4 left-4 z-50"
                />
                <div
                    className={`z-10 absolute left-0 h-full bg-secondary transition-all duration-200 ease-in-out flex flex-col overflow-x-hidden ${
                        sidebarIsOpen ? 'w-64' : 'w-0'
                    }`}
                >
                    {sidebarIsOpen && (
                        <div className="p-4">
                            {/* Placeholder for logo */}
                            <div className="h-8" />
                            <Link to="/">
                                <Button className="mb-4">
                                    <p>New Chat</p>
                                </Button>
                            </Link>
                            <h3 className="text-2xl font-bold mb-4 w-64">
                                Chat History
                            </h3>
                            <ul className="space-y-2">
                                {chats.map((chat) => (
                                    <li key={chat.id} className="w-64">
                                        <Link
                                            to="/c/$chatID"
                                            params={{ chatID: chat.id }}
                                            className="hover:bg-accent hover:text-accent-foreground p-2 overflow-hidden"
                                        >
                                            {truncateString(
                                                chat.previewName?.length
                                                    ? chat.previewName
                                                    : 'Unnamed chat',
                                                15,
                                            )}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <Button
                    variant="ghost"
                    size="default"
                    className={`fixed top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out px-2 py-2 ${
                        sidebarIsOpen ? 'left-[16.5rem]' : 'left-2'
                    }`}
                    onClick={toggleSidebarOpen}
                    aria-label={
                        sidebarIsOpen ? 'Close sidebar' : 'Open sidebar'
                    }
                >
                    {sidebarIsOpen ? (
                        <ChevronLeft className="h-4 w-4" />
                    ) : (
                        <ChevronRight className="h-4 w-4" />
                    )}
                </Button>
                <div className="flex flex-1">
                    <Outlet />
                </div>
            </div>
            <TanStackRouterDevtools />
        </>
    );
}
