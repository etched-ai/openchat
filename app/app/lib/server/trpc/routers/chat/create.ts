// Creates a DB chat and streams down the response. Chats can only be created from the home page.

import type { IAIService } from '@/lib/server/AIService/AIService.interface';
import { type DBChat, type DBChatMessage, DBChatSchema } from '@/lib/server/db';
import { upsertDBChatMessage } from '@/lib/server/sql';
import { type DatabasePool, sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';
import { generateAssistantMessage } from './sendMessage';

export const CreateChatSchema = z.object({
    initialMessage: z.string(),
});

export const create = publicProcedure
    .input(CreateChatSchema)
    .mutation(async ({ input, ctx }) => {
        const chatID = ulid();

        // TODO: Change to pub sub sse with redis
        const previewMessagePromise = maybeSetChatPreview(
            {
                chatID,
                message: input.initialMessage,
            },
            ctx.dbPool,
            ctx.aiService,
        );

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
        const initialMessage = await upsertDBChatMessage(
            {
                id: ulid(),
                userID: ctx.user.id,
                chatID,
                messageContent: input.initialMessage,
                messageType: 'user',
                status: 'done',
            },
            ctx.dbPool,
        );
        messages.push(initialMessage);

        generateAssistantMessage(
            { message: input.initialMessage, chatID },
            ctx,
        ).catch((e) =>
            console.error(
                '[ERROR] Failed to generate assistant message in send:',
                e,
            ),
        );

        return newChat;
    });

type MaybeSetChatPreviewParams = {
    chatID: string;
    message: string;
};
export async function maybeSetChatPreview(
    params: MaybeSetChatPreviewParams,
    pool: DatabasePool,
    aiService: IAIService,
): Promise<void> {
    const { chatID, message } = params;

    const messageSummary = await aiService
        .getOpenAIClient()
        .chat.completions.create({
            model: aiService.getModelName(),
            messages: [
                {
                    content: `Please summarize the following message into as short a phrase as possible that captures the meaning of the message. Do not surround it with quotation marks or anything: ${message}`,
                    role: 'user',
                },
            ],
        });

    const preview = messageSummary.choices[0]?.message.content;
    if (!preview) return;

    await pool.any(sql.type(DBChatSchema)`
        UPDATE "Chat"
        SET "previewName" = ${preview}
        WHERE id = ${chatID}
        AND "previewName" IS NULL;
    `);
}
