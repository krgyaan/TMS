import type { IncomingMessage } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";
import { TallyProtocolError, TallyTimeout, TallyUnreachable } from "../errors/tally.errors";

export interface TallyHttpRequest {
    url: URL;
    body: string;
    headers: Record<string, string>;
    connectTimeoutMs: number;
    readTimeoutMs: number;
    maxResponseBytes: number;
    /** Test/dev only. Production config never allows http://. */
    allowInsecure?: boolean;
}

export interface TallyHttpResponse {
    statusCode: number;
    headers: Record<string, string | string[] | undefined>;
    body: string;
}

export type TallyRequester = (request: TallyHttpRequest) => Promise<TallyHttpResponse>;

const REDIRECT_MIN = 300;
const REDIRECT_MAX = 399;

export function decodeXmlBuffer(buffer: Buffer): string {
    if (buffer.length >= 2) {
        if (buffer[0] === 0xff && buffer[1] === 0xfe) {
            return buffer.toString("utf16le").replace(/^\uFEFF/, "");
        }

        if (buffer[0] === 0xfe && buffer[1] === 0xff) {
            const swapped = Buffer.from(buffer);

            if (swapped.length % 2 === 0) {
                swapped.swap16();

                return swapped.toString("utf16le").replace(/^\uFEFF/, "");
            }
        }
    }

    return buffer.toString("utf8").replace(/^\uFEFF/, "");
}

/**
 * Minimal hardened HTTP transport: POST only, HTTPS only (unless explicitly
 * allowed for tests), no redirect following, connect/read timeouts, and a
 * hard response-size cap. It never logs; the client does that.
 */
export const nodeTallyRequester: TallyRequester = options => {
    const { url } = options;
    const isHttps = url.protocol === "https:";

    if (!isHttps && !(options.allowInsecure && url.protocol === "http:")) {
        return Promise.reject(new TallyProtocolError(`Refusing to call Tally over ${url.protocol}; https:// is required`));
    }

    return new Promise<TallyHttpResponse>((resolve, reject) => {
        let settled = false;
        let response: IncomingMessage | undefined;
        let connectTimer: NodeJS.Timeout | undefined;

        const cleanupTimers = (): void => {
            if (connectTimer) {
                clearTimeout(connectTimer);
                connectTimer = undefined;
            }
        };

        const fail = (error: Error): void => {
            if (settled) {
                return;
            }

            settled = true;
            cleanupTimers();
            response?.destroy();
            request?.destroy();
            reject(error);
        };

        const succeed = (value: TallyHttpResponse): void => {
            if (settled) {
                return;
            }

            settled = true;
            cleanupTimers();
            resolve(value);
        };

        const requestFn = isHttps ? httpsRequest : httpRequest;

        const request = requestFn(
            {
                protocol: url.protocol,
                hostname: url.hostname,
                port: url.port || (isHttps ? 443 : 80),
                path: `${url.pathname}${url.search}`,
                method: "POST",
                headers: {
                    ...options.headers,
                    "Content-Length": Buffer.byteLength(options.body),
                },
            },
            incoming => {
                response = incoming;

                const statusCode = incoming.statusCode ?? 0;

                if (statusCode >= REDIRECT_MIN && statusCode <= REDIRECT_MAX) {
                    incoming.resume();
                    fail(new TallyProtocolError(`Tally endpoint returned a redirect (HTTP ${statusCode}); redirects are not followed`, { details: { statusCode } }));

                    return;
                }

                const contentType = String(incoming.headers["content-type"] ?? "").toLowerCase();

                if (contentType.includes("text/html")) {
                    incoming.resume();
                    fail(
                        new TallyProtocolError("Tally endpoint returned HTML instead of XML", {
                            details: { statusCode, contentType },
                        })
                    );

                    return;
                }

                const chunks: Buffer[] = [];
                let total = 0;

                incoming.on("data", (chunk: Buffer) => {
                    total += chunk.length;

                    if (total > options.maxResponseBytes) {
                        fail(new TallyProtocolError(`Tally response exceeded the ${options.maxResponseBytes}-byte limit`, { details: { statusCode } }));

                        return;
                    }

                    chunks.push(chunk);
                });

                incoming.on("end", () => {
                    succeed({
                        statusCode,
                        headers: incoming.headers,
                        body: decodeXmlBuffer(Buffer.concat(chunks)),
                    });
                });

                incoming.on("error", error => {
                    fail(new TallyUnreachable("Tally response stream failed", { cause: error }));
                });
            }
        );

        connectTimer = setTimeout(() => {
            fail(new TallyTimeout(`Timed out connecting to Tally after ${options.connectTimeoutMs}ms`));
        }, options.connectTimeoutMs);

        connectTimer.unref?.();

        request.on("socket", socket => {
            if (socket.connecting) {
                socket.once(isHttps ? "secureConnect" : "connect", () => cleanupTimers());
            } else {
                cleanupTimers();
            }
        });

        request.setTimeout(options.readTimeoutMs, () => {
            fail(new TallyTimeout(`Timed out waiting for Tally after ${options.readTimeoutMs}ms`));
        });

        request.on("error", (error: NodeJS.ErrnoException) => {
            cleanupTimers();

            switch (error.code) {
                case "ECONNREFUSED":
                case "ENOTFOUND":
                case "EAI_AGAIN":
                case "EHOSTUNREACH":
                case "ENETUNREACH":
                case "ECONNRESET":
                    fail(new TallyUnreachable("Tally endpoint is unreachable", { cause: error }));

                    return;
                case "ETIMEDOUT":
                    fail(new TallyTimeout("Connection to Tally timed out", { cause: error }));

                    return;
                default:
                    fail(new TallyUnreachable("Tally request failed", { cause: error }));
            }
        });

        request.on("close", () => cleanupTimers());
        request.end(options.body);
    });
};
