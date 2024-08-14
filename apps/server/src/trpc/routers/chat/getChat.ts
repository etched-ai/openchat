import type { DBChat } from '@repo/db';
import { DateTime } from 'luxon';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const getChat = publicProcedure
    .input(z.object({ id: z.string().ulid() }))
    .query(async ({ input, ctx }) => {});
