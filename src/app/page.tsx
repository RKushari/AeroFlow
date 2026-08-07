import { getDashboardStats } from "@/lib/actions/risk-analytics";
import { CommandCenterClient } from "./command-center-client";

export const dynamic = 'force-dynamic';

export default async function Home() {
  let stats = { flightsCount: 0, alertsCount: 0 };
  try {
    stats = await getDashboardStats();
  } catch (err) {
    console.error("Failed to load dashboard stats:", err);
  }

  return <CommandCenterClient stats={stats} />;
}
