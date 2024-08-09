import {
    type FastifyTRPCPluginOptions,
    fastifyTRPCPlugin,
} from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import { createContext } from './context';
import { router } from './trpc';

const SERVER_PORT = 8000;

const appRouter = router({});

export type AppRouter = typeof appRouter;

const server = fastify({
    maxParamLength: 5000,
});

server.register(fastifyTRPCPlugin, {
    prefix: '/trpc',
    trpcOptions: {
        router: appRouter,
        createContext,
        onError({ path, error }) {
            console.error(
                `[ERROR]: tRPC Handler on path ${path} failed with error`,
                error,
            );
        },
    } satisfies FastifyTRPCPluginOptions<AppRouter>['trpcOptions'],
});

(async () => {
    try {
        console.info('[INFO]: Starting server...');
        await server.listen({ port: SERVER_PORT });
        console.info(`[INFO]: Listening on port ${SERVER_PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
})();
