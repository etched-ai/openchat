import type { Transaction } from '@libsql/client/.';
import type { UpsertChatArgs, UpsertChatMessageArgs } from '@preload/shared';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import db from '../../db';
import {
    getClient,
    getClientGroup,
    putClient,
    putClientGroup,
} from '../../utils/replicache';
import { upsertChat } from './upsertChat';
import { upsertChatMessage } from './upsertChatMessage';

const MutationSchema = z.object({
    id: z.number(),
    clientID: z.string(),
    name: z.string(),
    args: z.any(),
});
type Mutation = z.infer<typeof MutationSchema>;

const PushRequestSchema = z.object({
    clientGroupID: z.string(),
    mutations: z.array(MutationSchema),
});
export type Affected = {
    chatIDs: string[];
    chatMessageIDs: string[];
};

async function _handlePush(
    userID: string,
    requestBody: unknown,
): Promise<void> {
    console.log('PROCESSING PUSH:', JSON.stringify(requestBody, null, 2));

    const push = PushRequestSchema.parse(requestBody);

    const allAffected = {
        chatIDs: new Set<string>(),
    };

    for (const mutation of push.mutations) {
        try {
            const affected = await processMutation(
                userID,
                push.clientGroupID,
                mutation,
                false,
            );
            // Data object specific
            for (const chatID of affected.chatIDs) {
                allAffected.chatIDs.add(chatID);
            }
        } catch (e) {
            await processMutation(userID, push.clientGroupID, mutation, true);
        }
    }

    // Implement poke later
}

export async function handlePush(
    req: FastifyRequest,
    res: FastifyReply,
): Promise<void> {
    const user = req.requestContext.get('user');
    if (!user) {
        res.status(401).send('unauthorized');
        return;
    }
    try {
        const pushResult = await _handlePush(user.id, req.body);
        return pushResult;
    } catch (err) {
        console.error('[ERROR IN PUSH]:', err);
        res.status(500).send('Internal server error');
        return;
    }
}

async function processMutation(
    userID: string,
    clientGroupID: string,
    mutation: Mutation,
    // Allow one retry
    errorMode: boolean,
): Promise<Affected> {
    let affected: Affected = {
        chatIDs: [],
        chatMessageIDs: [],
    };

    const tx = await db.transaction('write');
    console.log(
        'PROCESSING MUTATION:',
        errorMode,
        JSON.stringify(mutation, null, 2),
    );

    // Check if user owns client group
    const clientGroup = await getClientGroup(tx, clientGroupID, userID);
    const baseClient = await getClient(tx, mutation.clientID, clientGroupID);

    const nextMutationID = baseClient.lastMutationID + 1;

    // rollback and skip if already processed
    if (mutation.id < nextMutationID) {
        console.log(`MUTATION ${mutation.id} ALREADY PROCESSED - SKIPPING`);
        await tx.commit();
        return affected;
    }

    // Rollback and error if in the future
    if (mutation.id > nextMutationID) {
        await tx.rollback();
        throw new Error(`MUTATION ${mutation.id} IS FROM THE FUTURE - ABORT`);
    }

    if (!errorMode) {
        try {
            affected = await mutate(tx, userID, mutation);
        } catch (e) {
            await tx.rollback();
            console.error(
                'Error executing mutation:',
                JSON.stringify(mutation),
                e,
            );
            throw e;
        }
    }

    const nextClient = {
        id: mutation.clientID,
        clientGroupID,
        lastMutationID: nextMutationID,
    };
    await putClientGroup(tx, clientGroup);
    await putClient(tx, nextClient);

    console.log('PROCESSED');
    await tx.commit();
    return affected;
}

// Business logic
async function mutate(
    tx: Transaction,
    userID: string,
    mutation: Mutation,
): Promise<Affected> {
    switch (mutation.name) {
        case 'upsertChat':
            return await upsertChat(
                tx,
                userID,
                mutation.args as UpsertChatArgs,
            );
        case 'upsertChatMessage':
            return await upsertChatMessage(
                tx,
                userID,
                mutation.args as UpsertChatMessageArgs,
            );
        default:
            return {
                chatIDs: [],
                chatMessageIDs: [],
            };
    }
}
