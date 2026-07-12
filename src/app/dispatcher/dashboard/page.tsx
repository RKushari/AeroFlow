import Link from "next/link";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function DispatcherDashboard() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const flights = await db.flights.findMany({
    include: {
      route: true,
      risk: true,
      incidents: { where: { resolved: false } },
      checklists: true,
    },
    orderBy: { flightNumber: 'asc' },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Readiness Cockpit</h1>
        <div className="flex gap-2">
          {/* SSE Alert Drawer Trigger */}
          <button className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-300">
            Alerts (3)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flights.map((flight) => {
          const isCritical = flight.risk && flight.risk.totalScore >= 0.75;
          const hasIncidents = flight.incidents.length > 0;
          const blocked = isCritical || hasIncidents || flight.status === 'HOLD';

          return (
            <Link
              key={flight.id}
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
          );
        })}

        {flights.length === 0 && (
          <div className="col-span-full p-8 text-center text-slate-500 bg-white border border-slate-200 rounded-xl">
            No active flights requiring dispatch.
          </div>
        )}
      </div>
    </div>
  );
}
