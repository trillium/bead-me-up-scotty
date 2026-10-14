import "server-only";
import path from "node:path";
import type { Bead, CreateInput, UpdateInput, DepType } from "./schema";
import { getProject, touchProject, DEMO_PROJECT, ConfigError } from "./config";
import { createBdStore, isBdAvailable } from "./bd";
import { demoStore } from "./demo-store";
import {
  isFederationParentPath,
  listFederationStores,
  normPath,
  storeIdForBead,
  targetForStore,
  type BdTarget,
  type FederationStore,
} from "./federation";

/**
 * Storage abstraction. Two implementations:
 *  - BdStore  → shells out to the `bd` CLI (source of truth).
 *  - DemoStore → in-memory, seeded from the design export, so the app runs and
 *    is demoable even where bd isn't installed.
 */
export interface DoctorInfo {
  kind: "bd" | "demo";
  ok: boolean;
  version?: string;
  repoPath: string;
  message: string;
}

export interface BeadsStore {
  kind: "bd" | "demo";
  list(): Promise<Bead[]>;
  get(id: string): Promise<Bead | null>;
  create(input: CreateInput, actor: string): Promise<Bead>;
  update(id: string, patch: UpdateInput, actor: string): Promise<Bead>;
  /**
   * `reason` is only meaningful when closing — bd records it via
   * `bd close --reason`, and there is no way to attach one after the fact.
   */
  setStatus(id: string, status: string, actor: string, reason?: string): Promise<Bead>;
  remove(id: string, actor: string): Promise<void>;
  addComment(id: string, text: string, actor: string): Promise<Bead>;
  addDep(id: string, dependsOnId: string, type: DepType, actor: string): Promise<Bead>;
  removeDep(id: string, dependsOnId: string, actor: string): Promise<Bead>;
  /** Create a human approval gate that blocks `blocks` (`bd gate create --type human`). */
  createGate(blocks: string, reason: string | undefined, actor: string): Promise<Bead>;
  removeLabel(id: string, label: string, actor: string): Promise<Bead>;
  archive(id: string, actor: string): Promise<Bead>;
  doctor(): Promise<DoctorInfo>;
}

// One store per project id. Demo always maps to the shared in-memory store.
const stores = new Map<string, BeadsStore>();

function foreignTarget(id: string, feds: FederationStore[], currentId: string): BdTarget | null {
  const owner = storeIdForBead(id, feds.map((s) => s.id));
  if (!owner || owner === currentId) return null;
  const store = feds.find((s) => s.id === owner);
  return store ? targetForStore(store) : null;
}

export async function getStore(projectId: string): Promise<BeadsStore> {
  if (projectId === DEMO_PROJECT.id) return demoStore;

  const cached = stores.get(projectId);
  if (cached) return cached;

  const feds = await listFederationStores();
  const project = getProject(projectId);
  const byId = feds.find((s) => s.id === projectId);
  const byPath =
    !byId && project?.path
      ? feds.find((s) => normPath(s.root) === normPath(project.path as string))
      : undefined;
  const chosen = byId ?? byPath;

  if (!chosen) {
    if (!project || project.path === null) {
      throw new ConfigError(`Unknown project: ${projectId}`, "unknown_project");
    }
    if (isFederationParentPath(project.path, feds)) {
      throw new ConfigError(
        `"${project.name}" is the folder that holds the federated stores, not a store. Open one by its registry name, such as brain.`,
        "federation_parent",
      );
    }
    if (!(await isBdAvailable(project.path))) {
      throw new ConfigError(
        `bd is not available for "${project.name}" (${project.path}). ` +
          `Check that bd is installed and the folder still contains a .beads directory.`,
        "bd_unavailable",
      );
    }
  } else if (!(await isBdAvailable(chosen.root))) {
    throw new ConfigError(
      `bd is not available for "${chosen.name}" (${chosen.root}). ` +
        `Check that bd is installed and the store still contains a .beads directory.`,
      "bd_unavailable",
    );
  }

  const own: BdTarget = chosen
    ? targetForStore(chosen)
    : {
        cwd: project!.path as string,
        beadsDir: path.join(project!.path as string, ".beads"),
        sharedServer: false,
      };
  const currentId = chosen?.id ?? projectId;
  const store = createBdStore(own.cwd, own, (id) => foreignTarget(id, feds, currentId));
  stores.set(projectId, store);
  // Saved folder projects record last-opened. Registry stores are not copied
  // into the config file just because someone opened them.
  if (!chosen && project && project.path !== null) touchProject(projectId);
  else if (chosen && project && normPath(project.path ?? "") === normPath(chosen.root)) {
    touchProject(projectId);
  }
  return store;
}

/** Reset cached store(s) — one project, or all when no id is given. */
export function resetStore(projectId?: string) {
  if (projectId) stores.delete(projectId);
  else stores.clear();
}
