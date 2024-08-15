// Creates a new empty chat in the DB. Must call this before sending any messages, even from the home
// page.

import { DBChatSchema } from '@repo/db';
import { sql } from 'slonik';
import { ulid } from 'ulid';
import { publicProcedure } from '../../trpc';

export const create = publicProcedure.mutation(async ({ ctx }) => {
    const newChat = await ctx.dbPool.one(sql.type(DBChatSchema)`
        INSERT INTO "Chat" (
            id,
            "userID",
            "previewName",
            "createdAt",
            "updatedAt"
        ) VALUES (
            ${ulid()},
            ${ctx.user.id},
            ${''}, -- Empty string for previewName
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
        )
        RETURNING *;
    `);
    return newChat;
});
