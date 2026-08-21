import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { getRiskThreshold } from "@/lib/config";
import { DispatcherCockpit } from "@/components/dispatcher-cockpit";

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

  const threshold = await getRiskThreshold();
  const totalDbAlerts = await db.alertLogs.count();
  let unreadAlertsCount = 0;
  
  if (totalDbAlerts === 0) {
    const { mockAlerts } = await import("@/lib/mock-data");
    unreadAlertsCount = mockAlerts.filter(a => !a.read).length;
  } else {
    unreadAlertsCount = await db.alertLogs.count({ where: { read: false } });
  }

  return (
    <div className="flex flex-col gap-6">
      <DispatcherCockpit 
        flights={flights}
        threshold={threshold}
        unreadAlertsCount={unreadAlertsCount}
      />
    </div>
  );
}
