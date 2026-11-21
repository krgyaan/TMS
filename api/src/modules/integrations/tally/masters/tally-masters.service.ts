import { Injectable } from "@nestjs/common";
import { TallyLineError, TallyMasterConflict, TallyUnknownOutcome, TallyValidationError } from "../errors/tally.errors";
import { buildMasterMessage, MASTER_TALLY_TAGS, type MasterDefinition, type MasterKind } from "../xml/master-xml.builder";
import type { TallyMasterRecord } from "../xml/response-parser";
import { TallyClient } from "../client/tally.client";
import { namesEqual, normalizeMasterName } from "./name.util";

export type EnsureResult = "created" | "exists";

/**
 * Idempotent master operations. Every write checks existence first, and a
 * write with an unknown outcome is verified by reading back before anything is
 * reported as successful.
 */
@Injectable()
export class TallyMastersService {
    constructor(private readonly client: TallyClient) {}

    async exists(kind: MasterKind, name: string): Promise<boolean> {
        return (await this.get(kind, name)) !== null;
    }

    async get(kind: MasterKind, name: string): Promise<TallyMasterRecord | null> {
        const target = this.requireName(kind, name);
        const records = await this.client.exportMasters(kind);

        return records.find(record => namesEqual(record.name, target)) ?? null;
    }

    async list(kind: MasterKind): Promise<TallyMasterRecord[]> {
        this.assertKind(kind);

        return this.client.exportMasters(kind);
    }

    async ensure(kind: MasterKind, definition: Omit<MasterDefinition, "kind">): Promise<EnsureResult> {
        this.assertKind(kind);

        const name = this.requireName(kind, definition.name);
        const parent = normalizeMasterName(definition.parent ?? "");

        if (!parent) {
            throw new TallyValidationError(`${MASTER_TALLY_TAGS[kind]} "${name}" requires a parent`);
        }

        const existing = await this.get(kind, name);

        if (existing) {
            this.assertParent(kind, name, parent, existing.parent);

            return "exists";
        }

        try {
            await this.client.importMasters([buildMasterMessage({ kind, name, parent })], {
                treatAlreadyExistsAsSuccess: true,
            });
        } catch (error) {
            if (!(error instanceof TallyUnknownOutcome)) {
                throw error;
            }

            const afterUnknownOutcome = await this.get(kind, name);

            if (!afterUnknownOutcome) {
                throw error;
            }

            this.assertParent(kind, name, parent, afterUnknownOutcome.parent);

            return "created";
        }

        const afterCreate = await this.get(kind, name);

        if (!afterCreate) {
            throw new TallyLineError(`Tally accepted the ${MASTER_TALLY_TAGS[kind]} "${name}" request but it could not be read back`);
        }

        this.assertParent(kind, name, parent, afterCreate.parent);

        return "created";
    }

    private assertKind(kind: MasterKind): void {
        if (!MASTER_TALLY_TAGS[kind]) {
            throw new TallyValidationError(`Unsupported master kind: ${String(kind)}`);
        }
    }

    private requireName(kind: MasterKind, name: string): string {
        this.assertKind(kind);

        const normalized = normalizeMasterName(name);

        if (!normalized) {
            throw new TallyValidationError(`${MASTER_TALLY_TAGS[kind]} name must not be empty`);
        }

        return normalized;
    }

    private assertParent(kind: MasterKind, name: string, expected: string, actual: string | null): void {
        if (actual && !namesEqual(actual, expected)) {
            throw new TallyMasterConflict(`${MASTER_TALLY_TAGS[kind]} "${name}" already exists under "${actual}", not "${expected}"`);
        }
    }
}
