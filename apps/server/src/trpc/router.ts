import { chatRouter } from './routers/chat';
import { chatMessagesRouter } from './routers/chatMessages';
import { router } from './trpc';

export const appRouter = router({
    chat: chatRouter,
    chatMessages: chatMessagesRouter,
});

export type AppRouter = typeof appRouter;
