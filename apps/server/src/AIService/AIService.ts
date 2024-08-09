import type {
    GetChatPromptMessagesArgs,
    IAIService,
} from './AIService.interface';

import OpenAI from 'openai';
import {
    getChatPromptMessages,
    getDefaultSystemPrompt,
} from './prompts/ChatPrompt';

// TODO: Add a big list somewhere of this or auto pull a big list from HF
export const MAX_CONTEXT_LENGTH = 128000;

export default class AIService implements IAIService {
    private _openaiClient: OpenAI;

    constructor() {
        const baseURL = process.env.OPENAI_BASE_URL;
        const apiKey = process.env.OPENAI_KEY ?? 'EMPTY';

        if (!baseURL) throw new Error('Please set an OpenAI base URL');

        // Point this to your self-hosted OpenAI compatible server
        this._openaiClient = new OpenAI({
            baseURL,
            apiKey,
        });
    }

    getOpenAIClient(): OpenAI {
        return this._openaiClient;
    }

    getModelName(): string {
        const modelName = process.env.MODEL_NAME;
        if (!modelName) throw new Error('Please set a model name');
        return modelName;
    }

    getChatPromptMessages(
        args: GetChatPromptMessagesArgs,
    ): OpenAI.ChatCompletionMessageParam[] {
        return getChatPromptMessages(args);
    }

    getDefaultSystemPrompt(): string {
        return getDefaultSystemPrompt();
    }
}
