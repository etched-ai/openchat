import { z } from 'zod';

export const DBChatSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().ulid(),
    previewName: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type DBChat = z.infer<typeof DBChatSchema>;

export const DBChatMessageSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().ulid(),
    chatID: z.string().ulid(),
    messageType: z.literal('assistant').or(z.literal('user')),
    messageContent: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type DBChatMessage = z.infer<typeof DBChatMessageSchema>;

export const urmom = 'fat';
