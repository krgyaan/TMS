import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { gzipSync, deflateSync } from "node:zlib";
import { TallyProtocolError, TallyTimeout, TallyTlsError, TallyUnreachable } from "../errors/tally.errors";
import { classifyRequestError, decodeXmlBuffer, nodeTallyRequester, type TallyHttpRequest } from "./tally-http.transport";

interface TestServer {
    url: URL;
    close: () => Promise<void>;
}

async function startServer(handler: (req: IncomingMessage, res: ServerResponse) => void): Promise<TestServer> {
    const server = createServer(handler);

    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));

    const { port } = server.address() as AddressInfo;

    return {
        url: new URL(`http://127.0.0.1:${port}/`),
        close: () =>
            new Promise<void>(resolve => {
                server.closeAllConnections();
                server.close(() => resolve());
            }),
    };
}

function requestFor(url: URL, overrides: Partial<TallyHttpRequest> = {}): TallyHttpRequest {
    return {
        url,
        body: "<ENVELOPE/>",
        headers: { "Content-Type": "text/xml; charset=utf-8" },
        connectTimeoutMs: 1000,
        readTimeoutMs: 1000,
        maxResponseBytes: 4096,
        allowInsecure: true,
        ...overrides,
    };
}

describe("nodeTallyRequester", () => {
    it("POSTs the XML body and returns the response", async () => {
        let receivedMethod = "";
        let receivedBody = "";
        let receivedContentType = "";
        const server = await startServer((req, res) => {
            receivedMethod = req.method ?? "";
            receivedContentType = String(req.headers["content-type"] ?? "");
            req.on("data", (chunk: Buffer) => {
                receivedBody += chunk.toString("utf8");
            });
            req.on("end", () => {
                res.writeHead(200, { "Content-Type": "text/xml; charset=utf-8" });
                res.end("<ENVELOPE><HEADER><STATUS>1</STATUS></HEADER><BODY></BODY></ENVELOPE>");
            });
        });

        try {
            const response = await nodeTallyRequester(requestFor(server.url));

            expect(receivedMethod).toBe("POST");
            expect(receivedBody).toBe("<ENVELOPE/>");
            expect(receivedContentType).toContain("text/xml");
            expect(response.statusCode).toBe(200);
            expect(response.body).toContain("<STATUS>1</STATUS>");
        } finally {
            await server.close();
        }
    });

    it("refuses to follow redirects", async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(302, { Location: "https://elsewhere.example.com" });
            res.end();
        });

        try {
            await expect(nodeTallyRequester(requestFor(server.url))).rejects.toThrow(/redirect/);
        } finally {
            await server.close();
        }
    });

    it("rejects an HTML response", async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/html" });
            res.end("<html><body>Bad gateway</body></html>");
        });

        try {
            await expect(nodeTallyRequester(requestFor(server.url))).rejects.toBeInstanceOf(TallyProtocolError);
        } finally {
            await server.close();
        }
    });

    it("caps the response size", async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/xml" });
            res.end(`<ENVELOPE>${"x".repeat(2048)}</ENVELOPE>`);
        });

        try {
            await expect(nodeTallyRequester(requestFor(server.url, { maxResponseBytes: 128 }))).rejects.toThrow(/exceeded/);
        } finally {
            await server.close();
        }
    });

    it("times out a stalled response", async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/xml" });
            res.write("<ENVELOPE>");
        });

        try {
            await expect(nodeTallyRequester(requestFor(server.url, { readTimeoutMs: 40 }))).rejects.toBeInstanceOf(TallyTimeout);
        } finally {
            await server.close();
        }
    });

    it("returns the HTTP status without mapping it (the client maps it)", async () => {
        const server = await startServer((_req, res) => {
            res.writeHead(401, { "Content-Type": "text/plain" });
            res.end("Unauthorized");
        });

        try {
            const response = await nodeTallyRequester(requestFor(server.url));

            expect(response.statusCode).toBe(401);
        } finally {
            await server.close();
        }
    });

    it("refuses plain http unless explicitly allowed", async () => {
        await expect(nodeTallyRequester(requestFor(new URL("http://127.0.0.1:9/"), { allowInsecure: false }))).rejects.toThrow(/https:\/\//);
    });

    it("decodes UTF-16LE bodies with a BOM", async () => {
        const server = await startServer((_req, res) => {
            const payload = Buffer.from("<ENVELOPE/>", "utf16le");
            const bom = Buffer.from([0xff, 0xfe]);

            res.writeHead(200, { "Content-Type": "text/xml; charset=utf-16" });
            res.end(Buffer.concat([bom, payload]));
        });

        try {
            const response = await nodeTallyRequester(requestFor(server.url));

            expect(response.body).toBe("<ENVELOPE/>");
        } finally {
            await server.close();
        }
    });

    it("decodes gzip and deflate bodies", async () => {
        const gzipServer = await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/xml", "Content-Encoding": "gzip" });
            res.end(gzipSync(Buffer.from("<ENVELOPE>gzip</ENVELOPE>")));
        });

        try {
            await expect(nodeTallyRequester(requestFor(gzipServer.url))).resolves.toMatchObject({
                body: "<ENVELOPE>gzip</ENVELOPE>",
            });
        } finally {
            await gzipServer.close();
        }

        const deflateServer = await startServer((_req, res) => {
            res.writeHead(200, { "Content-Type": "text/xml", "Content-Encoding": "deflate" });
            res.end(deflateSync(Buffer.from("<ENVELOPE>deflate</ENVELOPE>")));
        });

        try {
            await expect(nodeTallyRequester(requestFor(deflateServer.url))).resolves.toMatchObject({
                body: "<ENVELOPE>deflate</ENVELOPE>",
            });
        } finally {
            await deflateServer.close();
        }
    });
});

describe("classifyRequestError", () => {
    const errno = (code: string, message: string): NodeJS.ErrnoException => Object.assign(new Error(message), { code });

    it("maps certificate trust failures to TallyTlsError", () => {
        expect(classifyRequestError(errno("UNABLE_TO_GET_ISSUER_CERT_LOCALLY", "unable to get local issuer certificate"))).toBeInstanceOf(TallyTlsError);
        expect(classifyRequestError(errno("SELF_SIGNED_CERT_IN_CHAIN", "self signed certificate in certificate chain"))).toBeInstanceOf(TallyTlsError);
        expect(classifyRequestError(errno("CERT_HAS_EXPIRED", "certificate has expired"))).toBeInstanceOf(TallyTlsError);
        expect(classifyRequestError(errno("ERR_TLS_CERT_ALTNAME_INVALID", "Hostname/IP does not match certificate's altnames"))).toBeInstanceOf(TallyTlsError);
    });

    it("falls back to message text for certificate errors", () => {
        expect(classifyRequestError(errno("ERR_SSL_UNKNOWN", "unable to get local issuer certificate"))).toBeInstanceOf(TallyTlsError);
    });

    it("maps network failures", () => {
        expect(classifyRequestError(errno("ECONNREFUSED", "connect ECONNREFUSED"))).toBeInstanceOf(TallyUnreachable);
        expect(classifyRequestError(errno("ETIMEDOUT", "timeout"))).toBeInstanceOf(TallyTimeout);
    });
});

describe("decodeXmlBuffer", () => {
    it("handles UTF-8 and UTF-16LE input", () => {
        expect(decodeXmlBuffer(Buffer.from("<A/>", "utf8"))).toBe("<A/>");
        expect(decodeXmlBuffer(Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from("<A/>", "utf16le")]))).toBe("<A/>");
    });
});
