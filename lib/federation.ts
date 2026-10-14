import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";

const pExecFile = promisify(execFile);

/**
 * One federated store, as named by `brain stores list`.
 * `id` is the registry name (`brain`, `task`, `nightshift-tasks`), which is
 * also the bead-id prefix and the `BD_NAME` namespace on the shared server.
 */
export interface FederationStore {
  id: string;
  name: string;
  /** Directory bd runs in (the parent of `.beads`). */
  root: string;
  /** Passed as `BEADS_DIR` so a process-level default cannot select another store. */
  beadsDir: string;
}

/** Child-process target for one `bd` invocation. */
export interface BdTarget {
  cwd: string;
  beadsDir: string;
  /** When set, bd's narrow view is this store's namespace. */
  bdName?: string;
  /** Pin the shared Dolt server. Plain folder repos leave this off. */
  sharedServer?: boolean;
}

export interface RegistryRow {
  name: string;
  registryPath: string;
}

const DOLT_KEYS = [
  "BEADS_DOLT_SERVER_MODE",
  "BEADS_DOLT_SERVER_HOST",
  "BEADS_DOLT_SERVER_PORT",
  "BEADS_DOLT_SHARED_SERVER",
] as const;

export function normPath(p: string): string {
  return path.resolve(p).replace(/[\\/]+$/, "");
}

/** Parse `brain stores list`. Lines are `<name> <path>`; anything else is skipped. */
export function parseStoresList(text: string): RegistryRow[] {
  const out: RegistryRow[] = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const m = /^(\S+)\s+(\S.*)$/.exec(trimmed);
    if (!m) continue;
    const registryPath = m[2].trim();
    if (!registryPath.startsWith("/") && !registryPath.startsWith("~")) continue;
    out.push({ name: m[1], registryPath });
  }
  return out;
}

/**
 * Registry paths are sometimes the `.beads` directory and sometimes the store
 * root (`education`, `resumes`). Return null when neither layout exists.
 */
export function resolveRegistryPath(
  registryPath: string,
  exists: (p: string) => boolean = fs.existsSync,
): { root: string; beadsDir: string } | null {
  const p = registryPath.replace(/[\\/]+$/, "");
  if (p.endsWith(`${path.sep}.beads`) || p.endsWith("/.beads")) {
    return { beadsDir: p, root: path.dirname(p) };
  }
  if (exists(path.join(p, ".beads"))) {
    return { root: p, beadsDir: path.join(p, ".beads") };
  }
  if (exists(path.join(p, "metadata.json"))) {
    return { beadsDir: p, root: path.dirname(p) };
  }
  return null;
}

/**
 * Longest registry-name prefix wins, so `nightshift-tasks-abc` is
 * `nightshift-tasks` and not a shorter name that happens to share a stem.
 */
export function storeIdForBead(id: string, storeIds: readonly string[]): string | null {
  let best: string | null = null;
  for (const name of storeIds) {
    if ((id === name || id.startsWith(`${name}-`)) && (!best || name.length > best.length)) {
      best = name;
    }
  }
  return best;
}

/** True when `projectPath` is the parent folder that holds the federation (e.g. `~/data`). */
export function isFederationParentPath(
  projectPath: string,
  stores: readonly { root: string }[],
): boolean {
  if (stores.length < 2) return false;
  const parent = normPath(projectPath);
  let kids = 0;
  for (const s of stores) {
    if (path.dirname(normPath(s.root)) === parent) kids++;
  }
  return kids >= 2;
}

export interface LandingProject {
  id: string;
  path: string | null;
}

export interface LandingDecision {
  /** Project/store id to open. Null means show the picker. */
  id: string | null;
  /**
   * `BEADS_REPO` was set and did not match a known store or saved project.
   * The caller may register that folder and open it.
   */
  unresolvedRepo: boolean;
}

/**
 * Where `/` should land.
 * `BEADS_REPO` wins even when a projects list already exists (that env used
 * to be ignored). Otherwise the `brain` store is the default when the
 * registry has it. `picker` forces the launcher.
 */
export function resolveLanding(input: {
  picker: boolean;
  beadsRepo?: string;
  stores: readonly { id: string; root: string; beadsDir: string }[];
  projects: readonly LandingProject[];
}): LandingDecision {
  if (input.picker) return { id: null, unresolvedRepo: false };
  const repo = input.beadsRepo?.trim();
  if (repo) {
    const id = matchBeadsRepo(repo, input.stores, input.projects);
    return { id, unresolvedRepo: id === null };
  }
  if (input.stores.some((s) => s.id === "brain")) return { id: "brain", unresolvedRepo: false };
  if (input.stores.length === 1) return { id: input.stores[0].id, unresolvedRepo: false };
  const real = input.projects.filter((p) => p.id !== "demo" && p.path);
  if (real.length === 1) return { id: real[0].id, unresolvedRepo: false };
  return { id: null, unresolvedRepo: false };
}

export function matchBeadsRepo(
  repo: string,
  stores: readonly { id: string; root: string; beadsDir: string }[],
  projects: readonly LandingProject[],
): string | null {
  const n = normPath(repo);
  const asRoot = n.endsWith(`${path.sep}.beads`) ? path.dirname(n) : n;
  for (const s of stores) {
    const root = normPath(s.root);
    const beads = normPath(s.beadsDir);
    if (n === root || n === beads || asRoot === root) return s.id;
  }
  for (const p of projects) {
    if (!p.path) continue;
    const root = normPath(p.path);
    if (n === root || asRoot === root) return p.id;
  }
  return null;
}

/** Env for one bd invocation. Always sets `BEADS_DIR` so a leaked default cannot win. */
export function bdChildEnv(
  base: NodeJS.ProcessEnv,
  target: BdTarget,
  actor?: string,
): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = { ...base, BD_JSON_ENVELOPE: "1", BEADS_DIR: target.beadsDir };
  if (target.bdName) env.BD_NAME = target.bdName;
  else delete env.BD_NAME;
  if (target.sharedServer) {
    env.BEADS_DOLT_SERVER_MODE = "1";
    env.BEADS_DOLT_SERVER_HOST = base.BEADS_DOLT_SERVER_HOST || "127.0.0.1";
    env.BEADS_DOLT_SERVER_PORT = base.BEADS_DOLT_SERVER_PORT || "3307";
    env.BEADS_DOLT_SHARED_SERVER = "1";
  } else {
    for (const key of DOLT_KEYS) delete env[key];
  }
  if (actor) env.BEADS_ACTOR = actor;
  return env;
}

export function targetForStore(store: FederationStore): BdTarget {
  return {
    cwd: store.root,
    beadsDir: store.beadsDir,
    bdName: store.id,
    sharedServer: true,
  };
}

let cache: { at: number; stores: FederationStore[] } | null = null;
const CACHE_MS = 30_000;

export function clearFederationCache(): void {
  cache = null;
}

/** Registry from `brain stores list`. Empty when the wrapper is not installed. */
export async function listFederationStores(): Promise<FederationStore[]> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.stores;
  let text = "";
  try {
    const bin = process.env.BRAIN_BIN || "brain";
    const { stdout } = await pExecFile(bin, ["stores", "list"], {
      timeout: 8000,
      maxBuffer: 2 * 1024 * 1024,
    });
    text = stdout;
  } catch {
    text = "";
  }
  const stores: FederationStore[] = [];
  for (const row of parseStoresList(text)) {
    const resolved = resolveRegistryPath(row.registryPath);
    if (!resolved) continue;
    stores.push({
      id: row.name,
      name: row.name,
      root: resolved.root,
      beadsDir: resolved.beadsDir,
    });
  }
  cache = { at: Date.now(), stores };
  return stores;
}

export async function findFederationStore(id: string): Promise<FederationStore | undefined> {
  const stores = await listFederationStores();
  return stores.find((s) => s.id === id);
}
