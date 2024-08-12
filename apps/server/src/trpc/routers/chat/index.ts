import { router } from '../../trpc';
import { sendMessage } from './sendMessage';

export const chatRouter = router({
    sendMessage,
});
