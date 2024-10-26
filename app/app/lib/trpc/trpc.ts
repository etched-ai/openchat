import { TRPCError, initTRPC } from '@trpc/server';
import type { Context } from './context';

/**
 * Initialization of tRPC backend
 * Should be done only once per backend!
 */
const t = initTRPC.context<Context>().create();

/**
 * Export reusable router and procedure helpers
 * that can be used throughout the router
 */
export const router = t.router;
export const publicProcedure = t.procedure;
// export const authedProcedure = t.procedure.use(async ({ ctx, next }) => {
//     const user = ctx.req.requestContext.get('user');
//     if (!user) {
//         throw new TRPCError({ code: 'UNAUTHORIZED' });
//     }

//     return next({
//         ctx: {
//             ...ctx,
//             user,
//         },
//     });
// });
