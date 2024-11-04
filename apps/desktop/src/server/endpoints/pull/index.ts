import type { FastifyReply, FastifyRequest } from 'fastify';
import type { PatchOperation, PullResponse } from 'replicache';
import { ulid } from 'ulid';
import { z } from 'zod';
import db, { type DBReplicacheClientGroup } from '../../db.js';
import {
    getAllChatMessagesByID,
    getAllChatsByID,
    searchChatMessages,
    searchChats,
} from '../../utils/dbQueries.js';
import {
    type CVR,
    type CVREntries,
    cvrEntriesFromSearch,
    diffCVR,
    getCVRFromCache,
    getClientGroup,
    isCVRDiffEmpty,
    putClientGroup,
    searchClients,
    upsertCVRInCache,
} from '../../utils/replicache';

const CookieSchema = z.object({
    order: z.number(),
    cvrID: z.string(),
});
type Cookie = z.infer<typeof CookieSchema>;
const PullRequestSchema = z.object({
    clientGroupID: z.string(),
    cookie: z.union([CookieSchema, z.null()]),
});
type PullRequest = z.infer<typeof PullRequestSchema>;

type Entity = {
    id: string;
    [key: string]: unknown;
};

type CVRTx = {
    entities: Record<
        string,
        { dels: Array<string>; puts: Readonly<Array<Entity>> }
    >;
    clients: CVREntries;
    nextCVR: CVR;
    nextCVRVersion: number;
} | null;

export async function _handlePull(
    userID: string,
    requestBody: PullRequest,
): Promise<PullResponse> {
    console.log('Processing pull:', JSON.stringify(requestBody));
    const pull = PullRequestSchema.parse(requestBody);

    // Fetch CVR
    const { clientGroupID } = pull;
    console.log('GETTING CVR FOR', pull.cookie?.cvrID);
    const prevCVR = getCVRFromCache(pull.cookie?.cvrID);
    // Base CVR is just prev CVR or nothing
    const baseCVR = prevCVR ?? {};
    console.log('CVR COMPARE', [prevCVR, baseCVR]);

    let txRes: CVRTx | null = null;
    // 3 Retries
    for (let i = 0; i < 3; i++) {
        try {
            const tx = await db.transaction('deferred');
            const baseClientGroupRecord = await getClientGroup(
                tx,
                clientGroupID,
                userID,
            );

            const userChatSearch = await searchChats(tx);
            const userChatMessagesSearch = await searchChatMessages(tx);
            const clientMeta = await searchClients(tx, clientGroupID);

            console.log('GOT SEARCH RESULTS:', {
                baseClientGroupRecord,
                clientMeta,
                userChatSearch,
                userChatMessagesSearch,
            });

            // Build next CVR
            const nextCVR: CVR = {
                chat: cvrEntriesFromSearch(userChatSearch),
                chatMessage: cvrEntriesFromSearch(userChatMessagesSearch),
                client: cvrEntriesFromSearch(clientMeta),
            };
            console.log('NEXT CVR:', nextCVR);

            // Diff prev and next CVR
            const diff = diffCVR(baseCVR, nextCVR);
            console.log('DIFF:', diff);

            if (prevCVR && isCVRDiffEmpty(diff)) {
                console.log('NOTHING TO DO');
                await tx.commit();
                break;
            }

            // Get actual entities that should be updated
            const newChats = await getAllChatsByID(tx, {
                IDs: diff.chat.puts,
            });
            const newChatMessages = await getAllChatMessagesByID(tx, {
                IDs: diff.chatMessage.puts,
            });
            console.log('CHAT MESSAGES', newChatMessages);

            // Get list of clients that are changed
            const clients: CVREntries = {};
            for (const clientID of diff.client.puts) {
                clients[clientID] = nextCVR.client[clientID];
            }
            console.log('CLIENTS TO CHANGE:', clients);

            // New CVRVersion
            const baseCVRVersion = pull.cookie?.order ?? 0;
            const nextCVRVersion =
                Math.max(baseCVRVersion, baseClientGroupRecord.cvrVersion) + 1;

            // Create a new ClientGroupRecord
            const nextClientGroupRecord: Omit<
                DBReplicacheClientGroup,
                'createdAt'
            > = {
                ...baseClientGroupRecord,
                cvrVersion: nextCVRVersion,
            };
            console.log(nextClientGroupRecord);
            await putClientGroup(tx, nextClientGroupRecord);

            await tx.commit();
            txRes = {
                entities: {
                    chat: {
                        dels: diff.chat.dels,
                        puts: newChats,
                    },
                    chatMessage: {
                        dels: diff.chatMessage.dels,
                        puts: newChatMessages,
                    },
                },
                clients,
                nextCVR,
                nextCVRVersion,
            };
            break;
        } catch (error) {
            console.error(error);
        }
    }

    // If diff is empty then return no-op pull response
    if (txRes == null) {
        return {
            cookie: pull.cookie,
            lastMutationIDChanges: {},
            patch: [],
        };
    }

    const { entities, clients, nextCVR, nextCVRVersion } = txRes;

    const cvrID = ulid();
    upsertCVRInCache(cvrID, nextCVR);

    const patch: PatchOperation[] = [];
    if (prevCVR === undefined) {
        // If there was no prev cvr then do a full sync
        patch.push({ op: 'clear' });
    }

    console.log('ENTITIES', JSON.stringify(entities, null, 2));
    for (const [name, { puts, dels }] of Object.entries(entities)) {
        for (const id of dels) {
            patch.push({
                op: 'del',
                key: `${name}/${id}`,
            });
        }
        for (const entity of puts) {
            patch.push({
                op: 'put',
                key: `${name}/${entity.id}`,
                // @ts-expect-error I disagree with their type
                value: entity,
            });
        }
    }

    const cookie: Cookie = {
        order: nextCVRVersion,
        cvrID,
    };

    const lastMutationIDChanges = clients;

    console.log('DONE PULL', cookie, lastMutationIDChanges, patch);
    return {
        cookie,
        lastMutationIDChanges,
        patch,
    };
}

export async function handlePull(req: FastifyRequest, res: FastifyReply) {
    const user = req.requestContext.get('user');
    if (!user) {
        res.status(401).send('Unauthorized');
        return;
    }
    try {
        const pullResult = await _handlePull(user.id, req.body as PullRequest);
        return pullResult;
    } catch (err) {
        console.error('[ERROR IN PULL]:', err);
        res.status(500).send('Internal server error');
        return;
    }
}
