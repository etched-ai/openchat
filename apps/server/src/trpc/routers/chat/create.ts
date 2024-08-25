// Creates a DB chat and streams down the response. Chats can only be created from the home page.

import { type DBChat, type DBChatMessage, DBChatSchema } from '@repo/db';
import { sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';
import {
    type SendMessageOutput,
    updateDBChatMessage,
    upsertDBChatMessage,
} from '../chatMessages/send';

export const CreateChatSchema = z.object({
    initialMessage: z.string().optional(),
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
                    responseStatus: 'streaming',
                },
                ctx.dbPool,
            );
            messages.push(initialMessage);
        }

        yield {
            type: 'chat',
            chat: newChat,
        };

        if (!input.initialMessage) return;

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
