import type { WriteTransaction } from 'replicache';

export type M = typeof mutators;

export const mutators = {
    test: async (tx: WriteTransaction, _args: unknown) => {
        await tx.set('test', 'hello world');
    },
};
