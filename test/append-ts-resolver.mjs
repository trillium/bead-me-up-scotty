// Minimal SYNCHRONOUS ESM resolve hook so `node --test` can run the app's `.ts`
// files directly (Node strips the types natively) WITHOUT pulling in tsx/vitest.
//
// The app is authored for a bundler (tsconfig `moduleResolution: bundler`), so
// its internal imports are extensionless — e.g. command-engine's `./schema`.
// Node's ESM resolver requires explicit extensions, so this hook appends the
// TypeScript ones for relative specifiers that have none. Installed via
// test/register.mjs (loaded with `node --import`).
import { existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

export function resolve(specifier, context, nextResolve) {
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !path.extname(specifier)) {
    const parent = context.parentURL ? path.dirname(fileURLToPath(context.parentURL)) : process.cwd();
    const target = path.resolve(parent, specifier);
    for (const ext of [".ts", ".tsx", ".mts", ".js", ".mjs"]) {
      if (existsSync(target + ext)) {
        return { url: pathToFileURL(target + ext).href, shortCircuit: true };
      }
    }
  }
  return nextResolve(specifier, context);
}
