import { publicProcedure, router } from '../../trpc';

export const chatRouter = router({
    test: publicProcedure.query(({ ctx }) => {
        return {
            test: 'HI',
        };
    }),
});
