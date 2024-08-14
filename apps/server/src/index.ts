import 'dotenv/config';

import fastifyCors from '@fastify/cors';
import {
    type FastifyTRPCPluginOptions,
    fastifyTRPCPlugin,
} from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import AIServiceSingletonPlugin from './plugins/AIServiceSingletonPlugin';
import SlonikDBSingletonPlugin from './plugins/SlonikDBSingletonPlugin';
import { createContext } from './trpc/context';
import { type AppRouter, appRouter } from './trpc/router';

const SERVER_PORT = 8000;

const server = fastify({
    maxParamLength: 5000,
});

// Cors config
server.register(fastifyCors, {
    origin: ['http://localhost:5173'],
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['*'],
    credentials: true,
});

// Add AI Service as a singleton across fastify
server.register(AIServiceSingletonPlugin);

// Add a db connection pool as a singleton across fastify
server.register(SlonikDBSingletonPlugin);

// TRPC
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
        await server.listen({ port: SERVER_PORT, host: '0.0.0.0' });
        console.info(`[INFO]: Listening on port ${SERVER_PORT}`);
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
})();
