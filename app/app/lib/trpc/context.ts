import type { User } from '@supabase/supabase-js';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';
import AIService from '../AIService/AIService';
import ChatService from '../ChatService/ChatService';
import { getDbPool } from '../db';
import { getSupabaseServerClient } from '../supabase';

export async function createContext(event: FetchCreateContextFnOptions) {
    console.log('IM IN');
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

    console.log('WTF');
    const aiService = AIService.getInstance();
    console.log(1);
    const chatService = new ChatService(aiService);
    console.log(2);
    const dbPool = await getDbPool();

    console.log('IT IS GETTING THERE');

    return {
        ...event,
        user,
        aiService,
        chatService,
        dbPool,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
