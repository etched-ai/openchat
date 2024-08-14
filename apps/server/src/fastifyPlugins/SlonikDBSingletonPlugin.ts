import { requestContext } from '@fastify/request-context';
import fp from 'fastify-plugin';
import { type DatabasePool, type Interceptor, createPool } from 'slonik';

const POSTGRES_URL = process.env.POSTGRES_URL as string;

const createRLSInterceptor = (): Interceptor => {
    return {
        transformQuery(queryContext, query) {
            const user = requestContext.get('user');
            console.log('USER', user);
            if (user) {
                return {
                    sql: `SET LOCAL role = 'authenticated';
                        SET LOCAL "request.jwt.claim.sub" = ${user.id};

                        ${query.sql}

                        RESET ALL;`,
                    values: query.values,
                };
            } else {
                return query;
            }
        },
    };
};

declare module 'fastify' {
    interface FastifyInstance {
        dbPool: DatabasePool;
    }
}
export default fp(async (fastify) => {
    const pool = await createPool(POSTGRES_URL, {
        interceptors: [createRLSInterceptor()],
    });
    fastify.decorate('dbPool', pool);
});
