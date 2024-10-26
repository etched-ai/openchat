import { type DatabasePool, sql } from 'slonik';
import { type DBChatMessage, DBChatMessageSchema } from './db';

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
                "status",
                "createdAt",
                "updatedAt"
            ) VALUES (
                ${message.id},
                ${message.userID},
                ${message.chatID},
                ${message.messageType},
                ${message.messageContent},
                ${message.status},
                CURRENT_TIMESTAMP,
                CURRENT_TIMESTAMP
            )
            ON CONFLICT (id) DO UPDATE SET
                "userID" = EXCLUDED."userID",
                "chatID" = EXCLUDED."chatID",
                "messageType" = EXCLUDED."messageType",
                "messageContent" = EXCLUDED."messageContent",
                "status" = EXCLUDED."status",
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
    status: DBChatMessage['status'];
};
export async function updateDBChatMessage(
    params: UpdateDBChatMessageParams,
    pool: DatabasePool,
): Promise<DBChatMessage> {
    const { messageID, status } = params;

    try {
        const updateFields = [];

        if (status !== undefined) {
            updateFields.push(sql.fragment`"status" = ${status}`);
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
