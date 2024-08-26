// Creates a DB chat and streams down the response. Chats can only be created from the home page.

import type { IAIService } from '@/AIService/AIService.interface';
import { type DBChat, type DBChatMessage, DBChatSchema } from '@repo/db';
import { type DatabasePool, sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';
import {
    type SendMessageOutput,
    updateDBChatMessage,
    upsertDBChatMessage,
} from '../chatMessages/send';

export const CreateChatSchema = z.object({
    initialMessage: z.string(),
});

type CreateChatOutput =
    | {
          type: 'chat';
          chat: DBChat;
      }
    | SendMessageOutput;

export const create = publicProcedure
    .input(CreateChatSchema)
    .mutation(async function* ({
        input,
        ctx,
    }): AsyncGenerator<CreateChatOutput> {
        const chatID = ulid();

        // Try to overlap this request as best as possible with the db insertions
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
                responseStatus: 'streaming',
            },
            ctx.dbPool,
        );
        messages.push(initialMessage);

        yield {
            type: 'chat',
            chat: newChat,
        };

        const chatIterator = ctx.chatService.generateResponse({
            userID: ctx.user.id,
            chatID,
            message: input.initialMessage,
            previousMessages: [],
        });

        let fullMessage = '';
        let messageID = '';
        for await (const chunk of chatIterator) {
            yield {
                type: 'messageChunk',
                messageChunk: chunk,
            };
            messageID = chunk.id;
            fullMessage += chunk.messageContent;
        }

        const completedAssistantMessage = await upsertDBChatMessage(
            {
                id: messageID,
                userID: ctx.user.id,
                chatID: chatID,
                messageType: 'assistant',
                messageContent: fullMessage,
            },
            ctx.dbPool,
        );

        await previewMessagePromise;

        yield {
            type: 'completeMessage',
            message: completedAssistantMessage,
        };

        await updateDBChatMessage(
            {
                messageID: messageID,
                responseStatus: 'done',
            },
            ctx.dbPool,
        );
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
