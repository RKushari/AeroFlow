import { requireRole } from "@/lib/auth";
import { fetchDirectorMasterData } from "@/lib/services/director-data";
import { DirectorMasterConsole } from "@/components/director/director-master-console";

export default async function DirectorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Guard the entire director sub-routes
  const session = await requireRole(["OPERATIONS_DIRECTOR", "FLIGHT_DISPATCHER", "GROUND_CREW_LEAD"]);

  const masterData = await fetchDirectorMasterData(session.user.id);

  return (
    <div className="p-4 md:p-6 min-h-screen bg-slate-950 text-slate-100">
      <DirectorMasterConsole
        callerId={session.user.id}
        auditLogs={masterData.auditLogs}
        users={masterData.users}
        threshold={masterData.threshold}
        recentLogs={masterData.recentLogs}
        kpiData={masterData.kpiData}
        broadcasts={masterData.broadcasts}
        airports={masterData.airports}
        flagged={masterData.flagged}
        chartData={masterData.chartData}
        availableRoutes={masterData.availableRoutes}
        savedFilters={masterData.savedFilters}
      />
    </div>
  );
}
