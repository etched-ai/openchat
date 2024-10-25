import { trpc } from '@/lib/api';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
    loader: async ({ context }) => {
        const queryClient = context.queryClient;
    },
    component: Home,
});

function Home() {
    return (
        <div className="p-2 text-2xl">
            <h3>Welcome Home!!!</h3>
        </div>
    );
}
