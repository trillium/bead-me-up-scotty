import "server-only";
import { addProject, listProjects } from "./config";
import { classifyProjectPath, listFederationStores, resolveLanding } from "./federation";

/** Id to open for `/`, or null to render the project picker. */
export async function landingProjectId(picker: boolean): Promise<string | null> {
  const stores = await listFederationStores();
  const projects = listProjects();
  const decision = resolveLanding({
    picker,
    beadsRepo: process.env.BEADS_REPO,
    stores,
    projects,
  });
  if (decision.id) return decision.id;
  if (!decision.unresolvedRepo || !process.env.BEADS_REPO) return null;
  // A registry store opens by its id. The federation parent is not a project
  // (the stores inside it are already listed). Only a real outside repo is saved.
  const classified = classifyProjectPath(process.env.BEADS_REPO, stores);
  if (classified.kind === "store") return classified.id;
  if (classified.kind !== "repo") return null;
  try {
    return addProject(classified.path).id;
  } catch {
    return null;
  }
}
