import { router } from '../../trpc';
import { createChat } from './createChat';
import { sendMessage } from './sendMessage';

export const chatRouter = router({
    sendMessage,
    createChat,
});
