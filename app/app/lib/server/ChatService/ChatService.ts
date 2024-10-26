import type { IChatService } from './ChatService.interface';

import type { DBChatMessage } from '../db';
import { getDefaultSystemPrompt } from './prompts/ChatPrompt';

import assert from 'node:assert';
import ProgramState, { OpenAIBackend } from 'enochian-js';
import { DateTime } from 'luxon';
import type OpenAI from 'openai';
import { ulid } from 'ulid';

export default class ChatService implements IChatService {
    private _modelUrl?: string;
    private _modelName?: string;
    private _backendType: 'SGLang' | 'OpenAI' = 'SGLang';

    constructor() {
        this._modelUrl = process.env.MODEL_URL;
        this._modelName = process.env.MODEL_NAME;
        const backendType = process.env.BACKEND_TYPE;
        if (backendType === 'SGLang' || backendType === 'OpenAI') {
            this._backendType = backendType;
        }
        if (this._backendType === 'SGLang') {
            assert(this._modelUrl != null, 'Must provide model URL for SGLang');
        } else {
            assert(
                this._modelName != null,
                'Must provide model name for OpenAI',
            );
        }
    }

    async *generateResponse(input: {
        userID: string;
        chatID: string;
        message: string;
        messageID?: string;
        customSystemPrompt?: string;
        previousMessages?: DBChatMessage[];
    }) {
        const s = new ProgramState();
        if (this._backendType === 'OpenAI') {
            s.setBackend(new OpenAIBackend({ baseURL: this._modelUrl }));
            s.setModel({ modelName: this._modelName as OpenAI.ChatModel });
        } else {
            await s.setModel(this._modelUrl as string);
        }

        if (input.customSystemPrompt) {
            s.add(s.system`${input.customSystemPrompt}`);
        } else {
            s.add(s.system`${getDefaultSystemPrompt()}`);
        }

        if (input.previousMessages) {
            for (let i = input.previousMessages.length - 1; i >= 0; i--) {
                const m = input.previousMessages[i];
                if (!m) continue;
                else if (m.messageType === 'user') {
                    s.add(s.user`${m.messageContent}`);
                } else {
                    s.add(s.assistant`${m.messageContent}`);
                }
            }
        }

        const chatIterator = s
            .add(s.user`${input.message}`)
            .add(s.assistant`${s.gen('response', { stream: true })}`);

        const messageID = input.messageID ?? ulid();

        for await (const chunk of chatIterator) {
            yield {
                id: messageID,
                userID: input.userID,
                chatID: input.chatID,
                messageType: 'assistant',
                messageContent: chunk.content,
                status: 'streaming',
                createdAt: DateTime.now().toJSDate(),
                updatedAt: DateTime.now().toJSDate(),
            } satisfies DBChatMessage;
        }
    }
}
