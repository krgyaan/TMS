// Test-only Node module hook so unit tests can import app .tsx components.
// Node's built-in type stripping handles .ts but not JSX, so .tsx files under web/src are
// compiled with esbuild (already installed as a Vite dependency). Like vite-env-loader.mjs it
// also gives `import.meta.env` a value. Register AFTER vite-env-loader.mjs (which resolves "@/"):
//   register('./helpers/vite-env-loader.mjs', import.meta.url);
//   register('./helpers/tsx-loader.mjs', import.meta.url);
import { readFile } from 'node:fs/promises';
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const WEB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = pathToFileURL(path.join(WEB, 'src')).href;

// esbuild is not hoisted by pnpm; load it from the store.
const pnpmDir = path.join(WEB, 'node_modules', '.pnpm');
const esbuildDir = readdirSync(pnpmDir).find((d) => d.startsWith('esbuild@'));
const { transform } = createRequire(import.meta.url)(path.join(pnpmDir, esbuildDir, 'node_modules', 'esbuild'));

export async function load(url, context, nextLoad) {
    if (!url.startsWith(SRC) || !url.endsWith('.tsx')) return nextLoad(url, context);
    const source = (await readFile(fileURLToPath(url), 'utf8')).replaceAll('import.meta.env', '(globalThis.__VITE_ENV__ ?? {})');
    const { code } = await transform(source, { loader: 'tsx', jsx: 'automatic', format: 'esm', sourcefile: fileURLToPath(url) });
    return { format: 'module', source: code, shortCircuit: true };
}
