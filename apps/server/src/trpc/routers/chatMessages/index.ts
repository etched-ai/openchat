import { router } from '../../trpc';
import { send } from './send';

export const chatMessagesRouter = router({
    send,
});
