import { type DBChatMessage, DBChatMessageSchema } from '@repo/db';
import { DateTime } from 'luxon';
import { type DatabasePool, sql } from 'slonik';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const SendMessageSchema = z.object({
    message: z.string(),
    customSystemPrompt: z.string().optional(),
    previousMessages: z.array(DBChatMessageSchema).optional(),
    chatID: z.string(),
});
type SendMessageOutput =
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

export const sendMessage = publicProcedure
    .input(SendMessageSchema)
    .mutation(async function* ({
        input,
        ctx,
    }): AsyncGenerator<SendMessageOutput> {
        const newUserMessage = await createDBChatMessage(
            {
                id: ulid(),
                userID: ctx.user.id,
                chatID: input.chatID,
                messageType: 'user',
                messageContent: input.message,
            },
            ctx.dbPool,
        );
        yield {
            type: 'userMessage',
            message: newUserMessage,
        };

        const openaiClient = ctx.aiService.getOpenAIClient();
        const chatMessages = ctx.aiService.getChatPromptMessages({
            newMessage: input.message,
            previousMessages: input.previousMessages,
            customSystemPrompt: input.customSystemPrompt,
        });
        const chatIterator = await openaiClient.chat.completions.create({
            model: ctx.aiService.getModelName(),
            messages: chatMessages,
            stream: true,
        });

        const messageID = ulid();
        let fullMessage = '';
        for await (const chunk of chatIterator) {
            yield {
                type: 'messageChunk',
                messageChunk: {
                    id: messageID,
                    userID: ctx.user.id,
                    chatID: input.chatID,
                    messageType: 'assistant',
                    messageContent: chunk.choices[0]?.delta.content || '',
                    createdAt: DateTime.now().toJSDate(),
                    updatedAt: DateTime.now().toJSDate(),
                } satisfies DBChatMessage,
            };
            fullMessage += chunk.choices[0]?.delta.content || '';
        }

        const completedAssistantMessage = await createDBChatMessage(
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
    });

type StrippedDBChatMessage = Omit<DBChatMessage, 'createdAt' | 'updatedAt'>;
async function createDBChatMessage(
    message: StrippedDBChatMessage,
    pool: DatabasePool,
): Promise<DBChatMessage> {
    return await pool.one(sql.type(DBChatMessageSchema)`
        INSERT INTO "ChatMessage" (
            id,
            "userID",
            "chatID",
            "messageType",
            "messageContent",
            "createdAt",
            "updatedAt"
        ) VALUES (
            ${message.id},
            ${message.userID},
            ${message.chatID},
            ${message.messageType},
            ${message.messageContent},
        )
        RETURNING *
    `);
}
