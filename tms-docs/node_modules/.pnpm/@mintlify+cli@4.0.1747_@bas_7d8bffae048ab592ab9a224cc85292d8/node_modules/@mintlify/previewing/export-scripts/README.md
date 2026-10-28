# Exported documentation

## View locally

Run `node serve.js` (or double-click `Start Docs.command` on macOS, `Start Docs.bat` on Windows) and open `http://localhost:3000`. Requires Node.js.

## Host on your own server

Serve this folder as static files with these rules:

1. **Pages:** a request for `/<path>` serves `<path>/index.html`.
2. **Client-side navigation:** a request with an `RSC: 1` header or an `_rsc` query parameter serves `<path>/index.txt` with `Content-Type: text/x-component` and `Vary: RSC`. Without this rule, every link click is a full page load and link prefetches download whole HTML pages.
3. **Caching:** serve `_next/static/*` and `_mintlify/export-assets/*` with `Cache-Control: public, max-age=31536000, immutable`, and pages and `index.txt` files with `Cache-Control: no-cache`.

`serve.js` implements all three rules and can be used as a reference.
