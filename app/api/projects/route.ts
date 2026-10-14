import fs from "node:fs";
import path from "node:path";
import { listProjects, addProject, DEMO_PROJECT } from "@/lib/config";
import type { ProjectEntry, DemoProject } from "@/lib/config";
import { isFederationParentPath, listFederationStores, normPath } from "@/lib/federation";
import { ok, fail } from "@/lib/api";
import { z } from "zod";

export const dynamic = "force-dynamic";

function annotate(p: ProjectEntry | DemoProject) {
  let hasBeads = true;
  if (p.path !== null) {
    try {
      hasBeads = fs.existsSync(path.join(p.path, ".beads"));
    } catch {
      hasBeads = false;
    }
  }
  return { ...p, hasBeads };
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
  const projects = [DEMO_PROJECT, ...federated, ...saved].map(annotate);
  return ok({ projects });
}

const addSchema = z.object({ path: z.string().min(1) });

export async function POST(req: Request) {
  try {
    const { path: inputPath } = addSchema.parse(await req.json());
    const entry = addProject(inputPath);
    return ok(entry, 201);
  } catch (e) {
    return fail(e);
  }
}
