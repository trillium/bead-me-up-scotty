// Loaded via `node --import ./test/register.mjs` to install the extensionless
// TypeScript resolve hook before any test module loads. See append-ts-resolver.mjs.
import { registerHooks } from "node:module";
import { resolve } from "./append-ts-resolver.mjs";

registerHooks({ resolve });
