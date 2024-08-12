import { type DBChatMessage, DBChatMessageSchema } from '@repo/db';
import { DateTime } from 'luxon';
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

        yield {
            type: 'completeMessage',
            message: {
                id: messageID,
                userID: ctx.user.id,
                chatID: input.chatID,
                messageType: 'assistant',
                messageContent: fullMessage,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            } satisfies DBChatMessage,
        };
    });
