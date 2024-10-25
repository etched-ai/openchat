import { trpc } from '@/utils/api';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    loader: async () => {
        const res = await trpc.chat.test.query();
        console.log(res);
    },
    component: Home,
});

function Home() {
    return (
        <div className="p-2">
            <h3>Welcome Home!!!</h3>
        </div>
    );
}
