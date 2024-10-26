import { getSupabaseServerClient } from '@/lib/supabase';
import { createAPIFileRoute } from '@tanstack/start/api';

export const Route = createAPIFileRoute('/api/auth/logout')({
    GET: async () => {
        const supabase = getSupabaseServerClient();
        await supabase.auth.signOut();

        return Response.redirect('http://localhost:3000');
    },
});
