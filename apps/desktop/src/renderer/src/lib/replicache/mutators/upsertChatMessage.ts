import type {
    ReplicacheChatMessage,
    UpsertChatMessageArgs,
} from '@preload/shared';
import type { WriteTransaction } from 'replicache';

export default async function upsertChatMessage(
    tx: WriteTransaction,
    args: UpsertChatMessageArgs,
) {
    const existingMessage = args.chatMessage.id
        ? ((await tx.get(`chatMessage/${args.chatMessage.id}`)) as
              | ReplicacheChatMessage
              | undefined)
        : undefined;
    if (!existingMessage) {
        console.log('NO EXISTING MESSAGE');
        const newMessage = args.chatMessage as ReplicacheChatMessage;
        const requiredFields: (keyof ReplicacheChatMessage)[] = [
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
            console.log('BAD ARGS:', args);
            throw new Error(
                `Missing required fields: ${missingFields.join(', ')}`,
            );
        }

        console.log('SETTING', newMessage);
        await tx.set(`chatMessage/${newMessage.id}`, newMessage);
    } else {
        const updatedMessage: ReplicacheChatMessage = {
            ...existingMessage,
            ...args.chatMessage,
            updatedAt: new Date().toISOString(), // Update the updatedAt timestamp
        };

        await tx.set(`chatMessage/${updatedMessage.id}`, updatedMessage);
    }
}
