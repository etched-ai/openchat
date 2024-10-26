import { type DatabasePool, createPool } from 'slonik';
import { z } from 'zod';

const POSTGRES_URL = process.env.POSTGRES_URL as string;
let pool: DatabasePool | null = null;
export async function getDbPool() {
    if (pool) return pool;
    console.log('yeet', POSTGRES_URL);
    pool = await createPool(POSTGRES_URL);
    return pool;
}

const preprocessedDate = z.preprocess((arg) => {
    if (
        // If it's a ISO date string
        typeof arg === 'string' ||
        // Or an epoch time
        typeof arg === 'number' ||
        arg instanceof Date
    )
        return new Date(arg);
    return arg;
}, z.date());

export const DBChatSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().uuid(),
    previewName: z.string().nullable(),
    createdAt: preprocessedDate,
    updatedAt: preprocessedDate,
});
export type DBChat = z.infer<typeof DBChatSchema>;

const BaseDBChatMessageSchema = z.object({
    id: z.string().ulid(),
    userID: z.string().uuid(),
    chatID: z.string().ulid(),
    messageContent: z.string(),
    status: z.enum(['streaming', 'done', 'canceled']),
    createdAt: preprocessedDate,
    updatedAt: preprocessedDate,
});
const UserMessageSchema = BaseDBChatMessageSchema.extend({
    messageType: z.literal('user'),
});
const AssistantMessageSchema = BaseDBChatMessageSchema.extend({
    messageType: z.literal('assistant'),
});
export const DBChatMessageSchema = z.discriminatedUnion('messageType', [
    UserMessageSchema,
    AssistantMessageSchema,
]);
export type DBChatMessage = z.infer<typeof DBChatMessageSchema>;
