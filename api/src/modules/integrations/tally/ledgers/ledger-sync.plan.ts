import { normalizeLedgerName } from "./ledger-name";

export interface IncomingLedger {
    name: string;
    parent: string | null;
    guid: string | null;
}

export interface ExistingLedger {
    id: number;
    name: string;
    nameNormalized: string;
    parent: string | null;
    guid: string | null;
    isActive: boolean;
}

export interface LedgerUpdate {
    id: number;
    name: string;
    nameNormalized: string;
    parent: string | null;
    guid: string | null;
}

export interface LedgerSyncConflict {
    name: string;
    reason: string;
}

export interface LedgerSyncPlan {
    inserts: IncomingLedger[];
    updates: LedgerUpdate[];
    deactivateIds: number[];
    conflicts: LedgerSyncConflict[];
}

export function planLedgerSync(existing: ExistingLedger[], incoming: IncomingLedger[]): LedgerSyncPlan {
    const byGuid = new Map<string, ExistingLedger>();
    const byName = new Map<string, ExistingLedger>();

    for (const row of existing) {
        if (row.guid) {
            byGuid.set(row.guid, row);
        }

        byName.set(row.nameNormalized, row);
    }

    const used = new Set<number>();
    const claimedNames = new Set<string>();
    const inserts: IncomingLedger[] = [];
    const updates: LedgerUpdate[] = [];
    const conflicts: LedgerSyncConflict[] = [];

    for (const item of incoming) {
        const normalized = normalizeLedgerName(item.name);
        const canonicalName = item.name.trim();

        if (!normalized) {
            conflicts.push({ name: item.name, reason: "name is empty" });
            continue;
        }

        if (claimedNames.has(normalized)) {
            conflicts.push({ name: canonicalName, reason: "duplicate name in the Tally export" });
            continue;
        }

        claimedNames.add(normalized);

        const match = (item.guid ? byGuid.get(item.guid) : undefined) ?? byName.get(normalized);

        if (!match) {
            inserts.push({ name: canonicalName, parent: item.parent, guid: item.guid });
            continue;
        }

        if (used.has(match.id)) {
            conflicts.push({ name: canonicalName, reason: `already matched to ledger #${match.id}` });
            continue;
        }

        if (match.guid && item.guid && match.guid !== item.guid) {
            conflicts.push({ name: canonicalName, reason: `GUID differs from stored ledger #${match.id}` });
            continue;
        }

        if (match.nameNormalized !== normalized) {
            const owner = byName.get(normalized);

            if (owner && owner.id !== match.id) {
                conflicts.push({ name: canonicalName, reason: `renamed name collides with ledger #${owner.id}` });
                continue;
            }
        }

        used.add(match.id);
        updates.push({
            id: match.id,
            name: canonicalName,
            nameNormalized: normalized,
            parent: item.parent,
            guid: item.guid ?? match.guid,
        });
    }

    return {
        inserts,
        updates,
        deactivateIds: existing.filter(row => !used.has(row.id)).map(row => row.id),
        conflicts,
    };
}
