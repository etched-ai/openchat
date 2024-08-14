import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createPool } from 'slonik';
import AIService from '../AIService/AIService';

const POSTGRES_URL = process.env.POSTGRES_URL as string;

export async function createContext({ req, res }: CreateFastifyContextOptions) {
    const user = {
        id: req.headers.authorization ?? 'anon',
    };

    const pool = await createPool(POSTGRES_URL);

    return { req, res, user, aiService: AIService.getInstance(), dbPool: pool };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
