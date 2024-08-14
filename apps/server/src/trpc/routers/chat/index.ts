import { router } from '../../trpc';
import { create } from './create';
import { get } from './get';

export const chatRouter = router({
    get,
    create,
});
