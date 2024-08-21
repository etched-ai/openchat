import { z } from 'zod';

export const DBChatSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().uuid(),
    previewName: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type DBChat = z.infer<typeof DBChatSchema>;

const BaseDBChatMessageSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().uuid(),
    chatID: z.string().ulid(),
    messageContent: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
const UserMessageSchema = BaseDBChatMessageSchema.extend({
    messageType: z.literal('user'),
    responseStatus: z.enum(['not_started', 'streaming', 'done', 'canceled']),
    responseMessageID: z.string().ulid().optional(),
});
const AssistantMessageSchema = BaseDBChatMessageSchema.extend({
    messageType: z.literal('assistant'),
    responseStatus: z.undefined(),
    responseMessageID: z.undefined(),
});
export const DBChatMessageSchema = z.discriminatedUnion('messageType', [
    UserMessageSchema,
    AssistantMessageSchema,
]);
export type DBChatMessage = z.infer<typeof DBChatMessageSchema>;
