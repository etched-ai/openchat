import type { Context } from '@/trpc/context';
import { getPreviousChatMessages, upsertDBChatMessage } from '@/utils/sql';
import { ulid } from 'ulid';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';

export const SendMessageSchema = z.object({
    message: z.string(),
    customSystemPrompt: z.string().optional(),
    chatID: z.string(),
});

export const send = publicProcedure
    .input(SendMessageSchema)
    .mutation(async ({ input, ctx }) => {
        const newUserMessage = await upsertDBChatMessage(
            {
                id: ulid(),
                userID: ctx.user.id,
                chatID: input.chatID,
                messageType: 'user',
                messageContent: input.message,
                status: 'done',
            },
            ctx.dbPool,
        );

        generateAssistantMessage(input, ctx).catch((e) =>
            console.error(
                '[ERROR] Failed to generate assistant message in send:',
                e,
            ),
        );

        return newUserMessage;
    });

export async function generateAssistantMessage(
    input: z.infer<typeof SendMessageSchema>,
    ctx: Context,
) {
    let messageID = ulid();

    const previousMessages = await getPreviousChatMessages(
        { chatID: input.chatID },
        ctx.dbPool,
    );

    const chatIterator = ctx.chatService.generateResponse({
        userID: ctx.user.id,
        chatID: input.chatID,
        message: input.message,
        messageID,
        previousMessages: previousMessages.slice(1),
        customSystemPrompt: input.customSystemPrompt,
    });

    let fullMessage = '';
    for await (const chunk of chatIterator) {
        // While the message is in the process of generating, we do not do database updates to it.
        // No point slowing it down. If the user cancels the request in the middle it'll still be
        // there locally so they can edit it. If they refresh the page its fine for a half-complete
        // generation to just disappear as if it never happened.
        messageID = chunk.id;
        fullMessage += chunk.messageContent;
    }

    const completedAssistantMessage = await upsertDBChatMessage(
        {
            id: messageID,
            userID: ctx.user.id,
            chatID: input.chatID,
            messageType: 'assistant',
            messageContent: fullMessage,
            status: 'done',
        },
        ctx.dbPool,
    );
}
