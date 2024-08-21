import LogoBlack from '@/assets/logo-black.svg';
import { Button } from '@/components/ui/button';
import UserIcon from '@/components/ui/userIcon';
import { trpc, trpcQueryUtils } from '@/lib/trpc';
import { truncateString } from '@/lib/utils';
import { Outlet, createFileRoute } from '@tanstack/react-router';
import { getQueryKey } from '@trpc/react-query';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { DateTime } from 'luxon';
import { useState } from 'react';

export const Route = createFileRoute('/c')({
    loader: async () => {
        await trpcQueryUtils.chat.infiniteList.prefetchInfinite({
            limit: 10,
        });
    },
    component: ChatWrapper,
});

function ChatWrapper() {
    const { session } = Route.useRouteContext();

    const chatsInfiniteQuery = trpc.chat.infiniteList.useInfiniteQuery(
        {
            limit: 25,
        },
        {
            getNextPageParam: (lastPage) => lastPage.nextCursor,
        },
    );
    const chats = chatsInfiniteQuery.data
        ? chatsInfiniteQuery.data.pages.flatMap((page) =>
              page.items
                  .slice()
                  .reverse()
                  .map((item) => ({
                      ...item,
                      createdAt: DateTime.fromISO(item.createdAt).toJSDate(),
                      updatedAt: DateTime.fromISO(item.updatedAt).toJSDate(),
                  })),
          )
        : [];

    const [sidebarIsOpen, setSidebarIsOpen] = useState(false);
    const toggleSidebarOpen = () => setSidebarIsOpen((prev) => !prev);

    return (
        <div className="flex flex-row w-full h-full">
            <img
                src={LogoBlack}
                alt="Logo"
                className="w-6 h-6 absolute top-2 left-4 z-50"
            />
            <UserIcon
                userID={session?.user.id ?? 'temp'}
                className="w-6 h-6 absolute bottom-4 left-4 z-50"
            />
            <div
                className={`h-full bg-secondary transition-all duration-300 ease-in-out flex flex-col ${
                    sidebarIsOpen ? 'w-64' : 'w-0'
                }`}
            >
                {sidebarIsOpen && (
                    <div className="p-4">
                        {/* Placeholder for logo */}
                        <div className="h-8" />
                        <h3 className="text-2xl font-bold mb-4">
                            Chat History
                        </h3>
                        <ul className="space-y-2">
                            {chats.map((chat) => (
                                <li key={chat.id}>
                                    {truncateString(
                                        chat.previewName ?? 'Unnamed chat',
                                        10,
                                    )}
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
                aria-label={sidebarIsOpen ? 'Close sidebar' : 'Open sidebar'}
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
    );
}
