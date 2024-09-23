import { queryClient } from '@/lib/reactQuery';
import { queryOptions } from '@tanstack/react-query';
import { createFileRoute, redirect } from '@tanstack/react-router';
import { z } from 'zod';

function authQueryOptions(code: string, next: string) {
    return queryOptions({
        queryKey: ['auth/callback', code, next],
        queryFn: async () => {
            const url = new URL('http://localhost:8000/auth/callback');
            url.searchParams.append('code', code);
            url.searchParams.append('next', next);

            const response = await fetch(url.toString(), {
                method: 'GET', // Changed to GET since we're using query parameters
                credentials: 'include', // Important for sending/receiving cookies
            });

            if (!response.ok) {
                throw new Error('Auth failed');
            }

            return response.json();
        },
        retry: false,
        staleTime: 120000,
    });
}

const searchSchema = z.object({
    code: z.string(),
    next: z.string().optional(),
});
export const Route = createFileRoute('/auth/callback')({
    validateSearch: searchSchema,
    async beforeLoad(ctx) {
        try {
            const resp = await queryClient.fetchQuery(
                authQueryOptions(ctx.search.code, ctx.search.next ?? '/'),
            );
            if (resp && !resp.error) {
                throw redirect({
                    to: ctx.search.next,
                });
            } else {
                console.error('[ERROR] Auth:', resp);
                throw redirect({
                    to: '/',
                    search: { error: resp.error || 'Authentication failed' },
                });
            }
        } catch (e) {
            console.error('[ERROR] Auth route:', e);
            throw redirect({
                to: '/',
                search: { error: 'Authentication failed' },
            });
        }
    },
    component: () => {
        return <div>Authenticating...</div>;
    },
});
