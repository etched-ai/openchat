import type { Transaction } from '@libsql/client/.';
import { z } from 'zod';
import { DBChatMessage, DBChatMessageSchema, DBChatSchema } from '../db.js';
import { SearchResultSchema } from './replicache.js';

// In the future when we start doing partial remote server syncs this
// will probably need to be more complex, but rn since it's a localdb
// file for just the current user we can forget users are even a thing

type GetAllChatsByIDParams = {
    IDs: string[];
};
export async function getAllChatsByID(
    tx: Transaction,
    params: GetAllChatsByIDParams,
) {
    const placeholders = params.IDs.map(() => '?').join(',');

    const result = await tx.execute({
        sql: `
            SELECT
                id,
                userID,
                previewName,
                createdAt,
                updatedAt
            FROM Chat
            WHERE id IN (${placeholders})
        `,
        args: params.IDs,
    });

    return z.array(DBChatSchema).parse(result.rows);
}

export async function searchChats(tx: Transaction) {
    const result = await tx.execute({
        sql: `
            SELECT
                id,
                rowid as rowversion
            FROM Chat
        `,
        args: [],
    });
    return z.array(SearchResultSchema).parse(result.rows);
}

type GetAllChatMessagesByIDParams = {
    IDs: string[];
};
export async function getAllChatMessagesByID(
    tx: Transaction,
    params: GetAllChatMessagesByIDParams,
) {
    const placeholders = params.IDs.map(() => '?').join(',');

    const result = await tx.execute({
        sql: `
            SELECT
                id,
                userID,
                chatID,
                messageType,
                messageContent,
                createdAt,
                updatedAt
            FROM ChatMessage
            WHERE id IN (${placeholders})
        `,
        args: params.IDs,
    });

    return z.array(DBChatMessageSchema).parse(result.rows);
}

export async function searchChatMessages(tx: Transaction) {
    const result = await tx.execute({
        sql: `
            SELECT
                id,
                rowid as rowversion
            FROM ChatMessage
        `,
        args: [],
    });
    return z.array(SearchResultSchema).parse(result.rows);
}
