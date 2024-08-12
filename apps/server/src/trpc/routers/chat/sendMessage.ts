import {
    type DBChat,
    type DBChatMessage,
    DBChatMessageSchema,
    DBChatSchema,
} from '@repo/db';
import { DateTime } from 'luxon';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const SendMessageSchema = z.object({
    message: z.string(),
    customSystemPrompt: z.string().optional(),
    previousMessages: z.array(DBChatMessageSchema).optional(),
    chat: DBChatSchema.optional(),
});
export const sendMessage = publicProcedure
    .input(SendMessageSchema)
    .mutation(async function* ({ input, ctx }) {
        let chat: DBChat;
        if (input.chat) {
            chat = input.chat;
        } else {
            let previewName = input.message;
            if (previewName.length > 15) {
                previewName = `${previewName.substring(0, 12)}...`;
            }
            chat = {
                id: ulid(),
                userID: ctx.user.id,
                previewName,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            };
            yield {
                type: 'newChat',
                chat,
            };
        }

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

        const messageId = ulid();
        let fullMessage = '';
        for await (const chunk of chatIterator) {
            yield {
                type: 'messageChunk',
                messageChunk: {
                    id: messageId,
                    userID: ctx.user.id,
                    chatID: chat.id,
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
                id: messageId,
                userID: ctx.user.id,
                chatID: chat.id,
                messageType: 'assistant',
                messageContent: fullMessage,
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            } satisfies DBChatMessage,
        };
    });
