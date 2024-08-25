import { router } from '../../trpc';
import { infiniteList } from './infiniteList';
import { send } from './send';

export const chatMessagesRouter = router({
    send,
    infiniteList,
});
