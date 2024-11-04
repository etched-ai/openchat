import type { ReplicacheChat, UpsertChatArgs } from '@preload/shared';
import type { WriteTransaction } from 'replicache';

export default async function upsertChat(
    tx: WriteTransaction,
    args: UpsertChatArgs,
) {
    const existingChat = args.chat.id
        ? ((await tx.get(`chat/${args.chatID}`)) as ReplicacheChat | undefined)
        : undefined;
    if (!existingChat) {
        console.log('NO EXISTING CHAT');
        const newChat = args.chat as ReplicacheChat;
        const requiredFields: (keyof ReplicacheChat)[] = [
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

        await tx.set(`chat/${args.chatID}`, newChat);

        return newChat;
    } else {
        const updatedMessage: ReplicacheChat = {
            ...existingChat,
            ...args.chat,
            updatedAt: new Date().toISOString(), // Update the updatedAt timestamp
        };

        await tx.set(`chat/${args.chatID}`, updatedMessage);

        return updatedMessage;
    }
}
