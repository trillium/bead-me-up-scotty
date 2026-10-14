import "server-only";
import { addProject, listProjects } from "./config";
import { listFederationStores, resolveLanding } from "./federation";

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
  try {
    return addProject(process.env.BEADS_REPO).id;
  } catch {
    return null;
  }
}
