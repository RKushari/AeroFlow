import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import { SSEBanners } from "@/components/alerts/sse-banners";
import { StaggerContainer, StaggerItem } from "@/components/animations/stagger-container";
import { FadeIn } from "@/components/animations/fade-in";

export const dynamic = 'force-dynamic';

export default async function DispatcherDashboard() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  let flights = await db.flights.findMany({
    include: {
      route: true,
      risk: true,
      incidents: { where: { resolved: false } },
      checklists: true,
    },
    orderBy: { flightNumber: 'asc' },
  });

  const threshold = await getRiskThreshold();
  const totalDbAlerts = await db.alertLogs.count();
  let unreadAlertsCount = 0;
  
  if (totalDbAlerts === 0) {
    const { mockAlerts } = await import("@/lib/mock-data");
    unreadAlertsCount = mockAlerts.filter(a => !a.read).length;
  } else {
    unreadAlertsCount = await db.alertLogs.count({ where: { read: false } });
  }

  const activeIncidentsCount = await db.incidents.count({ where: { resolved: false } });

  return (
    <div className="flex flex-col gap-6">
      <SSEBanners />
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Readiness Cockpit</h1>
        <div className="flex gap-2">
          <Link 
            href="/incidents" 
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 shadow-md shadow-red-950/30"
          >
            <span>Ground Incidents</span>
            {activeIncidentsCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-white text-red-700 rounded-full font-mono">
                {activeIncidentsCount}
              </span>
            )}
          </Link>
          <Link 
            href="/dispatcher/flights/new" 
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Declare Flight
          </Link>
          <Link 
            href="/dispatcher/alerts" 
            className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300"
          >
            Alerts ({unreadAlertsCount})
          </Link>
        </div>
      </div>

      <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flights.map((flight) => {
          const isCritical = flight.risk && flight.risk.totalScore >= threshold;
          const hasIncidents = flight.incidents.length > 0;
          const blocked = isCritical || hasIncidents || flight.status === 'HOLD';

          return (
            <StaggerItem key={flight.id}>
              <Link
                href={`/dispatcher/flight/${flight.id}`}
              className={`p-5 border rounded-xl shadow-sm flex flex-col gap-3 transition-shadow hover:shadow-md ${
                blocked ? 'bg-red-50 border-red-200' : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex justify-between items-center">
                <span className="font-bold text-lg">{flight.flightNumber}</span>
                <span className={`text-xs font-bold px-2 py-1 rounded-full ${blocked ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                  {blocked ? 'BLOCKED' : 'READY'}
                </span>
              </div>
              
              <div className="text-sm text-slate-600 flex flex-col gap-1">
                <div>Route: {flight.routeId}</div>
                <div>Risk Score: {flight.risk ? flight.risk.totalScore.toFixed(2) : 'Pending'}</div>
              </div>

              {blocked && (
                <div className="mt-2 p-2 bg-red-100/50 rounded text-xs text-red-800 font-medium">
                  {isCritical && <div>• Critical Risk Band</div>}
                  {hasIncidents && <div>• Unresolved Incidents ({flight.incidents.length})</div>}
                </div>
              )}
              </Link>
            </StaggerItem>
          );
        })}

        {flights.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No active flights requiring dispatch.
          </div>
        )}
      </StaggerContainer>
    </div>
  );
}
