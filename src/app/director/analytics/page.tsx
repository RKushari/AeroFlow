import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { AnalyticsWrapper } from "./analytics-wrapper";
import { mockKpiAnalytics } from "@/lib/mock-data";
import { normalizeDashboardLayout } from "./layout-utils";

export const dynamic = 'force-dynamic';

export default async function AnalyticsPage() {
  const session = await requireRole(['OPERATIONS_DIRECTOR', 'FLIGHT_DISPATCHER', 'GROUND_CREW_LEAD']);

  let incidentsRaw: any[] = [];
  let flights: any[] = [];
  let shiftLogs: any[] = [];
  let preferences: any = null;

  try {
    incidentsRaw = await db.incidents.findMany({ 
      include: { flight: { include: { risk: true } } } 
    });
    
    flights = await db.flights.findMany({
      include: {
        risk: true,
        checklists: { include: { items: true } }
      },
      take: 100,
      orderBy: { id: 'desc' }
    });

    shiftLogs = await db.shiftLogs.findMany({
      orderBy: { startTime: 'desc' },
      take: 100
    });

    preferences = await db.dashboardPreferences.findUnique({
      where: { userId: session.user.id }
    });
  } catch (err) {
    console.error("Analytics DB Error, falling back to mock analytics:", err);
  }

  // Calculate Incident Stats (grouped by month)
  const incidentMonths: Record<string, any> = {};
  incidentsRaw.forEach(i => {
    const date = i.flight?.risk?.calculatedAt ? new Date(i.flight.risk.calculatedAt) : new Date();
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    if (!incidentMonths[month]) {
      incidentMonths[month] = { month, CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    }
    incidentMonths[month][i.severity] = (incidentMonths[month][i.severity] || 0) + 1;
  });
  const incidentData = Object.values(incidentMonths).sort((a: any, b: any) => a.month.localeCompare(b.month));

  // Calculate Risk Trends (avg per flight)
  const riskData = flights
    .filter(f => f.risk)
    .map(f => ({ name: f.flightNumber, risk: f.risk!.totalScore }));

  // Fatigue Trends
  const fatigueData = shiftLogs.map((log, i) => ({
    name: `Log ${i}`,
    fatigue: log.fatigueIndex
  }));

  // Checklist Completion
  const checklistData = flights.map(f => {
    let total = 0;
    let complete = 0;
    (f.checklists || []).forEach((c: any) => {
      (c.items || []).forEach((item: any) => {
        total++;
        if (item.isComplete) complete++;
      });
    });
    return { name: f.flightNumber, rate: total > 0 ? (complete / total) * 100 : 0 };
  });

  return (
    <div className="p-4 md:p-6 font-mono">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white">Executive Safety KPI Analytics</h1>
      <AnalyticsWrapper 
        userId={session.user.id}
        incidentData={incidentsRaw.length > 0 ? incidentData : mockKpiAnalytics.incidentData}
        riskData={flights.length > 0 ? riskData.slice(0, 10) : mockKpiAnalytics.riskData}
        fatigueData={shiftLogs.length > 0 ? fatigueData.slice(0, 10) : mockKpiAnalytics.fatigueData}
        checklistData={flights.length > 0 ? checklistData.slice(0, 10) : mockKpiAnalytics.checklistData}
        initialLayout={normalizeDashboardLayout(preferences?.layoutConfig ? (preferences.layoutConfig as any).layout : null)}
      />
    </div>
  );
}
