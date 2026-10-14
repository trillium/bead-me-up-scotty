import type { Metadata } from "next";
import { AppShell } from "@/components/app-shell";
import { projectTitle } from "@/lib/app-title";
import { getProject } from "@/lib/config";
import { findFederationStore } from "@/lib/federation";

type Props = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { projectId } = await params;
  const fed = await findFederationStore(projectId);
  if (fed) return { title: projectTitle(fed.name) };
  const project = getProject(projectId);
  return project ? { title: projectTitle(project.name) } : {};
}

export default async function ProjectPage({ params }: Props) {
  const { projectId } = await params;
  return <AppShell projectId={projectId} />;
}
