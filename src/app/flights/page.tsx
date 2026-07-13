import { db } from "@/lib/db";
import Link from "next/link";
import { Activity, Plane } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { mockFlights } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function FlightBoardPage() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR', 'GROUND_CREW_LEAD']);

  let flights = await db.flights.findMany({
    include: {
      route: true
    },
    orderBy: {
      flightNumber: 'asc'
    }
  });

  if (flights.length === 0) {
    flights = mockFlights as any;
  }

  return (
    <div className="flex flex-col gap-8 p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Plane className="text-blue-500" /> Active Flight Board
        </h1>
        <Link href="/" className="px-4 py-2 bg-slate-200 text-slate-900 hover:bg-slate-300 rounded-lg text-sm font-medium transition-colors">
          Return to Command Center
        </Link>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {flights.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No active flights.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-sm">
                <th className="p-4 font-semibold">Flight ID</th>
                <th className="p-4 font-semibold">Origin</th>
                <th className="p-4 font-semibold">Destination</th>
                <th className="p-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {flights.map(flight => (
                <tr key={flight.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-bold text-slate-800">{flight.flightNumber}</td>
                  <td className="p-4 text-slate-600">{flight.route.originId}</td>
                  <td className="p-4 text-slate-600">{flight.route.destinationId}</td>
                  <td className="p-4">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide ${
                      flight.status === 'HOLD' || flight.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                      flight.status === 'SCHEDULED' ? 'bg-slate-100 text-slate-700' :
                      flight.status === 'BOARDING' ? 'bg-amber-100 text-amber-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {flight.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
