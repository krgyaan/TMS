import { buildCollectionExportRequest, escapeXml, type TallyStaticVariables } from "./xml-builder";

export type MasterKind = "group" | "ledger" | "costCentre";

export const MASTER_TALLY_TAGS: Record<MasterKind, string> = {
    group: "GROUP",
    ledger: "LEDGER",
    costCentre: "COSTCENTRE",
};

export interface MasterDefinition {
    kind: MasterKind;
    name: string;
    parent?: string;
}

/**
 * Builds a single master create fragment. Names must already be normalised by
 * the caller (see masters/name.util.ts); this function only escapes them.
 */
export function buildMasterMessage(definition: MasterDefinition): string {
    const tag = MASTER_TALLY_TAGS[definition.kind];

    if (!tag) {
        throw new Error(`Unsupported master kind: ${String(definition.kind)}`);
    }

    const name = String(definition.name ?? "").trim();

    if (!name) {
        throw new Error(`${definition.kind} name must not be empty`);
    }

    const parent = definition.parent?.trim();

    const parentXml = parent ? `<PARENT>${escapeXml(parent)}</PARENT>` : "";

    return `<${tag} NAME="${escapeXml(name)}" ACTION="Create"><NAME>${escapeXml(name)}</NAME>${parentXml}</${tag}>`;
}

/** Collection export request that lists masters of the given kind. */
export function buildMasterCollectionRequest(kind: MasterKind, variables?: TallyStaticVariables): string {
    const tag = MASTER_TALLY_TAGS[kind];

    if (!tag) {
        throw new Error(`Unsupported master kind: ${String(kind)}`);
    }

    return buildCollectionExportRequest({
        collectionName: `TMS ${tag} list`,
        objectType: tag,
        nativeMethods: ["Name", "Parent"],
        variables,
    });
}
