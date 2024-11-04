import InputBox from '@renderer/components/InputBox';
import {
    Alert,
    AlertDescription,
    AlertTitle,
} from '@renderer/components/ui/alert';
import { Button } from '@renderer/components/ui/button';
import {
    createChat,
    getDefaultSystemPrompt,
    sendChatMessage,
    updateChatPreview,
} from '@renderer/lib/ai';
import type { M } from '@renderer/lib/replicache/mutators';
import type { User } from '@supabase/supabase-js';
import { createFileRoute, useSearch } from '@tanstack/react-router';
import ProgramState, { OpenAIBackend } from 'enochian-js';
import { XCircle } from 'lucide-react';
import { DateTime } from 'luxon';
import { useEffect, useState } from 'react';
import type { ReadTransaction, Replicache } from 'replicache';
import { ulid } from 'ulid';
import { z } from 'zod';

const searchSchema = z.object({
    error: z.string().optional(),
    error_code: z.number().optional(),
    error_description: z.string().optional(),
});

export const Route = createFileRoute('/')({
    validateSearch: searchSchema,
    component: Index,
});

function maybeGetName(user: User | null | undefined): null | string {
    if (!user) return null;
    const name =
        user.identities?.[0]?.identity_data?.full_name ||
        user.identities?.[0]?.identity_data?.full_name;
    if (!name) return null;
    const nameParts = name.split(' ');
    if (nameParts.length === 1) {
        return nameParts[0];
    }
    return nameParts.slice(0, -1).join(' ');
}

const getGreeting = () => {
    const hour = DateTime.local().hour;
    if (hour < 12) {
        return 'morning';
    } else if (hour < 18) {
        return 'afternoon';
    } else {
        return 'evening';
    }
};

function Index() {
    const { session, replicache } = Route.useRouteContext();
    const navigate = Route.useNavigate();

    const name = maybeGetName(session?.user);

    const handleSubmit = async (message: string): Promise<void> => {
        if (!replicache || !session?.user.id) return;
        const newChat = await createChat(replicache, session.user.id);
        sendChatMessage(
            replicache,
            session.user.id,
            newChat.id,
            [],
            message,
        ).then(() => updateChatPreview(replicache, newChat.id));
        navigate({ to: '/c/$chatID', params: { chatID: newChat.id } });
    };

    const handleLogin = async () => {};

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <ErrorAlert />
            <h1 className="text-4xl">
                Good {getGreeting()}
                {name != null ? `, ${name}` : ''} :)
            </h1>
            <div className="rounded-md overflow-hidden flex w-[36rem] min-h-28 max-h-36 border-[0.5px] border-border border-opacity-30 mt-8">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="How can Charlie help you today?"
                />
            </div>
            {(!session?.user || session?.user.is_anonymous) && (
                <Button onClick={handleLogin} className="w-72 mt-6">
                    Log in with Google
                </Button>
            )}
        </div>
    );
}

function ErrorAlert() {
    const search = useSearch({
        from: '/',
    });
    const [showAlert, setShowAlert] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout | undefined;
        if (search.error) {
            setShowAlert(true);
            // Auto-hide the alert after 5 seconds
            timer = setTimeout(() => setShowAlert(false), 5000);
        }
        return () => {
            if (timer) clearTimeout(timer);
        };
    }, [search.error]);

    if (!search.error) return null;

    let { error, error_code, error_description } = search;
    error_description = error_description?.replace(/\+/g, ' ');

    let title = `Error ${error_code}: ${error}`;
    let description = error_description;

    // We should be reshaping known errors to better error messages
    if (
        error_code === 422 &&
        error_description === 'Identity is already linked to another user'
    ) {
        title = 'Error!';
        description = 'User already existings. Logging in...';
    }

    return (
        <div
            className={`fixed top-0 left-0 right-0 z-50 mx-auto max-w-md p-4 transition-all duration-300 ease-in-out ${showAlert ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}
        >
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>{title}</AlertTitle>
                <AlertDescription>{description}</AlertDescription>
            </Alert>
        </div>
    );
}
