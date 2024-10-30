import fastifyCors from '@fastify/cors';
import fastify from 'fastify';

export default function createServer() {
    const server = fastify({
        maxParamLength: 5000,
    });

    server.register(fastifyCors, {
        origin: 'http://localhost:5173',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'authorization'],
        credentials: true,
    });

    server.get('/', async function handler(request, reply) {
        console.log('HELLOOOOO');
        return { hello: 'world' };
    });

    return server;
}
