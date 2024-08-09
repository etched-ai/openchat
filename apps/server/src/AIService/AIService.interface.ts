import type { DBChatMessage } from '@repo/db';
import type OpenAI from 'openai';

export type GetChatPromptMessagesArgs = {
    newMessage: string;
    customSystemPrompt?: string;
    previousMessages?: DBChatMessage[];
};

export interface IAIService {
    getOpenAIClient(): OpenAI;
    getModelName(): string;
    getChatPromptMessages(
        args: GetChatPromptMessagesArgs,
    ): OpenAI.ChatCompletionMessageParam[];
    getDefaultSystemPrompt(): string;
}
