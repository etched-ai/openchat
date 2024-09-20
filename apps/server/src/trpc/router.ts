import { chatRouter } from './routers/chat';
import { router } from './trpc';

export const appRouter = router({
    chat: chatRouter,
});

export type AppRouter = typeof appRouter;
