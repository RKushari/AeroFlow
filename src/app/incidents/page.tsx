import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getIncidents, getGroundIncidentStats } from "@/lib/actions/incidents";
import { IncidentsClient } from "./incidents-client";
import { mockIncidents, mockFlights } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function IncidentsPage() {
  await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  let incidentsData: any[] = [];
  let stats: any = { total: 0, open: 0, critical: 0, resolved: 0, recentUnresolved: [] };
  let activeFlights: any[] = [];

  try {
    const results = await Promise.allSettled([
      getIncidents(),
      getGroundIncidentStats(),
      db.flights.findMany({
        select: { id: true, flightNumber: true, status: true },
        orderBy: { flightNumber: 'asc' }
      }),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value) {
      incidentsData = results[0].value;
    } else {
      incidentsData = mockIncidents;
    }

    if (results[1].status === 'fulfilled' && results[1].value) {
      stats = results[1].value;
    } else {
      stats = {
        total: mockIncidents.length,
        open: mockIncidents.filter(i => !i.resolved).length,
        critical: 0,
        resolved: mockIncidents.filter(i => i.resolved).length,
        recentUnresolved: mockIncidents.filter(i => !i.resolved)
      };
    }

    if (results[2].status === 'fulfilled' && results[2].value && results[2].value.length > 0) {
      activeFlights = results[2].value;
    } else {
      activeFlights = mockFlights.map(f => ({ id: f.id, flightNumber: f.flightNumber, status: f.status }));
    }
  } catch (err) {
    console.error("IncidentsPage fetch error, falling back to mock data:", err);
    incidentsData = mockIncidents;
    activeFlights = mockFlights.map(f => ({ id: f.id, flightNumber: f.flightNumber, status: f.status }));
  }

  return (
    <div className="container mx-auto px-4 py-6 font-mono">
      <IncidentsClient
        initialIncidents={incidentsData as any}
        flights={activeFlights}
        stats={stats}
      />
    </div>
  );
}
