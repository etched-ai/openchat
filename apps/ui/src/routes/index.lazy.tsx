import InputBox from '@/components/InputBox';
import { MilkdownEditor } from '@/components/Milkdown/Milkdown';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import { editorViewCtx } from '@milkdown/core';
import type { Ctx } from '@milkdown/ctx';
import { TextSelection } from '@milkdown/prose/state';
import { MilkdownProvider, useInstance } from '@milkdown/react';
import { getMarkdown } from '@milkdown/utils';
import {
    createFileRoute,
    createLazyFileRoute,
    useRouteContext,
    useRouter,
} from '@tanstack/react-router';
import { ArrowUp } from 'lucide-react';
import { DateTime } from 'luxon';
import { useCallback, useEffect, useState } from 'react';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function Index() {
    const router = useRouter();
    const createChatCtx = useRouteContext({ from: '/' });

    const getGreeting = () => {
        const hour = DateTime.local().hour;
        if (hour < 12) {
            return 'morning';
        } else if (hour < 18) {
            return 'afternoon';
        } else {
            return 'evening';
        }
    };

    const handleSubmit = async (text: string): Promise<void> => {
        const createChatResp = await trpc.chat.createChat.mutate();
        createChatCtx.initialChatMessage = text;
        router.navigate({
            from: '/',
            to: '/c/$chatID',
            params: {
                chatID: createChatResp.id,
            },
        });
    };

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">Good {getGreeting()}, Colin :)</h1>
            <div className="rounded-md overflow-hidden flex w-[36rem] min-h-28 max-h-36 border-[0.5px] border-border border-opacity-30 mt-8">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="How can Charlie help you today?"
                />
            </div>
        </div>
    );
}
