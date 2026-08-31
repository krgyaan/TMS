import IORedis from "ioredis";

const DEFAULT_TTL_SECONDS = 30;
const DEFAULT_INTERVAL_MS = 10_000;

export interface HeartbeatMeta {
    pid: number;
    startedAt: string;
    lastSeen?: string;
    queue?: string;
}

export interface StartHeartbeatOptions {
    key: string;
    host?: string;
    port?: number;
    queue?: string;
    ttlSeconds?: number;
    intervalMs?: number;
}

export function startHeartbeat(options: StartHeartbeatOptions): void {
    const { key, host, port, queue, ttlSeconds = DEFAULT_TTL_SECONDS, intervalMs = DEFAULT_INTERVAL_MS } = options;

    if (!host || !port) {
        return;
    }

    let client: IORedis | null = null;
    try {
        client = new IORedis({ host, port, maxRetriesPerRequest: null });
    } catch {
        return;
    }

    const write = (): void => {
        const meta: HeartbeatMeta = {
            pid: process.pid,
            startedAt: new Date().toISOString(),
            lastSeen: new Date().toISOString(),
            ...(queue ? { queue } : {}),
        };
        try {
            client?.set(key, JSON.stringify(meta), "EX", ttlSeconds).catch(() => {});
        } catch {
            // heartbeat write is best-effort; do not crash the worker
        }
    };

    write();
    const timer = setInterval(write, intervalMs);
    timer.unref();

    const teardown = (): void => {
        clearInterval(timer);
        try {
            client?.disconnect();
        } catch {
            // ignore
        }
    };

    process.once("exit", teardown);
    process.once("SIGINT", teardown);
    process.once("SIGTERM", teardown);
}
