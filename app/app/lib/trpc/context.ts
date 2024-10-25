import type { User } from '@supabase/supabase-js';
import { type HTTPEvent, createError, getCookie, sendError } from 'vinxi/http';
import { getSupabaseServerClient } from '../supabase';

export async function createContext(event: HTTPEvent) {
    const supabase = getSupabaseServerClient();
    const accessToken = getCookie(event, 'sb-access-token');

    if (!accessToken) {
        console.log('NO ACCESS TOKEN');
        return;
    }

    let user: User;
    try {
        const { data, error } = await supabase.auth.getUser(accessToken);

        if (error) {
            console.error('[AUTH ERROR:]', error);
            sendError(
                event,
                createError({
                    statusCode: 401,
                    statusMessage: 'Invalid token.',
                }),
            );
            return;
        }

        if (!data.user) {
            console.error('[ERROR]: NO USER FOUND');
            sendError(
                event,
                createError({
                    statusCode: 401,
                    statusMessage: 'User not found',
                }),
            );
            return;
        }

        user = data.user;
    } catch (error) {
        console.error('Error validating token:', error);
        sendError(
            event,
            createError({
                statusCode: 500,
                statusMessage: 'Internal server error.',
            }),
        );
        return;
    }

    return {
        ...event,
        user,
    };
}

export type Context = Awaited<ReturnType<typeof createContext>>;
