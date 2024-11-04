export type ReplicacheChat = {
    id: string;
    userID: string;
    previewName: string;
    createdAt: string;
    updatedAt: string;
};

export type ReplicacheChatMessage = {
    id: string;
    userID: string;
    chatID: string;
    messageType: 'user' | 'assistant';
    messageContent: string;
    createdAt: string;
    updatedAt: string;
};

export type UpsertChatArgs = {
    chatID: string;
    chat: Partial<ReplicacheChat>;
};

export type UpsertChatMessageArgs = {
    chatID: string;
    chatMessage: Partial<ReplicacheChatMessage>;
};
