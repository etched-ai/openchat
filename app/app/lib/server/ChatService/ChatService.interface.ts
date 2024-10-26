import type { DBChatMessage } from '@/lib/server/db';

export interface IChatService {
    generateResponse: (input: {
        userID: string;
        chatID: string;
        message: string;
        customSystemPrompt?: string;
        previousMessages?: DBChatMessage[];
    }) => AsyncGenerator<DBChatMessage>;
}
