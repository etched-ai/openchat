import type { DBChatMessage } from '@/lib/db';

export interface IChatService {
    generateResponse: (input: {
        userID: string;
        chatID: string;
        message: string;
        customSystemPrompt?: string;
        previousMessages?: DBChatMessage[];
    }) => AsyncGenerator<DBChatMessage>;
}
