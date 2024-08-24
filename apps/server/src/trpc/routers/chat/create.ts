// Creates a new empty chat in the DB. Must call this before sending any messages, even from the home
// page.

import { type DBChat, type DBChatMessage, DBChatSchema } from '@repo/db';
import { sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';
import { upsertDBChatMessage } from '../chatMessages/send';

export const CreateChatSchema = z.object({
    initialMessage: z.string().optional(),
});
export const create = publicProcedure
    .input(CreateChatSchema)
    .mutation(async ({ input, ctx }) => {
        const chatID = ulid();

        const newChat = (await ctx.dbPool.one(sql.type(DBChatSchema)`
            INSERT INTO "Chat" (
                id,
                "userID",
                "createdAt",
                "updatedAt"
            ) VALUES (
                ${chatID},
                ${ctx.user.id},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            RETURNING *;
        `)) as DBChat;

        const messages: DBChatMessage[] = [];
        if (input.initialMessage) {
            const initialMessage = await upsertDBChatMessage(
                {
                    id: ulid(),
                    userID: ctx.user.id,
                    chatID,
                    messageContent: input.initialMessage,
                    messageType: 'user',
                    responseStatus: 'not_started',
                },
                ctx.dbPool,
            );
            messages.push(initialMessage);
        }
        return {
            ...newChat,
            messages,
        };
    });
