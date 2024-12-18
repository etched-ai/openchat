import type { ReplicacheChat } from '@preload/shared';
import LogoBlack from '@renderer/assets/logo-black.svg';
import { Button } from '@renderer/components/ui/button.js';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@renderer/components/ui/tooltip.js';
import UserIcon from '@renderer/components/ui/userIcon.js';
import { useKeyboardListener } from '@renderer/lib/keyboardListener.js';
import { getReplicache } from '@renderer/lib/replicache/index.js';
import type { M } from '@renderer/lib/replicache/mutators/index.js';
import { supabase } from '@renderer/lib/supabase';
import { truncateString } from '@renderer/lib/utils.js';
import type { Session } from '@supabase/supabase-js';
import {
    Link,
    Outlet,
    createRootRouteWithContext,
    useNavigate,
} from '@tanstack/react-router';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import { ChevronLeft, ChevronRight, SquarePlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { useEffect, useMemo, useState } from 'react';
import type { Replicache } from 'replicache';
import { useSubscribe } from 'replicache-react';

export interface RouterContext {
    session: Session | null;
    replicache: Replicache<M> | null;
}

export const Route = createRootRouteWithContext<RouterContext>()({
    beforeLoad: async () => {
        let session: Session | null;
        const { data: getSessionData } = await supabase.auth.getSession();
        if (!getSessionData.session) {
            const { data: anonSignInData } =
                await supabase.auth.signInAnonymously();
            session = anonSignInData.session;
        } else {
            session = getSessionData.session;
        }

        console.log('SESSION', session);
        let replicache: Replicache<M> | null = null;

        if (session) {
            replicache = getReplicache({
                name: session.user.id,
                auth: session.access_token,
                DEBUG_MODE: true,
            });
        }

        return { session, replicache };
    },
    component: () => (
        <>
            <RootLayout>
                <Outlet />
            </RootLayout>
            <TanStackRouterDevtools position="bottom-right" />
        </>
    ),
});

function RootLayout({ children }: { children: React.ReactNode }) {
    const { session, replicache } = Route.useRouteContext();

    const navigate = useNavigate();

    const chats = useSubscribe(
        replicache,
        async (tx) =>
            (
                await tx
                    .scan<ReplicacheChat>({
                        prefix: 'chat/',
                    })
                    .values()
                    .toArray()
            ).sort(
                (a, b) =>
                    DateTime.fromISO(b.createdAt).toMillis() -
                    DateTime.fromISO(a.createdAt).toMillis(),
            ),
        { default: [] },
    );

    const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
    const toggleSidebarOpen = () => setSidebarIsOpen((prev) => !prev);

    useKeyboardListener(
        useMemo(
            () => [
                {
                    shortcut: { key: 'b', metaKey: true },
                    callback: () => {
                        setSidebarIsOpen((prev) => !prev);
                    },
                },
                {
                    shortcut: { key: 'k', metaKey: true },
                    callback: () => navigate({ to: '/' }),
                },
            ],
            [navigate],
        ),
    );

    const [logoOpacity, handleScroll] = useScrollFade({
        fadeStart: 0,
        fadeEnd: 12,
    });

    return (
        <div className="flex flex-row w-full h-full">
            <Link to="/">
                <img
                    src={LogoBlack}
                    alt="Logo"
                    className="w-6 h-6 absolute top-2 left-4 z-50 transition-opacity duration-200 ease-in-out"
                    style={{ opacity: sidebarIsOpen ? logoOpacity : 1 }}
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
                        <p>New Chat (⌘+k)</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <UserIcon
                userID={session?.user?.id ?? 'THISSHOULDNEVERHAPPEN'}
                className="w-6 h-6 absolute bottom-4 left-4 z-50"
            />
            <div
                className={`z-10 absolute left-0 h-full pb-8 bg-secondary transition-all duration-200 ease-in-out flex flex-col overflow-x-hidden ${
                    sidebarIsOpen ? 'w-48' : 'w-0'
                }`}
                onScroll={handleScroll}
            >
                {sidebarIsOpen && (
                    <div className="p-4">
                        {/* Placeholder for logo */}
                        <div className="h-8" />
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Link to="/">
                                        <Button className="mb-4">
                                            <p>New Chat</p>
                                        </Button>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <span>⌘+k</span>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
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
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <Button
                            variant="ghost"
                            size="default"
                            className={`fixed top-1/2 -translate-y-1/2 transition-all duration-200 ease-in-out px-2 py-2 ${
                                sidebarIsOpen ? 'left-[12.5rem]' : 'left-2'
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
                    </TooltipTrigger>
                    <TooltipContent>
                        <span>⌘+b</span>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            <div className="flex flex-1">{children}</div>
        </div>
    );
}

function useScrollFade(opts: { fadeStart: number; fadeEnd: number }) {
    const [opacity, setOpacity] = useState(1);

    const handleScroll: React.UIEventHandler<HTMLDivElement> = (e) => {
        const container = e.target;
        // @ts-ignore It's tripping
        const scrollTop = container.scrollTop as number;

        const newOpacity = Math.max(
            0,
            Math.min(
                1,
                1 -
                    (scrollTop - opts.fadeStart) /
                        (opts.fadeEnd - opts.fadeStart),
            ),
        );
        setOpacity(newOpacity);
    };

    return [opacity, handleScroll] as const;
}
