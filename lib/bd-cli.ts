import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { bdChildEnv, type BdTarget } from "./federation";
import {
  beadSchema,
  unwrapEnvelope,
  type Bead,
  type CreateInput,
  type UpdateInput,
  type DepType,
} from "./schema";
import type { BeadsStore, DoctorInfo } from "./store";

const pExecFile = promisify(execFile);
const BD_BIN = process.env.BD_BIN || "bd";
const BD_TIMEOUT_MS = 45_000;

export class BdError extends Error {
  code?: string;
  constructor(message: string, code?: string) {
    super(message);
    this.name = "BdError";
    this.code = code;
  }
}

/**
 * Run a bd command. Args are passed as an array (no shell) so titles and
 * descriptions are injection-safe. Always requests the JSON envelope.
 * `BEADS_DIR` / `BD_NAME` come from the target so a process-level default
 * cannot silently select a different store.
 */
async function runBdRaw(
  args: string[],
  target: BdTarget,
  actor?: string,
): Promise<string> {
  try {
    const { stdout } = await pExecFile(BD_BIN, args, {
      cwd: target.cwd,
      timeout: BD_TIMEOUT_MS,
      maxBuffer: 32 * 1024 * 1024,
      env: bdChildEnv(process.env, target, actor),
    });
    return stdout;
  } catch (err: unknown) {
    const e = err as { stderr?: string; message?: string; killed?: boolean; code?: string };
    if (e.killed || e.code === "ETIMEDOUT") {
      throw new BdError(e.stderr || e.message || "bd command timed out", "timeout");
    }
    const stderr = (e.stderr || "").trim();
    try {
      const parsed = JSON.parse(stderr) as { error?: string; code?: string };
      if (parsed.error) throw new BdError(parsed.error, parsed.code);
    } catch (parseErr) {
      if (parseErr instanceof BdError) throw parseErr;
    }
    if (/pending schema migration|BD_ALLOW_REMOTE_MIGRATE|#4259/i.test(stderr)) {
      throw new BdError(stderr, "schema_migration_required");
    }
    if (/no issues? found matching/i.test(stderr)) {
      throw new BdError(stderr, "not_found");
    }
    throw new BdError(stderr || e.message || "bd command failed");
  }
}

async function runBdJson<T = unknown>(
  args: string[],
  target: BdTarget,
  actor?: string,
): Promise<T> {
  const out = await runBdRaw([...args, "--json"], target, actor);
  return unwrapEnvelope(JSON.parse(out)) as T;
}

/** Parse `bd export --json` JSONL output into validated beads. */
function parseExport(jsonl: string): Bead[] {
  const beads: Bead[] = [];
  for (const line of jsonl.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    let obj: unknown;
    try {
      obj = JSON.parse(trimmed);
    } catch {
      continue;
    }
    const parsed = beadSchema.safeParse(obj);
    if (parsed.success && parsed.data.issue_type) beads.push(parsed.data);
  }
  return beads;
}

// Embedded Dolt is single-writer per database, and on the shared server each
// store is its own database. Key by beadsDir so one store's calls serialize
// while different stores run in parallel.
const writeChains = new Map<string, Promise<unknown>>();
function serializeWrite<T>(beadsDir: string, fn: () => Promise<T>): Promise<T> {
  const prev = writeChains.get(beadsDir) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  writeChains.set(
    beadsDir,
    next.catch(() => {}),
  );
  return next;
}

const availabilityCache = new Map<string, boolean>();

export async function isBdAvailable(repoPath: string): Promise<boolean> {
  const hit = availabilityCache.get(repoPath);
  if (hit !== undefined) return hit;
  let ok = false;
  try {
    await pExecFile(BD_BIN, ["--version"], { timeout: 5000 });
    ok = fs.existsSync(path.join(repoPath, ".beads"));
  } catch {
    ok = false;
  }
  availabilityCache.set(repoPath, ok);
  return ok;
}

/** Pick the bead we asked for out of `bd show` output. Never the first of a list. */
function shownRecord(data: unknown, id: string): unknown {
  if (!data || typeof data !== "object") return null;
  if (Array.isArray(data)) {
    return data.find((r) => r && typeof r === "object" && (r as { id?: string }).id === id) ?? null;
  }
  const rec = data as { id?: string; error?: string };
  if (rec.error && rec.id !== id) return null;
  if (rec.id !== id) return null;
  return data;
}

function plainTarget(repoPath: string): BdTarget {
  return { cwd: repoPath, beadsDir: path.join(repoPath, ".beads"), sharedServer: false };
}

/**
 * `foreignTarget` routes a write to the store that owns the bead id (prefix
 * match). Reads of an id outside this store use `bd show --wide` instead,
 * which resolves any federated id on the shared server.
 */
export function createBdStore(
  repoPath: string,
  target?: BdTarget,
  foreignTarget?: (id: string) => BdTarget | null,
): BeadsStore {
  const own = target ?? plainTarget(repoPath);
  const ro = own;
  // Collapse concurrent list() callers (the polling views) onto one in-flight export.
  let inflightList: Promise<Bead[]> | null = null;

  function writeTarget(id: string): BdTarget {
    return foreignTarget?.(id) ?? own;
  }

  async function show(id: string): Promise<Bead> {
    // On the shared server, narrow mode hides other stores. `--wide` is a
    // read of the unified database, so a typed foreign id still resolves.
    // A miss can still exit with a JSON body whose first record is some
    // other bead — only accept a record whose id is the one we asked for.
    const args = ["show", id];
    if (own.sharedServer) args.push("--wide");
    const data = await runBdJson(args, ro);
    const rec = shownRecord(data, id);
    if (!rec) throw new BdError(`bead ${id} not found`, "not_found");
    const parsed = beadSchema.safeParse(rec);
    if (!parsed.success) {
      const detail = parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      throw new BdError(`could not parse bead ${id}: ${detail}`, "parse_error");
    }
    return parsed.data;
  }

  return {
    kind: "bd",

    async list() {
      if (inflightList) return inflightList;
      inflightList = serializeWrite(own.beadsDir, async () =>
        parseExport(await runBdRaw(["export", "--json"], ro)),
      );
      try {
        return await inflightList;
      } finally {
        inflightList = null;
      }
    },

    async get(id) {
      return serializeWrite(own.beadsDir, async () => {
        try {
          return await show(id);
        } catch (e) {
          if (e instanceof BdError && e.code === "not_found") return null;
          throw e;
        }
      });
    },

    create(input: CreateInput, actor: string) {
      return serializeWrite(own.beadsDir, async () => {
        const args = [
          "create",
          input.title,
          "-t",
          input.issue_type,
          "--priority",
          String(input.priority),
        ];
        if (input.description) args.push("--description", input.description);
        if (input.assignee) args.push("--assignee", input.assignee);
        if (input.labels?.length) args.push("-l", input.labels.join(","));
        if (input.parent) args.push("--parent", input.parent);
        const created = await runBdJson<{ id: string }>(args, own, actor);
        const id = created.id;
        if (input.backlog) {
          await runBdRaw(["update", id, "-s", "deferred"], own, actor);
        }
        return show(id);
      });
    },

    update(id, patch: UpdateInput, actor: string) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        const args = ["update", id];
        if (patch.title !== undefined) args.push("--title", patch.title);
        if (patch.description !== undefined) args.push("--description", patch.description);
        if (patch.status !== undefined) args.push("-s", patch.status);
        if (patch.priority !== undefined) args.push("--priority", String(patch.priority));
        if (patch.issue_type !== undefined) args.push("-t", patch.issue_type);
        if (patch.assignee !== undefined) args.push("--assignee", patch.assignee);
        if (patch.parent !== undefined) args.push("--parent", patch.parent);
        if (patch.labels !== undefined) {
          if (patch.labels.length) {
            args.push("--set-labels", patch.labels.join(","));
          } else {
            const current = (await show(id)).labels ?? [];
            if (current.length) args.push("--remove-label", current.join(","));
          }
        }
        if (args.length > 2) await runBdRaw(args, target, actor);
        return show(id);
      });
    },

    setStatus(id, status, actor, reason) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        if (status === "closed") {
          const args = ["close", id];
          const trimmed = reason?.trim();
          if (trimmed) args.push("--reason", trimmed);
          await runBdRaw(args, target, actor);
        } else {
          await runBdRaw(["update", id, "-s", status], target, actor);
        }
        return show(id);
      });
    },

    remove(id, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["delete", id, "--force"], target, actor);
      });
    },

    addComment(id, text, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["comment", id, text], target, actor);
        return show(id);
      });
    },

    addDep(id, dependsOnId, type: DepType, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["dep", "add", id, dependsOnId, "-t", type], target, actor);
        return show(id);
      });
    },

    removeDep(id, dependsOnId, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["dep", "remove", id, dependsOnId], target, actor);
        return show(id);
      });
    },

    createGate(blocks, reason, actor) {
      const target = writeTarget(blocks);
      return serializeWrite(target.beadsDir, async () => {
        const args = ["gate", "create", "--type", "human", "--blocks", blocks];
        if (reason) args.push("--reason", reason);
        const created = await runBdJson<{ id: string }>(args, target, actor);
        return show(created.id);
      });
    },

    removeLabel(id, label, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["update", id, "--remove-label", label], target, actor);
        return show(id);
      });
    },

    archive(id, actor) {
      const target = writeTarget(id);
      return serializeWrite(target.beadsDir, async () => {
        await runBdRaw(["close", id], target, actor);
        await runBdRaw(["label", "add", id, "archived"], target, actor);
        return show(id);
      });
    },

    async doctor(): Promise<DoctorInfo> {
      try {
        const { stdout } = await pExecFile(BD_BIN, ["--version"], {
          cwd: own.cwd,
          timeout: 5000,
          env: bdChildEnv(process.env, own),
        });
        return {
          kind: "bd",
          ok: true,
          version: stdout.trim(),
          repoPath,
          message: `Connected to bd at ${repoPath}`,
        };
      } catch (e) {
        return {
          kind: "bd",
          ok: false,
          repoPath,
          message: (e as Error).message,
        };
      }
    },
  };
}
