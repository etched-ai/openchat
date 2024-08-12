import type { DBChat } from '@repo/db';
import { DateTime } from 'luxon';
import { ulid } from 'ulid';
import { publicProcedure } from '../../trpc';

export const createChat = publicProcedure.mutation(async ({ ctx }) => {
    const newChat: DBChat = {
        id: ulid(),
        userID: ctx.user.id,
        previewName: '',
        createdAt: DateTime.now().toJSDate(),
        updatedAt: DateTime.now().toJSDate(),
    };
    return newChat;
});
