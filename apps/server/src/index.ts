import 'dotenv/config';

import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import { fastifyRequestContext } from '@fastify/request-context';
import type { User } from '@supabase/supabase-js';
import {
    type FastifyTRPCPluginOptions,
    fastifyTRPCPlugin,
} from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import AIServiceSingletonPlugin from './fastify/plugins/AIServiceSingletonPlugin';
import ChatServicePlugin from './fastify/plugins/ChatServicePlugin';
import SlonikDBSingletonPlugin from './fastify/plugins/SlonikDBSingletonPlugin';
import { createContext } from './trpc/context';
import { type AppRouter, appRouter } from './trpc/router';
import { supabase } from './utils/supabase';

const SERVER_PORT = 8000;

const server = fastify({
    maxParamLength: 5000,
});

// Request context async store
declare module '@fastify/request-context' {
    interface RequestContextData {
        user: User | null;
    }
}
server.register(fastifyRequestContext);

// Cors config
server.register(fastifyCors, {
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials: true,
});

// Cookies
server.register(fastifyCookie, {
    secret: 'abc123',
    hook: 'onRequest',
    parseOptions: {},
});

// Add AI Service as a singleton across fastify
server.register(AIServiceSingletonPlugin);

// Add a chat service
server.register(ChatServicePlugin);

// Add a db connection pool as a singleton across fastify
server.register(SlonikDBSingletonPlugin);

// Auth
server.addHook('onRequest', async (req, reply) => {
    const accessToken = req.cookies['sb-access-token'];

    if (!accessToken) {
        console.log('NO ACCESS TOKEN');
        return;
    }

    let user: User;
    try {
        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error) {
            console.error('[AUTH ERROR]:', error);
            reply.code(401).send({ error: 'Invalid token.' });
            return reply;
        }

        if (!data.user) {
            console.error('[ERROR]: NO USER FOUND');
            reply.code(401).send({ error: 'User not found.' });
            return reply;
        }

        user = data.user;
    } catch (error) {
        console.error('Error validating token:', error);
        reply.code(500).send({ error: 'Internal server error.' });
        return reply;
    }

    req.requestContext.set('user', user);
});

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
        console.error(err);
        process.exit(1);
    }
})();
