import { Replicache } from 'replicache';
import { supabase } from '../supabase.js';
import { type M, mutators } from './mutators/index.js';

const licenseKey = import.meta.env.VITE_REPLICACHE_LICENSE_KEY;
if (!licenseKey) {
    throw new Error('Missing VITE_REPLICACHE_LICENSE_KEY');
}

type Params = {
    name: string;
    auth?: string;
    DEBUG_MODE?: boolean;
};

const BASE_URL = 'http://localhost:8543';

export const getReplicache = (params: Params): Replicache<M> => {
    const rep = new Replicache<M>({
        name: params.name,
        licenseKey,
        mutators,
        pushURL: `${BASE_URL}/replicache/push`,
        pullURL: `${BASE_URL}/replicache/pull`,
        logLevel: params.DEBUG_MODE ? 'debug' : 'error',
        schemaVersion: 'v1',
        auth: params.auth,
        indexes: {
            chatID: {
                prefix: 'chatMessage/',
                jsonPointer: '/chatID',
            },
        },
    });
    // TODO: https://lucia-auth.com/sessions/basic-api/sqlite
    rep.getAuth = async () => {
        for (let i = 0; i < 3; i++) {
            const { data, error } = await supabase.auth.refreshSession();
            if (error) {
                console.error('[REFRESH AUTH ERROR]:', error);
                continue;
            }
            if (!data.session) {
                console.error('[NO ACCESS TOKEN]');
                continue;
            }
            return data.session?.access_token;
        }
        console.error('[FAILED TO REVALIDATE]');
        supabase.auth.signOut();

        return null;
    };
    return rep;
};
