import type { AuthedContext } from '@/trpc/context';
import redis, { subscriptionChannels } from '@/utils/redis';
import { getPreviousChatMessages, upsertDBChatMessage } from '@/utils/sql';
import type { DBChatMessage } from '@repo/db';
import { ulid } from 'ulid';
import { z } from 'zod';
import { authedProcedure } from '../../trpc';

export const SendMessageSchema = z.object({
    message: z.string(),
    customSystemPrompt: z.string().optional(),
    chatID: z.string(),
});

export const sendMessage = authedProcedure
    .input(SendMessageSchema)
    .mutation(async ({ input, ctx }) => {
        const newUserMessage: DBChatMessage = await upsertDBChatMessage(
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
    ctx: AuthedContext,
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
        messageID = chunk.id;
        fullMessage += chunk.messageContent;
        console.log('GOT CHUNK', chunk);

        await upsertDBChatMessage(
            {
                ...chunk,
                messageContent: fullMessage,
            },
            ctx.dbPool,
        );
        console.log('UPSERTED');

        await redis.publish(
            subscriptionChannels.chatMessages(input.chatID),
            JSON.stringify({
                type: 'chunk',
                message: chunk,
            }),
        );
        console.log('PUBLISHED');
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

    await redis.publish(
        subscriptionChannels.chatMessages(input.chatID),
        JSON.stringify({
            type: 'completed',
            message: completedAssistantMessage,
        }),
    );
}
