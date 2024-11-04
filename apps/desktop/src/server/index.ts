import fastifyCors from '@fastify/cors';
import fastifyRequestContext from '@fastify/request-context';
import fastify from 'fastify';

import type { User } from '@supabase/supabase-js';
import { handlePull } from './endpoints/pull/index.js';
import { handlePush } from './endpoints/push/index.js';
import { supabase } from './utils/supabase.js';

declare module '@fastify/request-context' {
    interface RequestContextData {
        user: User;
    }
}

export default function createServer() {
    const server = fastify({
        maxParamLength: 5000,
    });

    server.register(fastifyRequestContext);

    server.register(fastifyCors, {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['*'],
        credentials: true,
    });

    server.addHook('onRequest', async (req, reply) => {
        const accessToken = req.headers.authorization;

        if (!accessToken) {
            console.log('NO ACCESS TOKEN');
            reply.status(401).send('unauthorized');
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

    server.post('/replicache/pull', handlePull);
    server.post('/replicache/push', handlePush);

    return server;
}
