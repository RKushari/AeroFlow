import { requireRole } from "@/lib/auth";
import Link from "next/link";

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard the entire director sub-routes
  await requireRole(["OPERATIONS_DIRECTOR"]);

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Sub-navigation */}
      <div className="flex border-b border-white/10 pb-2 gap-6">
        <Link 
          href="/director/ledger" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          Compliance Ledger
        </Link>
        <Link 
          href="/director/admin" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          Admin Panel
        </Link>
        <Link 
          href="/director/analytics" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          KPI Analytics
        </Link>
        <Link 
          href="/director/broadcasts" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          Broadcasts
        </Link>
        <Link 
          href="/director/risk-map" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          Risk Map
        </Link>
        <Link 
          href="/director/route-trends" 
          className="text-sm font-semibold text-white/70 hover:text-white pb-2 hover:border-b-2 hover:border-blue-500 transition-colors"
        >
          Route Trends
        </Link>
      </div>
      <div>
        {children}
      </div>
    </div>
  );
}
