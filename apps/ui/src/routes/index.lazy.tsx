import InputBox from '@/components/InputBox';
import { Button } from '@/components/ui/button';
import { trpc } from '@/lib/trpc';
import {
    createLazyFileRoute,
    useRouteContext,
    useRouter,
} from '@tanstack/react-router';
import { DateTime } from 'luxon';

export const Route = createLazyFileRoute('/')({
    component: Index,
});

function Index() {
    const router = useRouter();
    const context = useRouteContext({ from: '/' });

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

    const handleSubmit = async (text: string): Promise<void> => {
        const createChatResp = await trpc.chat.create.mutate();
        context.initialChatMessage = text;
        router.navigate({
            from: '/',
            to: '/c/$chatID',
            params: {
                chatID: createChatResp.id,
            },
        });
    };

    return (
        <div className="w-full h-full justify-center items-center flex flex-col p-2">
            <h1 className="text-4xl">Good {getGreeting()}, Colin :)</h1>
            <div className="rounded-md overflow-hidden flex w-[36rem] min-h-28 max-h-36 border-[0.5px] border-border border-opacity-30 mt-8">
                <InputBox
                    handleSubmit={handleSubmit}
                    placeholderText="How can Charlie help you today?"
                />
            </div>
            {(!context.session || context.session.user.is_anonymous) && (
                <Button className="w-72 mt-6">Log in with Google</Button>
            )}
        </div>
    );
}
