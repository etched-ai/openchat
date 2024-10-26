import { createAPIFileRoute } from '@tanstack/start/api';

import { getSupabaseServerClient } from '@/lib/server/supabase';

export const Route = createAPIFileRoute('/api/auth/logout')({
    GET: async () => {
        const supabase = getSupabaseServerClient();
        await supabase.auth.signOut();

        return Response.redirect('http://localhost:3000');
    },
});
