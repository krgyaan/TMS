// Test-only Node module hooks so unit tests can import app modules that rely on Vite:
//  - resolves the "@/..." path alias to web/src/...
//  - gives `import.meta.env` a value (Vite injects it at build time; in Node it is undefined)
// Registered from a test with: register('./helpers/vite-env-loader.mjs', import.meta.url)
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const EXTENSIONS = ['', '.ts', '.tsx', '/index.ts', '/index.tsx'];

function withExtension(base) {
    for (const ext of EXTENSIONS) {
        const candidate = base + ext;
        if (existsSync(candidate) && path.extname(candidate)) return pathToFileURL(candidate).href;
    }
    return null;
}

export async function resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
        const url = withExtension(path.join(SRC, specifier.slice(2)));
        if (url) return { url, shortCircuit: true };
    }
    // App source uses extensionless relative imports ("./auth"), as Vite allows.
    if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith(pathToFileURL(SRC).href)) {
        const target = path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier);
        // "./base.service" has a dot but no real extension: only rewrite when the exact file is missing.
        if (!existsSync(target)) {
            const url = withExtension(target);
            if (url) return { url, shortCircuit: true };
        }
    }
    return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
    const result = await nextLoad(url, context);
    if (url.startsWith(pathToFileURL(SRC).href) && result.source && /\.tsx?$/.test(url)) {
        const text = typeof result.source === 'string' ? result.source : Buffer.from(result.source).toString('utf8');
        if (text.includes('import.meta.env')) {
            return { ...result, source: text.replaceAll('import.meta.env', '(globalThis.__VITE_ENV__ ?? {})') };
        }
    }
    return result;
}
