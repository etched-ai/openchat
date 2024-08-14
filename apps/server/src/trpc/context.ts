import type { User } from '@supabase/supabase-js';
import { TRPCError } from '@trpc/server';
import type { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { createPool } from 'slonik';
import AIService from '../AIService/AIService';
import { supabase } from '../utils/supabase';

const POSTGRES_URL = process.env.POSTGRES_URL as string;

export async function createContext({ req, res }: CreateFastifyContextOptions) {
    let authToken = req.headers.Authorization;
    if (typeof authToken !== 'string' || !authToken.startsWith('Bearer ')) {
        // It should always be in the form of `Bearer ${token}`
        throw new TRPCError({
            code: 'UNAUTHORIZED',
            message: 'Incorrect Authorization token',
        });
    }
    // Start of the actual token after `Bearer`
    authToken = authToken.substring(7);

    let user: User;
    try {
        const { data, error } = await supabase.auth.getUser(authToken);

        if (error) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'Invalid token',
            });
        }

        if (!data.user) {
            throw new TRPCError({
                code: 'UNAUTHORIZED',
                message: 'User not found',
            });
        }

        user = data.user;
    } catch (error) {
        console.error('Error validating token:', error);
        throw new TRPCError({
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
        });
    }

    const pool = await createPool(POSTGRES_URL);

    return { req, res, user, aiService: AIService.getInstance(), dbPool: pool };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
