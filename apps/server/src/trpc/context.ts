import { requestContext } from '@fastify/request-context';
import type { User } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';

export async function createContext({ req, res }: CreateFastifyContextOptions) {
    return {
        req,
        res,
        aiService: req.server.aiService,
        chatService: req.server.chatService,
        dbPool: req.server.dbPool,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
export type AuthedContext = Context & { user: User };
