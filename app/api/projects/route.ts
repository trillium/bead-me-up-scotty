import fs from "node:fs";
import path from "node:path";
import { listProjects, addProject, ConfigError, DEMO_PROJECT } from "@/lib/config";
import type { ProjectEntry, DemoProject } from "@/lib/config";
import {
  classifyProjectPath,
  isFederationParentPath,
  listFederationStores,
  normPath,
} from "@/lib/federation";
import { ok, fail } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

function annotate(p: ProjectEntry | DemoProject, source: "registry" | "saved" | "demo") {
  let hasBeads = true;
  if (p.path !== null) {
    try {
      hasBeads = fs.existsSync(path.join(p.path, ".beads"));
    } catch {
      hasBeads = false;
    }
  }
  return { ...p, hasBeads, source };
}

export async function GET() {
  const stores = await listFederationStores();
  const storeRoots = new Set(stores.map((s) => normPath(s.root)));
  const saved = listProjects().filter(
    (p) => !storeRoots.has(normPath(p.path)) && !isFederationParentPath(p.path, stores),
  );
  const federated: ProjectEntry[] = [...stores]
    .sort((a, b) => {
      if (a.id === "brain") return -1;
      if (b.id === "brain") return 1;
      return a.name.localeCompare(b.name);
    })
    .map((s) => ({
      id: s.id,
      name: s.name,
      path: s.root,
      addedAt: "",
      lastOpened: "",
    }));
  const projects = [
    annotate(DEMO_PROJECT, "demo"),
    ...federated.map((p) => annotate(p, "registry")),
    ...saved.map((p) => annotate(p, "saved")),
  ];
  return ok({ projects });
}

const addSchema = z.object({ path: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { path: inputPath } = addSchema.parse(await req.json());
    const stores = await listFederationStores();
    const decision = classifyProjectPath(inputPath, stores);
    if (decision.kind === "store") {
      return ok({
        action: "opened",
        id: decision.id,
        name: decision.name,
        path: decision.root,
        hasBeads: true,
        source: "registry",
      });
    }
    if (decision.kind === "federation_parent") {
      return ok({
        action: "federation_parent",
        message:
          "This folder holds the federated stores. They are already listed — open one by name, such as brain.",
      });
    }
    if (decision.kind === "missing") {
      throw new ConfigError(`No .beads directory found in ${decision.path}`, "no_beads");
    }
    const entry = addProject(decision.path);
    return ok({ action: "added", ...entry, hasBeads: true, source: "saved" }, 201);
  } catch (e) {
    return fail(e);
  }
}
