import { router } from '../../trpc';
import { create } from './create';
import { get } from './get';
import { infiniteList } from './infiniteList';

export const chatRouter = router({
    get,
    create,
    infiniteList,
});
