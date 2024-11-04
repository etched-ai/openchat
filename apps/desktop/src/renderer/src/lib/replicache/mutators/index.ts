import upsertChat from './upsertChat.js';
import upsertChatMessage from './upsertChatMessage.js';

export type M = typeof mutators;

export const mutators = {
    upsertChat,
    upsertChatMessage,
};
