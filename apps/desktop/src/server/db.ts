import { createClient } from '@libsql/client';
import { z } from 'zod';

const db = createClient({
    url: 'file:./src/server/local.db',
});

export default db;

export const DBChatSchema = z.object({
    id: z.string(),
    userID: z.string(),
    previewName: z.string().nullish(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export type DBChat = z.infer<typeof DBChatSchema>;

export const DBChatMessageSchema = z.object({
    id: z.string(),
    userID: z.string(),
    chatID: z.string(),
    messageType: z.string(),
    messageContent: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});
export type DBChatMessage = z.infer<typeof DBChatMessageSchema>;

// Replicache
export const DBReplicacheClientGroupSchema = z.object({
    id: z.string(),
    userID: z.string(),
    // Replicache requires that cookies are ordered within a client group.
    // To establish this order we simply keep a counter.
    cvrVersion: z.number().int().nonnegative(),
    createdAt: z.string(),
});
export type DBReplicacheClientGroup = z.infer<
    typeof DBReplicacheClientGroupSchema
>;

export const DBReplicacheClientSchema = z.object({
    id: z.string(),
    clientGroupID: z.string(),
    lastMutationID: z.number().int().nonnegative(),
    createdAt: z.string(),
});
export type DBReplicacheClient = z.infer<typeof DBReplicacheClientSchema>;
