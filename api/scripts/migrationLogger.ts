import * as fs from "fs";
import * as path from "path";

export type WriteAction = "insert" | "update";
export type TableName = "vendor_organizations" | "vendors" | "vendor_gsts";

export interface ManifestEntry {
    table: TableName;
    action: WriteAction;
    id: number;
    /** Full previous row - only present for "update", used to restore the row on rollback. */
    before?: Record<string, unknown>;
    /**
     * The updatedAt value we set at write time (ISO string), re-checked at
     * rollback time so we never clobber a row someone else has touched since.
     */
    checkUpdatedAt: string | null;
}

/**
 * Writes two files per run into `outDir`:
 *  - `<label>-<runId>.log.txt`        human-readable, one line per DB write (what you asked for)
 *  - `<label>-<runId>.manifest.ndjson` one JSON object per line, consumed by rollback-vendor-master.ts
 *
 * Both are appended to synchronously as the migration runs, so even if the
 * process crashes partway through, everything written so far is still on disk
 * and rollback-able.
 */
export class MigrationLogger {
    readonly runId: string;
    readonly logPath: string;
    readonly manifestPath: string;

    constructor(outDir: string, label: string) {
        fs.mkdirSync(outDir, { recursive: true });
        this.runId = new Date().toISOString().replace(/[:.]/g, "-");
        this.logPath = path.join(outDir, `${label}-${this.runId}.log.txt`);
        this.manifestPath = path.join(outDir, `${label}-${this.runId}.manifest.ndjson`);
        fs.writeFileSync(this.logPath, `Migration run "${label}" started ${new Date().toISOString()}\n\n`);
        fs.writeFileSync(this.manifestPath, "");
    }

    /** Human-readable line, e.g. "vendor_organizations id=123 INSERT  name=\"Saft India Private Limited\"" */
    log(line: string): void {
        fs.appendFileSync(this.logPath, `[${new Date().toISOString()}] ${line}\n`);
    }

    /** Machine-readable record consumed by the rollback script. */
    record(entry: ManifestEntry): void {
        fs.appendFileSync(this.manifestPath, JSON.stringify(entry) + "\n");
    }

    summary(text: string): void {
        fs.appendFileSync(this.logPath, `\n${text}\n`);
    }
}
