import type { IChatService } from './ChatService.interface';

import type { IAIService } from '../AIService/AIService.interface';
import type { DBChatMessage } from '../db';

import { DateTime } from 'luxon';
import { ulid } from 'ulid';

export default class ChatService implements IChatService {
    _aiService: IAIService;

    constructor(aiService: IAIService) {
        this._aiService = aiService;
    }

    async *generateResponse(input: {
        userID: string;
        chatID: string;
        message: string;
        messageID?: string;
        customSystemPrompt?: string;
        previousMessages?: DBChatMessage[];
    }) {
        const openaiClient = this._aiService.getOpenAIClient();
        const chatMessages = this._aiService.getChatPromptMessages({
            newMessage: input.message,
            previousMessages: input.previousMessages,
            customSystemPrompt: input.customSystemPrompt,
        });

        const chatIterator = await openaiClient.chat.completions.create({
            model: this._aiService.getModelName(),
            messages: chatMessages,
            stream: true,
        });

        const messageID = input.messageID ?? ulid();

        for await (const chunk of chatIterator) {
            yield {
                id: messageID,
                userID: input.userID,
                chatID: input.chatID,
                messageType: 'assistant',
                messageContent: chunk.choices[0]?.delta.content || '',
                status: 'streaming',
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            } satisfies DBChatMessage;
        }
    }
}
