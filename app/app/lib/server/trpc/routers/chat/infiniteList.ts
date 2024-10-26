import { type DBChat, DBChatSchema } from '@/lib/db';
import { TRPCError } from '@trpc/server';
import { sql } from 'slonik';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const infiniteList = publicProcedure
    .input(
        z.object({
            limit: z.number().min(1).max(100).default(50),
            cursor: z.string().optional(),
        }),
    )
    .query(async ({ input, ctx }) => {
        const { limit, cursor } = input;

        console.log('😢');
        const chats = await ctx.dbPool.any(sql.type(DBChatSchema)`
            SELECT *
            FROM "Chat"
            WHERE "userID" = ${ctx.user.id}
            ${cursor ? sql.fragment`AND id < ${cursor}` : sql.fragment``}
            ORDER BY id DESC
            LIMIT ${limit + 1} -- Get an extra item as the cursor (start of next query)
        `);

        const chatsToReturn: DBChat[] = [...chats];
        console.log('2');

        let nextCursor: string | undefined = undefined;
        if (chats.length > limit) {
            const nextItem = chatsToReturn.pop();
            if (!nextItem) {
                console.error('POP FAILED???');
                throw new TRPCError({
                    code: 'INTERNAL_SERVER_ERROR',
                    message: 'The impossible happened ¯\\_(ツ)_/¯',
                });
            }
            nextCursor = nextItem.id;
        }

        return {
            items: chatsToReturn,
            nextCursor,
        };
    });
