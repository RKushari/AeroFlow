import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getIncidents, getGroundIncidentStats } from "@/lib/actions/incidents";
import { IncidentsClient } from "./incidents-client";

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const [incidentsData, stats, activeFlights] = await Promise.all([
    getIncidents(),
    getGroundIncidentStats(),
    db.flights.findMany({
      select: { id: true, flightNumber: true, status: true },
      orderBy: { flightNumber: 'asc' }
    }),
  ]);

  return (
    <div className="container mx-auto px-4 py-6">
      <IncidentsClient
        initialIncidents={incidentsData as any}
        flights={activeFlights}
        stats={stats}
      />
    </div>
  );
}
