import { createHTTPServer } from '@trpc/server/adapters/standalone';
import { router } from './trpc';

const appRouter = router({});

export type AppRouter = typeof appRouter;

const server = createHTTPServer({
    router: appRouter,
});

console.info('[INFO]: Starting server...');
server.listen(3000);
console.info('[INFO]: Listening on port 3000');
