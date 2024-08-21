// This procedure generates a response to a given user message. It will overwrite any
// currently generating response.

import { type DBChatMessage, DBChatMessageSchema } from '@repo/db';
import { type DatabasePool, sql } from 'slonik';
import { z } from 'zod';
import { publicProcedure } from '../../trpc';
import { updateDBChatMessage, upsertDBChatMessage } from './send';

export const GenerateResponseSchema = z.object({
    messageID: z.string().ulid(),
});
type GenerateResponseOutput =
    | {
          type: 'userMessage';
          message: DBChatMessage;
      }
    | {
          type: 'messageChunk';
          messageChunk: DBChatMessage;
      }
    | {
          type: 'completeMessage';
          message: DBChatMessage;
      };

export const generateResponse = publicProcedure
    .input(GenerateResponseSchema)
    .mutation(async function* ({
        input,
        ctx,
    }): AsyncGenerator<GenerateResponseOutput> {
        // First update the chatMessage back to streaming. Will handle potential cancellations later
        let chatMessage = await getDBChatMessage(input.messageID, ctx.dbPool);
        chatMessage = await updateDBChatMessage(
            {
                messageID: chatMessage.id,
                responseStatus: 'streaming',
            },
            ctx.dbPool,
        );
        yield {
            type: 'userMessage',
            message: chatMessage,
        };

        let messageID = chatMessage.responseMessageID;
        const chatIterator = ctx.chatService.generateResponse({
            userID: ctx.user.id,
            chatID: chatMessage.chatID,
            message: chatMessage.messageContent,
            messageID,
            // TODO
            previousMessages: [],
            customSystemPrompt: undefined,
        });

        let fullMessage = '';
        for await (const chunk of chatIterator) {
            // While the message is in the process of generating, we do not do database updates to it.
            // No point slowing it down. If the user cancels the request in the middle it'll still be
            // there locally so they can edit it. If they refresh the page its fine for a half-complete
            // generation to just disappear as if it never happened.
            yield {
                type: 'messageChunk',
                messageChunk: chunk,
            };
            messageID = chunk.id;
            fullMessage += chunk.messageContent;
        }

        const completedAssistantMessage = await upsertDBChatMessage(
            {
                id: messageID as string, // It is guaranteed to be a string TS is tripping
                userID: ctx.user.id,
                chatID: chatMessage.chatID,
                messageType: 'assistant',
                messageContent: fullMessage,
            },
            ctx.dbPool,
        );
        yield {
            type: 'completeMessage',
            message: completedAssistantMessage,
        };

        await updateDBChatMessage(
            {
                messageID: chatMessage.id,
                responseStatus: 'done',
                responseMessageID: messageID,
            },
            ctx.dbPool,
        );
    });

async function getDBChatMessage(
    messageID: string,
    pool: DatabasePool,
): Promise<DBChatMessage> {
    try {
        return await pool.one(sql.type(DBChatMessageSchema)`
            SELECT * FROM "ChatMessage"
            WHERE id = ${messageID}
        `);
    } catch (e) {
        console.error(e);
        throw e;
    }
}
