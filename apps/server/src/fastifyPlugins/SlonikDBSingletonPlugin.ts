import { requestContext } from '@fastify/request-context';
import fp from 'fastify-plugin';
import { type DatabasePool, type Interceptor, createPool, sql } from 'slonik';

const POSTGRES_URL = process.env.POSTGRES_URL as string;

declare module 'fastify' {
    interface FastifyInstance {
        dbPool: DatabasePool;
    }
}
export default fp(async (fastify) => {
    const pool = await createPool(POSTGRES_URL);
    fastify.decorate('dbPool', pool);
});
