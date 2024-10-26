import {
    Link,
    Outlet,
    ScrollRestoration,
    createRootRouteWithContext,
    redirect,
    useNavigate,
} from '@tanstack/react-router';
import {
    Body,
    Head,
    Html,
    Meta,
    Scripts,
    createServerFn,
} from '@tanstack/start';
import type React from 'react';
import { useEffect, useState } from 'react';
import '@/styles/app.css';
import LogoBlack from '@/assets/logo-black.svg';
import { Button } from '@/components/ui/button';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';
import UserIcon from '@/components/ui/userIcon';
import * as KeyboardListener from '@/lib/keyboardListener';
import { getSupabaseServerClient } from '@/lib/supabase';
import type { AppRouter } from '@/lib/trpc/router';
import { truncateString } from '@/lib/utils';
import type { Session, User } from '@supabase/supabase-js';
import type { QueryClient } from '@tanstack/react-query';
import { TanStackRouterDevtools } from '@tanstack/router-devtools';
import type { TRPCUntypedClient } from '@trpc/client';
import type { CreateTRPCReactBase, createTRPCReact } from '@trpc/react-query';
import type { TRPCQueryUtils, UtilsLike } from '@trpc/react-query/shared';
import { ChevronLeft, ChevronRight, SquarePlus } from 'lucide-react';
import { DateTime } from 'luxon';
import { parseCookies } from 'vinxi/http';

const fetchSession = createServerFn('GET', async () => {
    const supabase = getSupabaseServerClient();

    let user: User;

    const { data: getUserData, error: getUserError } =
        await supabase.auth.getUser();

    if (!getUserData.user || getUserError) {
        if (getUserError) console.error('GET USER ERROR', getUserError);

        const { data: anonSignInData, error: anonSignInError } =
            await supabase.auth.signInAnonymously();
        console.log('ANON SIGNIN', anonSignInData);

        if (!anonSignInData.session || anonSignInError) {
            if (anonSignInError)
                console.error('ANON SIGN IN ERROR', anonSignInError);
            return null;
        }

        user = anonSignInData.session.user;
    } else {
        user = getUserData.user;
    }

    return user;
});

export const Route = createRootRouteWithContext<{
    queryClient: QueryClient;
    trpc: ReturnType<typeof createTRPCReact<AppRouter>>;
    trpcQueryUtils: UtilsLike<AppRouter>;
}>()({
    meta: () => [
        {
            charSet: 'utf-8',
        },
        {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1',
        },
        {
            title: 'Etched Teachable',
        },
    ],
    beforeLoad: async () => {
        const user = await fetchSession();

        return {
            user,
        };
    },
    component: RootComponent,
});

function RootComponent() {
    return (
        <RootDocument>
            <Outlet />
        </RootDocument>
    );
}

function RootDocument({ children }: { children: React.ReactNode }) {
    const { user, trpc } = Route.useRouteContext();
    const navigate = useNavigate();

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

    useEffect(() => {
        const toggleSidebarCmdId = KeyboardListener.registerCommand(
            { key: 'b', metaKey: true },
            () => {
                setSidebarIsOpen((prev) => !prev);
            },
        );
        const newChatCmdId = KeyboardListener.registerCommand(
            { key: 'k', metaKey: true },
            () => navigate({ to: '/' }),
        );
        KeyboardListener.init();

        return () => {
            KeyboardListener.unregisterCommand(toggleSidebarCmdId);
            KeyboardListener.unregisterCommand(newChatCmdId);
            KeyboardListener.cleanup();
        };
    }, [navigate]);

    return (
        <Html>
            <Head>
                <Meta />
            </Head>
            <Body>
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
                                <p>New Chat (⌘+k)</p>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                    <UserIcon
                        userID={user?.id ?? 'temp'}
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
                                        sidebarIsOpen
                                            ? 'left-[16.5rem]'
                                            : 'left-2'
                                    }`}
                                    onClick={toggleSidebarOpen}
                                    aria-label={
                                        sidebarIsOpen
                                            ? 'Close sidebar'
                                            : 'Open sidebar'
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
                <TanStackRouterDevtools />
                <ScrollRestoration />
                <Scripts />
            </Body>
        </Html>
    );
}
