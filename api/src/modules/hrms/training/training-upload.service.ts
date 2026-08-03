import { BadRequestException, Injectable, NotFoundException, OnModuleInit } from "@nestjs/common";
import { randomUUID } from "crypto";
import { createWriteStream } from "fs";
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from "fs/promises";
import { extname, join } from "path";
import type { Readable } from "stream";

import { AppLogger } from "@/logger/app-logger.service";

interface UploadSession {
    uploadId: string;
    expectedSize: number;
    receivedBytes: number;
    nextChunkIndex: number;
    originalName: string;
    status: "in-progress" | "uploaded";
    filename?: string;
    filepath?: string;
    filesize?: number;
}

export interface UploadedVideoFile {
    uploadId: string;
    filename: string;
    filepath: string;
    filesize: number;
}

export interface InitUploadParams {
    fileSize: number;
    originalName: string;
    totalChunks?: number;
}

export interface ChunkResult {
    receivedBytes: number;
    expectedSize: number;
}

const CHUNKS_ROOT = join(process.cwd(), "uploads", "hrms", "training", ".chunks");
const FINAL_DIR = join(process.cwd(), "uploads", "hrms", "training");

const SESSION_FILE = "session.json";
const PART_FILE = "part.bin";
const STALE_TTL_MS = 24 * 60 * 60 * 1000;

type ContextLogger = ReturnType<AppLogger["withContext"]>;

function readSessionSafe(raw: string): UploadSession | null {
    try {
        const parsed: unknown = JSON.parse(raw);
        return parsed && typeof parsed === "object" ? (parsed as UploadSession) : null;
    } catch {
        return null;
    }
}

@Injectable()
export class TrainingUploadService implements OnModuleInit {
    private readonly logger: ContextLogger;

    constructor(private readonly appLogger: AppLogger) {
        this.logger = this.appLogger.withContext(TrainingUploadService.name);
    }

    async onModuleInit() {
        await mkdir(CHUNKS_ROOT, { recursive: true });
        try {
            await mkdir(join(CHUNKS_ROOT, ".keep"), { recursive: true });
        } catch {
            // ignore
        }
        await this.sweepStaleSessions();
    }

    /**
     * Begin a chunked upload session.
     */
    async init(params: InitUploadParams): Promise<{ uploadId: string }> {
        if (!params.fileSize || params.fileSize <= 0 || !Number.isFinite(params.fileSize)) {
            throw new BadRequestException("fileSize must be a positive number");
        }
        if (!params.originalName) {
            throw new BadRequestException("originalName is required");
        }

        const uploadId = randomUUID();
        const totalChunks = params.totalChunks && params.totalChunks > 0 ? params.totalChunks : undefined;
        const session: UploadSession = {
            uploadId,
            expectedSize: params.fileSize,
            receivedBytes: 0,
            nextChunkIndex: 0,
            originalName: params.originalName,
            status: "in-progress",
        };

        await this.saveSession(session);
        this.logger.log("Upload session created", {
            uploadId,
            originalName: params.originalName,
            fileSize: params.fileSize,
            totalChunks,
        });
        return { uploadId };
    }

    /**
     * Append a raw chunk (application/octet-stream) to the staging part file.
     * Chunks must arrive in order; strict ordering is enforced via nextChunkIndex.
     */
    async appendChunk(uploadId: string, index: number, body: Readable | NodeJS.ReadableStream): Promise<ChunkResult> {
        const session = await this.loadSession(uploadId);
        if (session.status !== "in-progress") {
            this.logger.warn("Chunk rejected: session not active", {
                uploadId,
                index,
                status: session.status,
            });
            throw new BadRequestException("Upload session is not active (already finalized or aborted)");
        }
        if (index !== session.nextChunkIndex) {
            this.logger.warn("Chunk rejected: out of order", {
                uploadId,
                index,
                expectedIndex: session.nextChunkIndex,
            });
            throw new BadRequestException(`Unexpected chunk index ${index}; expected ${session.nextChunkIndex}`);
        }

        const partPath = join(this.sessionDir(uploadId), PART_FILE);
        const stream = body as Readable;
        const writeStream = createWriteStream(partPath, { flags: "a" });
        let bytes = 0;

        await new Promise<void>((resolve, reject) => {
            stream.on("data", (chunk: Buffer) => {
                bytes += chunk.length;
            });
            stream.pipe(writeStream);
            writeStream.on("finish", resolve);
            writeStream.on("error", reject);
            stream.on("error", reject);
        });

        session.receivedBytes += bytes;
        session.nextChunkIndex += 1;
        await this.saveSession(session);

        this.logger.log("Chunk appended", {
            uploadId,
            index,
            chunkBytes: bytes,
            receivedBytes: session.receivedBytes,
            expectedSize: session.expectedSize,
            progressPct: session.expectedSize > 0 ? Math.round((session.receivedBytes / session.expectedSize) * 100) : 0,
        });

        return { receivedBytes: session.receivedBytes, expectedSize: session.expectedSize };
    }

    /**
     * Assemble the staged part file into the final video file in the uploads dir.
     * The session is kept (marked as uploaded) so create() can reference it.
     */
    async finalize(uploadId: string): Promise<UploadedVideoFile> {
        const session = await this.loadSession(uploadId);
        if (session.status !== "in-progress") {
            this.logger.warn("Finalize rejected: session not in-progress", {
                uploadId,
                status: session.status,
            });
            throw new BadRequestException("Session is not in-progress");
        }

        const partPath = join(this.sessionDir(uploadId), PART_FILE);
        const { size: partSize } = await stat(partPath);

        if (partSize !== session.expectedSize) {
            this.logger.warn("Finalize rejected: incomplete upload", {
                uploadId,
                expectedSize: session.expectedSize,
                receivedBytes: partSize,
            });
            throw new BadRequestException(`Incomplete upload: expected ${session.expectedSize} bytes, received ${partSize}`);
        }

        const ext = extname(session.originalName).toLowerCase();
        const filename = `trn-video-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
        const filepath = join(FINAL_DIR, filename);
        await mkdir(FINAL_DIR, { recursive: true });
        await rename(partPath, filepath);

        session.status = "uploaded";
        session.filename = filename;
        session.filepath = filepath;
        session.filesize = partSize;
        await this.saveSession(session);

        this.logger.log("Upload finalized", {
            uploadId,
            originalName: session.originalName,
            filename,
            filepath,
            filesize: partSize,
        });

        return {
            uploadId,
            filename,
            filepath,
            filesize: partSize,
        };
    }

    /**
     * Server-authoritative lookup of an assembled file (used by POST /videos).
     */
    async resolveUploadedFile(uploadId: string): Promise<UploadedVideoFile> {
        const session = await this.loadSession(uploadId);
        if (session.status !== "uploaded" || !session.filepath || !session.filesize) {
            this.logger.warn("Upload resolve failed: no finalized file", {
                uploadId,
                status: session.status,
            });
            throw new NotFoundException(`No finalized upload found for ${uploadId}`);
        }
        this.logger.log("Upload resolved for create", {
            uploadId,
            filename: session.filename,
            filepath: session.filepath,
            filesize: session.filesize,
        });
        return {
            uploadId,
            filename: session.filename!,
            filepath: session.filepath,
            filesize: session.filesize,
        };
    }

    /**
     * Clean up the session directory after the DB record has been created.
     */
    async complete(uploadId: string): Promise<void> {
        try {
            await rm(this.sessionDir(uploadId), { recursive: true, force: true });
            this.logger.log("Upload session cleaned up after create", { uploadId });
        } catch (err) {
            this.logger.warn(`Failed to clean up upload session ${uploadId}`, {
                error: (err as Error).message,
            });
        }
    }

    /**
     * Abort / cancel an upload: remove staging and (if finalized) the final file.
     */
    async abort(uploadId: string): Promise<void> {
        let session: UploadSession | null = null;
        try {
            session = await this.loadSession(uploadId);
        } catch {
            // Session already gone — nothing to do.
        }

        if (session?.status === "uploaded" && session.filepath) {
            try {
                await rm(session.filepath, { force: true });
            } catch (err) {
                this.logger.warn(`Failed to remove finalized file for ${uploadId}`, {
                    error: (err as Error).message,
                });
            }
        }

        try {
            await rm(this.sessionDir(uploadId), { recursive: true, force: true });
        } catch {
            // ignore
        }

        this.logger.log(`Upload session aborted: ${uploadId}`);
    }

    private async loadSession(uploadId: string): Promise<UploadSession> {
        let raw: string;
        try {
            raw = await readFile(join(this.sessionDir(uploadId), SESSION_FILE), "utf8");
        } catch (err) {
            if (err instanceof Error && "code" in err && (err as NodeJS.ErrnoException).code === "ENOENT") {
                throw new NotFoundException(`Upload session ${uploadId} not found`);
            }
            throw err;
        }

        const session = readSessionSafe(raw);
        if (!session) {
            throw new BadRequestException(`Upload session ${uploadId} is corrupt`);
        }
        return session;
    }

    private async saveSession(session: UploadSession): Promise<void> {
        await mkdir(this.sessionDir(session.uploadId), { recursive: true });
        await writeFile(join(this.sessionDir(session.uploadId), SESSION_FILE), JSON.stringify(session, null, 2), "utf8");
    }

    private async sweepStaleSessions(): Promise<void> {
        let entries: string[];
        try {
            entries = await readdir(CHUNKS_ROOT);
        } catch {
            return;
        }

        const now = Date.now();
        for (const entry of entries) {
            if (entry === ".keep") continue;
            const dir = join(CHUNKS_ROOT, entry);
            try {
                const { mtimeMs } = await stat(dir);
                if (now - mtimeMs < STALE_TTL_MS) continue;

                const session = await this.loadSession(entry).catch(() => null);
                if (session?.status === "uploaded" && session.filepath) {
                    await rm(session.filepath, { force: true });
                }
                await rm(dir, { recursive: true, force: true });
                this.logger.warn(`Swept stale upload session: ${entry}`);
            } catch (err) {
                this.logger.warn(`Failed to sweep upload session ${entry}`, {
                    error: (err as Error).message,
                });
            }
        }
    }

    private sessionDir(uploadId: string): string {
        return join(CHUNKS_ROOT, uploadId);
    }
}
