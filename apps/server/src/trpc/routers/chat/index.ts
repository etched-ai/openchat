import { router } from '@/trpc/trpc';
import { sendMessage } from './sendMessage';

export const chatRouter = router({
    sendMessage,
});
