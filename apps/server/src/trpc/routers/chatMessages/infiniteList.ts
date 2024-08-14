// Cursor paginated chat message querying: https://trpc.io/docs/client/react/useInfiniteQuery

import { DBChatMessageSchema } from '@repo/db';
import { TRPCError } from '@trpc/server';
import { sql } from 'slonik';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const infiniteList = publicProcedure
    .input(
        z.object({
            chatID: z.string().ulid(),
            limit: z.number().min(1).max(100).default(50),
            cursor: z.string().optional(),
        }),
    )
    .query(async ({ input, ctx }) => {
        const { chatID, limit, cursor } = input;

        const messages = await ctx.dbPool.many(sql.type(DBChatMessageSchema)`
            SELECT *
            FROM "ChatMessage"
            WHERE "chatID" = ${chatID}
            ${cursor ? sql.fragment`AND id < ${cursor}` : sql.fragment``}
            ORDER BY id DESC
            LIMIT ${limit + 1} -- Get an extra item as the cursor (start of next query)
        `);
        const messagesToReturn = [...messages];

        let nextCursor: string | undefined = undefined;
        if (messages.length > limit) {
            const nextItem = messagesToReturn.pop();
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
            items: messagesToReturn,
            nextCursor,
        };
    });
