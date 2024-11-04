import type { Transaction } from '@libsql/client/.';
import type { Client as DBClient } from '@libsql/client/.';
import { z } from 'zod';
import type { DBReplicacheClient, DBReplicacheClientGroup } from '../db.js';

// Used for replicache diffing
export const SearchResultSchema = z.object({
    id: z.string(),
    rowversion: z.number().int().nonnegative(),
});
export type SearchResult = z.infer<typeof SearchResultSchema>;

// Map of item type to CVR entry
export type CVR = Record<string, CVREntries>;
// Map of item id to stored version number
export type CVREntries = Record<string, number>;

const cvrCache = new Map<string, CVR>();

export function getCVRFromCache(cvrId: string | undefined): CVR | undefined {
    if (cvrId === undefined) {
        return undefined;
    }
    const cvr = cvrCache.get(cvrId);
    return cvr;
}
export function upsertCVRInCache(id: string, cvr: CVR): void {
    cvrCache.set(id, cvr);
}

export function cvrEntriesFromSearch(result: SearchResult[]) {
    const r: CVREntries = {};
    for (const row of result) {
        r[row.id] = row.rowversion;
    }
    return r;
}

export type CVRDiff = Record<string, CVREntryDiff>;
export type CVREntryDiff = {
    puts: string[];
    dels: string[];
};

export function diffCVR(prev: CVR, next: CVR) {
    const r: CVRDiff = {};
    const names = [...new Set([...Object.keys(prev), ...Object.keys(next)])];
    for (const name of names) {
        const prevEntries = prev[name] ?? {};
        const nextEntries = next[name] ?? {};
        r[name] = {
            // If the next entry doesn't exist or the version was updated
            puts: Object.keys(nextEntries).filter(
                (id) =>
                    prevEntries[id] === undefined ||
                    prevEntries[id] < nextEntries[id],
            ),
            // If the previous entry no longer exists
            dels: Object.keys(prevEntries).filter(
                (id) => nextEntries[id] === undefined,
            ),
        };
    }
    return r;
}

export function isCVRDiffEmpty(diff: CVRDiff) {
    return Object.values(diff).every(
        (e) => e.puts.length === 0 && e.dels.length === 0,
    );
}

type ClientGroup = Omit<DBReplicacheClientGroup, 'createdAt'>;
export async function getClientGroup(
    tx: Transaction,
    clientGroupID: string,
    userID: string,
): Promise<ClientGroup> {
    const result = await tx.execute({
        sql: `
            SELECT
                id,
                userID as userID,
                cvrVersion as cvrVersion
            FROM ReplicacheClientGroup
            WHERE id = ?
        `,
        args: [clientGroupID],
    });

    // If no result found, return default client group
    if (result.rows.length === 0) {
        return {
            id: clientGroupID,
            userID,
            cvrVersion: 0,
        };
    }

    const clientGroup = {
        id: result.rows[0].id as string,
        userID: result.rows[0].userID as string,
        cvrVersion: result.rows[0].cvrVersion as number,
    };

    // Check authorization
    if (clientGroup.userID !== userID) {
        throw new Error('Authorization error');
    }

    return clientGroup;
}
export async function putClientGroup(
    tx: Transaction | DBClient,
    clientGroup: ClientGroup,
): Promise<void> {
    await tx.execute({
        sql: `
            INSERT INTO ReplicacheClientGroup (
                id,
                userID,
                cvrVersion,
                createdAt
            ) VALUES (
                ?,
                ?,
                ?,
                datetime('now')
            )
            ON CONFLICT(id) DO UPDATE SET
                userID = excluded.userID,
                cvrVersion = excluded.cvrVersion
        `,
        args: [clientGroup.id, clientGroup.userID, clientGroup.cvrVersion],
    });
}
export async function searchClients(
    tx: Transaction,
    clientGroupID: string,
): Promise<Array<SearchResult>> {
    const result = await tx.execute({
        sql: `
            SELECT
                id,
                lastMutationID as rowversion
            FROM ReplicacheClient
            WHERE clientGroupID = ?
        `,
        args: [clientGroupID],
    });

    return result.rows.map((row) => ({
        id: row.id as string,
        rowversion: row.rowversion as number,
    }));
}
type Client = Omit<DBReplicacheClient, 'createdAt'>;

export async function getClient(
    tx: Transaction,
    clientID: string,
    clientGroupID: string,
): Promise<Client> {
    const result = await tx.execute({
        sql: `
            SELECT
                id,
                clientGroupID as clientGroupID,
                lastMutationID as lastMutationID
            FROM ReplicacheClient
            WHERE id = ?
        `,
        args: [clientID],
    });

    // If no client found, return default client
    if (result.rows.length === 0) {
        return {
            id: clientID,
            clientGroupID: '',
            lastMutationID: 0,
        };
    }

    const client = {
        id: result.rows[0].id as string,
        clientGroupID: result.rows[0].clientGroupID as string,
        lastMutationID: result.rows[0].lastMutationID as number,
    };

    // Verify client belongs to the correct group
    if (client.clientGroupID !== clientGroupID) {
        throw new Error('Client group must own client');
    }

    return client;
}
export async function putClient(
    tx: Transaction,
    client: Client,
): Promise<void> {
    await tx.execute({
        sql: `
            INSERT INTO ReplicacheClient (
                id,
                clientGroupID,
                lastMutationID,
                createdAt
            ) VALUES (
                ?,
                ?,
                ?,
                datetime('now')
            )
            ON CONFLICT(id) DO UPDATE SET
                clientGroupID = excluded.clientGroupID,
                lastMutationID = excluded.lastMutationID
        `,
        args: [client.id, client.clientGroupID, client.lastMutationID],
    });
}
