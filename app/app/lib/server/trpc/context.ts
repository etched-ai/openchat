import type { User } from '@supabase/supabase-js';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import ChatService from '../ChatService/ChatService';
import { getDbPool } from '../db';
import { getSupabaseServerClient } from '../supabase';

export async function createContext(event: FetchCreateContextFnOptions) {
    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase.auth.getUser();

    let user: User | null = null;
    if (!data.user || error) {
        if (error) console.error('[ERROR GET USER]:', error);
        if (!data.user) console.error('NO USER');
        throw error;
    } else {
        user = data.user;
    }

    const chatService = new ChatService();
    const dbPool = await getDbPool();

    return {
        ...event,
        user,
        chatService,
        dbPool,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
