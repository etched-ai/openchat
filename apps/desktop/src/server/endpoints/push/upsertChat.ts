import type { Transaction } from '@libsql/client/.';
import type { UpsertChatArgs } from '@preload/shared';
import { DateTime } from 'luxon';
import type { Affected } from '.';
import db, { type DBChat, DBChatSchema } from '../../db';

export async function upsertChat(
    tx: Transaction,
    userID: string,
    args: UpsertChatArgs,
): Promise<Affected> {
    // First check if the chat exists
    const existingChat = await tx.execute({
        sql: 'SELECT * FROM Chat WHERE id = ?',
        args: [args.chatID],
    });

    if (existingChat.rows.length === 0) {
        // Insert new chat
        const newChat = args.chat as DBChat;

        // Validate required fields
        const requiredFields: (keyof DBChat)[] = [
            'id',
            'userID',
            'previewName',
            'createdAt',
            'updatedAt',
        ];

        const missingFields = requiredFields.filter(
            (field) => newChat[field] === undefined,
        );

        if (missingFields.length > 0) {
            throw new Error(
                `Missing required fields: ${missingFields.join(', ')}`,
            );
        }

        // Validate against schema
        const parseResult = DBChatSchema.safeParse(newChat);
        if (!parseResult.success) {
            console.log('💎', newChat);
            throw new Error(`Invalid chat data: ${parseResult.error.message}`);
        }

        await tx.execute({
            sql: `
                INSERT INTO Chat (
                    id,
                    userID,
                    previewName,
                    createdAt,
                    updatedAt
                ) VALUES (?, ?, ?, ?, ?)
            `,
            args: [
                newChat.id,
                newChat.userID,
                newChat.previewName ?? '',
                newChat.createdAt,
                newChat.updatedAt,
            ],
        });

        return {
            chatIDs: [newChat.id],
            chatMessageIDs: [],
        };
    } else {
        // biome-ignore lint/suspicious/noExplicitAny: It's fine
        const existingData = existingChat.rows[0] as Record<string, any>;

        // Convert the database row to our DBChat type
        const existing: DBChat = {
            id: existingData.id,
            userID: existingData.userID,
            previewName: existingData.previewName ?? '',
            createdAt: existingData.createdAt,
            updatedAt: existingData.updatedAt,
        };

        const updatedChat: DBChat = {
            ...existing,
            ...args.chat,
            updatedAt: DateTime.now().toISO(),
        };

        // Validate against schema
        const parseResult = DBChatSchema.safeParse(updatedChat);
        if (!parseResult.success) {
            console.log('💎', updatedChat);
            throw new Error(`Invalid chat data: ${parseResult.error.message}`);
        }

        await tx.execute({
            sql: `
                UPDATE Chat
                SET
                    userID = ?,
                    previewName = ?,
                    updatedAt = ?
                WHERE id = ?
            `,
            args: [
                updatedChat.userID,
                updatedChat.previewName ?? '',
                updatedChat.updatedAt,
                updatedChat.id,
            ],
        });

        return {
            chatIDs: [updatedChat.id],
            chatMessageIDs: [],
        };
    }
}
