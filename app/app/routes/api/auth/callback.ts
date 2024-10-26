import { createAPIFileRoute } from '@tanstack/start/api';

import { getSupabaseServerClient } from '@/lib/server/supabase';

export const Route = createAPIFileRoute('/api/auth/callback')({
    GET: async ({ request }) => {
        const url = new URL(request.url);
        const queryParams = url.searchParams;

        const code = queryParams.get('code');
        const next = queryParams.get('next') ?? '/';
        // Can either be linking identiy or regular login
        const isRegularLogin = queryParams.get('is_regular_login');

        if (!code) {
            let error = queryParams.get('error');
            let errorCode = queryParams.get('error_code');
            let errorDescription = queryParams.get('error_description');

            // If it was an identity link that failed, try logging in normally
            if (!isRegularLogin) {
                console.log('FAILED LINK, TRYING REGULAR');
                const supabase = getSupabaseServerClient();
                const regularLoginRes = await supabase.auth.signInWithOAuth({
                    provider: 'google',
                    options: {
                        redirectTo:
                            'http://localhost:3000/api/auth/callback?is_regular_login=true',
                    },
                });

                if (regularLoginRes.error) {
                    error = regularLoginRes.error.name;
                    errorCode = regularLoginRes.error.code ?? errorCode;
                    errorDescription = regularLoginRes.error.message;
                } else {
                    return Response.redirect(regularLoginRes.data.url, 303);
                }
            }

            const responseRedirectUrl = new URL('http://localhost:3000');
            responseRedirectUrl.searchParams.set(
                'error',
                error ?? 'Login Failed',
            );
            responseRedirectUrl.searchParams.set(
                'error_code',
                errorCode ?? '500',
            );
            responseRedirectUrl.searchParams.set(
                'error_description',
                errorDescription ?? 'Internal server error',
            );

            return Response.redirect(responseRedirectUrl.toString(), 303);
        }

        const supabase = getSupabaseServerClient();
        await supabase.auth.exchangeCodeForSession(code);

        console.log(
            'SUCESS, REDIRECT TO',
            `http://localhost:3000/${next.slice(1)}`,
        );
        return Response.redirect(`http://localhost:3000/${next.slice(1)}`, 303);
    },
});
