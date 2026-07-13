import { getDashboardStats } from "@/lib/actions/risk-analytics";
import { CommandCenterClient } from "./command-center-client";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const stats = await getDashboardStats();

  return <CommandCenterClient stats={stats} />;
}
