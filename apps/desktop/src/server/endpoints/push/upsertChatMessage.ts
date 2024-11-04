import assert from 'node:assert';
import type { Transaction } from '@libsql/client/.';
import type { UpsertChatMessageArgs } from '@preload/shared';
import { DateTime } from 'luxon';
import type { Affected } from '.';

export async function upsertChatMessage(
    tx: Transaction,
    userID: string,
    args: UpsertChatMessageArgs,
): Promise<Affected> {
    // Check if the message exists
    const existingMessage = await tx.execute({
        sql: 'SELECT * FROM ChatMessage WHERE id = ? AND chatID = ?',
        args: [args.chatMessage?.id ?? 'NOPE', args.chatID],
    });

    if (existingMessage.rows.length === 0) {
        // Insert new message
        const newMessage = {
            id: args.chatMessage.id,
            userID: args.chatMessage.userID,
            chatID: args.chatID,
            messageType: args.chatMessage.messageType,
            messageContent: args.chatMessage.messageContent,
            createdAt: DateTime.now().toISO(),
            updatedAt: DateTime.now().toISO(),
        };

        // Validate required fields
        const requiredFields: (keyof typeof newMessage)[] = [
            'id',
            'userID',
            'chatID',
            'messageType',
            'messageContent',
            'createdAt',
            'updatedAt',
        ];

        const missingFields = requiredFields.filter(
            (field) => newMessage[field] === undefined,
        );

        if (missingFields.length > 0) {
            throw new Error(
                `Missing required fields: ${missingFields.join(', ')}`,
            );
        }

        const result = await tx.execute({
            sql: `
                INSERT INTO ChatMessage (
                    id,
                    userID,
                    chatID,
                    messageType,
                    messageContent,
                    createdAt,
                    updatedAt
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            `,
            args: [
                // biome-ignore lint/style/noNonNullAssertion: can't be null
                newMessage.id!,
                // biome-ignore lint/style/noNonNullAssertion: can't be null
                newMessage.userID!,
                newMessage.chatID,
                // biome-ignore lint/style/noNonNullAssertion: can't be null
                newMessage.messageType!,
                // biome-ignore lint/style/noNonNullAssertion: can't be null
                newMessage.messageContent!,
                newMessage.createdAt,
                newMessage.updatedAt,
            ],
        });

        return {
            chatIDs: [args.chatID],
            // biome-ignore lint/style/noNonNullAssertion: can't be null
            chatMessageIDs: [newMessage.id!],
        };
    } else {
        assert(args.chatMessage.id != null, 'It must be defined at this point');

        // Update existing message
        await tx.execute({
            sql: `
                UPDATE ChatMessage
                SET
                    userID = COALESCE(?, userID),
                    messageType = COALESCE(?, messageType),
                    messageContent = COALESCE(?, messageContent),
                    updatedAt = CURRENT_TIMESTAMP
                WHERE id = ? AND chatID = ?
            `,
            args: [
                args.chatMessage.userID ?? null,
                args.chatMessage.messageType ?? null,
                args.chatMessage.messageContent ?? null,
                args.chatMessage.id,
                args.chatID,
            ],
        });

        return {
            chatIDs: [args.chatID],
            chatMessageIDs: [args.chatMessage.id],
        };
    }
}
