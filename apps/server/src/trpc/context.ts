import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import AIService from '../AIService/AIService';

export function createContext({ req, res }: CreateFastifyContextOptions) {
    const user = {
        token: req.headers.authorization ?? 'anon',
    };

    return { req, res, user, aiService: AIService.getInstance() };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
