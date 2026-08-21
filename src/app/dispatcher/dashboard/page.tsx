import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import { DispatcherCockpit } from "@/components/dispatcher-cockpit";
import { mockFlights, mockAlerts } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function DispatcherDashboard() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  let flights: any[] = [];
  let threshold = 7.5;
  let unreadAlertsCount = 0;

  try {
    flights = await db.flights.findMany({
      include: {
        route: true,
        risk: true,
        incidents: { where: { resolved: false } },
        checklists: true,
      },
      orderBy: { flightNumber: 'asc' },
    });

    if (flights.length === 0) {
      flights = mockFlights;
    }

    threshold = await getRiskThreshold();
    const totalDbAlerts = await db.alertLogs.count();
    
    if (totalDbAlerts === 0) {
      unreadAlertsCount = mockAlerts.filter(a => !a.read).length;
    } else {
      unreadAlertsCount = await db.alertLogs.count({ where: { read: false } });
    }
  } catch (err) {
    console.error("Dispatcher Dashboard DB Error, falling back to mock data:", err);
    flights = mockFlights;
    unreadAlertsCount = mockAlerts.filter(a => !a.read).length;
  }

  const safeFlights = (flights || []).map(f => ({
    ...f,
    incidents: f.incidents || [],
    checklists: f.checklists || [],
  }));

  return (
    <div className="flex flex-col gap-6">
      <DispatcherCockpit 
        flights={safeFlights}
        threshold={threshold}
        unreadAlertsCount={unreadAlertsCount}
      />
    </div>
  );
}
