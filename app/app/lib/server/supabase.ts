import { createBrowserClient, createServerClient } from '@supabase/ssr';
import { parseCookies, setCookie } from 'vinxi/http';

export function getSupabaseServerClient() {
    return createServerClient(
        process.env.SUPABASE_URL ?? '',
        process.env.SUPABASE_ANON_KEY ?? '',
        {
            cookies: {
                // @ts-ignore Wait till Supabase overload works
                getAll() {
                    return Object.entries(parseCookies()).map(
                        ([name, value]) => ({
                            name,
                            value,
                        }),
                    );
                },
                setAll(cookies) {
                    for (const cookie of cookies) {
                        setCookie(cookie.name, cookie.value);
                    }
                },
            },
        },
    );
}
