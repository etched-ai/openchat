// This procedure creates a user message and optionally streams down an assistant
// message.

import {
    DBChat,
    type DBChatMessage,
    DBChatMessageSchema,
    DBChatSchema,
} from '@repo/db';
import { DateTime } from 'luxon';
import { type DatabasePool, sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const SendMessageSchema = z.object({
    message: z.string(),
    customSystemPrompt: z.string().optional(),
    chatID: z.string(),
});
export type SendMessageOutput =
    | {
          type: 'userMessage';
          message: DBChatMessage;
      }
    | {
          type: 'messageChunk';
          messageChunk: DBChatMessage;
      }
    | {
          type: 'completeMessage';
          message: DBChatMessage;
      };

export const send = publicProcedure
    .input(SendMessageSchema)
    .mutation(async function* ({
        input,
        ctx,
    }): AsyncGenerator<SendMessageOutput> {
        // First create the user's message in the DB and send it back down.
        const newUserMessage = await upsertDBChatMessage(
            {
                id: ulid(),
                userID: ctx.user.id,
                chatID: input.chatID,
                messageType: 'user',
                messageContent: input.message,
                responseStatus: 'not_started',
            },
            ctx.dbPool,
        );
        yield {
            type: 'userMessage',
            message: newUserMessage,
        };

        await maybeSetChatPreview(
            { chatID: input.chatID, message: input.message },
            ctx.dbPool,
        );

        let messageID = ulid();
        await updateDBChatMessage(
            {
                messageID: newUserMessage.id,
                responseStatus: 'streaming',
                responseMessageID: messageID,
            },
            ctx.dbPool,
        );

        const previousMessages = await getPreviousChatMessages(
            { chatID: input.chatID },
            ctx.dbPool,
        );

        const chatIterator = ctx.chatService.generateResponse({
            userID: ctx.user.id,
            chatID: input.chatID,
            message: input.message,
            messageID,
            previousMessages: previousMessages.slice(1),
            customSystemPrompt: input.customSystemPrompt,
        });

        let fullMessage = '';
        for await (const chunk of chatIterator) {
            // While the message is in the process of generating, we do not do database updates to it.
            // No point slowing it down. If the user cancels the request in the middle it'll still be
            // there locally so they can edit it. If they refresh the page its fine for a half-complete
            // generation to just disappear as if it never happened.
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
                chatID: input.chatID,
                messageType: 'assistant',
                messageContent: fullMessage,
            },
            ctx.dbPool,
        );
        yield {
            type: 'completeMessage',
            message: completedAssistantMessage,
        };

        await updateDBChatMessage(
            {
                messageID: newUserMessage.id,
                responseStatus: 'done',
            },
            ctx.dbPool,
        );
    });

type StrippedDBChatMessage = Omit<DBChatMessage, 'createdAt' | 'updatedAt'>;
export async function upsertDBChatMessage(
    message: StrippedDBChatMessage,
    pool: DatabasePool,
): Promise<DBChatMessage> {
    try {
        return await pool.one(sql.type(DBChatMessageSchema)`
            INSERT INTO "ChatMessage" (
                id,
                "userID",
                "chatID",
                "messageType",
                "messageContent",
                "responseStatus",
                "responseMessageID",
                "createdAt",
                "updatedAt"
            ) VALUES (
                ${message.id},
                ${message.userID},
                ${message.chatID},
                ${message.messageType},
                ${message.messageContent},
                ${message.responseStatus ?? sql.fragment`NULL`},
                ${message.responseMessageID ?? sql.fragment`NULL`},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                "userID" = EXCLUDED."userID",
                "chatID" = EXCLUDED."chatID",
                "messageType" = EXCLUDED."messageType",
                "messageContent" = EXCLUDED."messageContent",
                "responseStatus" = EXCLUDED."responseStatus",
                "responseMessageID" = EXCLUDED."responseMessageID",
                "updatedAt" = CURRENT_TIMESTAMP
            RETURNING *;
        `);
    } catch (e) {
        console.error(e);
        throw e;
    }
}

type UpdateDBChatMessageParams = {
    messageID: string;
    responseStatus?: DBChatMessage['responseStatus'];
    responseMessageID?: string;
};
export async function updateDBChatMessage(
    params: UpdateDBChatMessageParams,
    pool: DatabasePool,
): Promise<DBChatMessage> {
    const { messageID, responseStatus, responseMessageID } = params;

    try {
        const updateFields = [];

        if (responseStatus !== undefined) {
            updateFields.push(
                sql.fragment`"responseStatus" = ${responseStatus === null ? sql.fragment`NULL` : responseStatus}`,
            );
        }

        if (responseMessageID !== undefined) {
            updateFields.push(
                sql.fragment`"responseMessageID" = ${responseMessageID}`,
            );
        }

        if (updateFields.length === 0) {
            throw new Error('No fields to update');
        }

        updateFields.push(sql.fragment`"updatedAt" = CURRENT_TIMESTAMP`);

        const updateFieldsSQL = sql.join(updateFields, sql.fragment`, `);

        return await pool.one(sql.type(DBChatMessageSchema)`
            UPDATE "ChatMessage"
            SET ${updateFieldsSQL}
            WHERE id = ${messageID}
            RETURNING *;
        `);
    } catch (e) {
        console.error(e);
        throw e;
    }
}

type GetPreviousChatMessagesParams = {
    chatID: string;
};
export async function getPreviousChatMessages(
    params: GetPreviousChatMessagesParams,
    pool: DatabasePool,
): Promise<Readonly<DBChatMessage[]>> {
    const { chatID } = params;

    const messages = await pool.any(sql.type(DBChatMessageSchema)`
        SELECT *
        FROM "ChatMessage"
        WHERE "chatID" = ${chatID}
        ORDER BY id DESC
    `);

    return messages;
}

type MaybeSetChatPreviewParams = {
    chatID: string;
    message: string;
};
export async function maybeSetChatPreview(
    params: MaybeSetChatPreviewParams,
    pool: DatabasePool,
): Promise<void> {
    const { chatID, message } = params;

    await pool.any(sql.type(DBChatSchema)`
        UPDATE "Chat"
        SET "previewName" = ${message}
        WHERE id = ${chatID}
        AND "previewName" IS NULL;
    `);
}
