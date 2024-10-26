import { router } from '../../trpc';
import { create } from './create';
import { get } from './get';
import { infiniteList } from './infiniteList';
import { infiniteListMessages } from './infiniteListMessages';
import { listenNewMessages } from './listenNewMessages';
import { sendMessage } from './sendMessage';

export const chatRouter = router({
    get,
    create,
    infiniteList,
    infiniteListMessages,
    listenNewMessages,
    sendMessage,
});
