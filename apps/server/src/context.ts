import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export function createContext({ req, res }: CreateFastifyContextOptions) {
    const user = {
        token: req.headers.authorization ?? 'anon',
    };

    return { req, res, user };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
