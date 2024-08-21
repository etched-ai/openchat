import { router } from '../../trpc';
import { generateResponse } from './generateResponse';
import { infiniteList } from './infiniteList';
import { send } from './send';

export const chatMessagesRouter = router({
    send,
    infiniteList,
    generateResponse,
});
