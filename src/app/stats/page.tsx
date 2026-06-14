import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";

export default async function StatsPage() {
  const user = await requireUser();
  redirect(`/stats/${encodeURIComponent(user.name)}`);
}
