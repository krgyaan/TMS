import type { IncomingMessage } from "node:http";
import { request as httpRequest } from "node:http";
import { request as httpsRequest, type RequestOptions as HttpsRequestOptions } from "node:https";
import { brotliDecompressSync, gunzipSync, inflateSync } from "node:zlib";
import { TallyError, TallyProtocolError, TallyTimeout, TallyTlsError, TallyUnreachable } from "../errors/tally.errors";

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

export interface NodeTallyRequesterOptions {
    /** PEM contents of the private CA that signs the Tally proxy certificate. */
    ca?: string;
}

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

function decompressBody(buffer: Buffer, contentEncoding: string | string[] | undefined, maxBytes: number): Buffer {
    const encoding = (Array.isArray(contentEncoding) ? contentEncoding.join(",") : String(contentEncoding ?? "")).toLowerCase();

    try {
        if (encoding.includes("br")) {
            return brotliDecompressSync(buffer, { maxOutputLength: maxBytes });
        }

        if (encoding.includes("gzip")) {
            return gunzipSync(buffer, { maxOutputLength: maxBytes });
        }

        if (encoding.includes("deflate")) {
            return inflateSync(buffer, { maxOutputLength: maxBytes });
        }
    } catch (error) {
        throw new TallyProtocolError(`Tally response could not be decompressed or exceeded the ${maxBytes}-byte limit`, {
            cause: error,
        });
    }

    return buffer;
}

/**
 * Maps a Node request error to a typed Tally error. Certificate failures must
 * not masquerade as "unreachable": the server is up, the trust chain is wrong.
 */
export function classifyRequestError(error: NodeJS.ErrnoException): TallyError {
    const message = String(error.message ?? "").toLowerCase();

    switch (error.code) {
        case "ECONNREFUSED":
        case "ENOTFOUND":
        case "EAI_AGAIN":
        case "EHOSTUNREACH":
        case "ENETUNREACH":
        case "ECONNRESET":
            return new TallyUnreachable("Tally endpoint is unreachable", { cause: error });
        case "ETIMEDOUT":
        case "ERR_TLS_HANDSHAKE_TIMEOUT":
            return new TallyTimeout("Connection to Tally timed out", { cause: error });
        case "UNABLE_TO_GET_ISSUER_CERT":
        case "UNABLE_TO_GET_ISSUER_CERT_LOCALLY":
        case "UNABLE_TO_VERIFY_LEAF_SIGNATURE":
        case "SELF_SIGNED_CERT_IN_CHAIN":
        case "DEPTH_ZERO_SELF_SIGNED_CERT":
        case "CERT_UNTRUSTED":
            return new TallyTlsError("Tally certificate chain is not trusted; set TALLY_CA_CERT_PATH to the private CA", {
                cause: error,
            });
        case "CERT_HAS_EXPIRED":
        case "CERT_NOT_YET_VALID":
            return new TallyTlsError("Tally certificate is expired or not yet valid", { cause: error });
        case "ERR_TLS_CERT_ALTNAME_INVALID":
            return new TallyTlsError("Tally certificate does not match the configured hostname", { cause: error });
        default:
            break;
    }

    if (
        message.includes("unable to get local issuer") ||
        message.includes("unable to get issuer") ||
        message.includes("self signed certificate") ||
        message.includes("unable to verify the first certificate")
    ) {
        return new TallyTlsError("Tally certificate chain is not trusted; set TALLY_CA_CERT_PATH to the private CA", {
            cause: error,
        });
    }

    if (message.includes("altname") || message.includes("hostname/ip does not match")) {
        return new TallyTlsError("Tally certificate does not match the configured hostname", { cause: error });
    }

    if (message.includes("certificate has expired") || message.includes("certificate is not yet valid")) {
        return new TallyTlsError("Tally certificate is expired or not yet valid", { cause: error });
    }

    return new TallyUnreachable("Tally request failed", { cause: error });
}

/**
 * Minimal hardened HTTP transport: POST only, HTTPS only (unless explicitly
 * allowed for tests), no redirect following, connect/read timeouts, and a
 * hard response-size cap. It never logs; the client does that.
 */
export const nodeTallyRequester: TallyRequester = options => sendTallyRequest(options, {});

export function createNodeTallyRequester(requesterOptions: NodeTallyRequesterOptions = {}): TallyRequester {
    return request => sendTallyRequest(request, requesterOptions);
}

function sendTallyRequest(options: TallyHttpRequest, requesterOptions: NodeTallyRequesterOptions): Promise<TallyHttpResponse> {
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

        const requestOptions: HttpsRequestOptions = {
            protocol: url.protocol,
            hostname: url.hostname,
            port: url.port || (isHttps ? 443 : 80),
            path: `${url.pathname}${url.search}`,
            method: "POST",
            headers: {
                ...options.headers,
                "Content-Length": Buffer.byteLength(options.body),
            },
            ...(requesterOptions.ca ? { ca: requesterOptions.ca } : {}),
        };

        const request = isHttps ? httpsRequest(requestOptions, incoming => handleResponse(incoming)) : httpRequest(requestOptions, incoming => handleResponse(incoming));

        function handleResponse(incoming: IncomingMessage): void {
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
                try {
                    const decoded = decompressBody(Buffer.concat(chunks), incoming.headers["content-encoding"], options.maxResponseBytes);

                    succeed({
                        statusCode,
                        headers: incoming.headers,
                        body: decodeXmlBuffer(decoded),
                    });
                } catch (error) {
                    fail(error instanceof Error ? error : new TallyProtocolError("Tally response could not be read"));
                }
            });

            incoming.on("error", error => {
                fail(new TallyUnreachable("Tally response stream failed", { cause: error }));
            });
        }

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
            fail(classifyRequestError(error));
        });

        request.on("close", () => cleanupTimers());
        request.end(options.body);
    });
}
