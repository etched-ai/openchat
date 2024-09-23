import { supabase } from '@/utils/supabase';
import type { FastifyInstance } from 'fastify';

export const authCallbackHandler = async (fastify: FastifyInstance) => {
    fastify.get('/auth/callback', async (request, reply) => {
        const query = request.query as { code: string; next?: string };
        const code = query.code;
        const next = query.next ?? '/';

        if (!code) {
            reply.status(400).send({ ok: false });
            return;
        }

        try {
            // Exchange the code for a session
            const { data, error } =
                await supabase.auth.exchangeCodeForSession(code);

            if (error) {
                reply.status(401).send({ ok: false });
                return;
            }

            // Set the session in a secure HTTP-only cookie
            reply.setCookie('auth_token', data.session.access_token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: data.session.expires_in,
                path: '/',
            });

            // Redirect to the root endpoint
            return reply.redirect(`/${next.slice(1)}`);
        } catch (error) {
            console.error('[ERROR] Auth callback:', error);
            reply.status(500).send({ ok: false });
        }
    });
};
