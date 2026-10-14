import { redirect } from "next/navigation";
import { Launcher } from "@/components/launcher";
import { landingProjectId } from "@/lib/landing";

export const dynamic = "force-dynamic";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ picker?: string }>;
}) {
  const sp = await searchParams;
  const id = await landingProjectId(sp.picker === "1");
  if (id) redirect(`/p/${id}`);
  return <Launcher />;
}
