import 'dotenv/config';

import fastifyCors from '@fastify/cors';
import { fastifyRequestContext } from '@fastify/request-context';
import type { User } from '@supabase/supabase-js';
import {
    type FastifyTRPCPluginOptions,
    fastifyTRPCPlugin,
} from '@trpc/server/adapters/fastify';
import fastify from 'fastify';
import AIServiceSingletonPlugin from './fastifyPlugins/AIServiceSingletonPlugin';
import SlonikDBSingletonPlugin from './fastifyPlugins/SlonikDBSingletonPlugin';
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
        user: User;
    }
}
server.register(fastifyRequestContext);
server.addHook('onRequest', async (req, reply) => {
    let authToken = req.headers.Authorization;
    if (typeof authToken !== 'string' || !authToken.startsWith('Bearer ')) {
        // It should always be in the form of `Bearer ${token}`
        reply
            .code(401)
            .send({ error: 'Authorization header missing or malformed.' });
        return reply;
    }
    // Start of the actual token after `Bearer`
    authToken = authToken.substring(7);

    let user: User;
    try {
        const { data, error } = await supabase.auth.getUser(authToken);

        if (error) {
            reply.code(401).send({ error: 'Invalid token.' });
            return reply;
        }

        if (!data.user) {
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
