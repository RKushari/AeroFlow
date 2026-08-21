import { db } from "@/lib/db";
import { getRiskThreshold } from "@/lib/config";
import { 
  mockLedger, 
  mockBroadcasts, 
  mockKpiAnalytics, 
  mockFlights 
} from "@/lib/mock-data";
import { Role } from "@prisma/client";
import { normalizeDashboardLayout } from "@/app/director/analytics/layout-utils";

const DEFAULT_MOCK_USERS = [
  { id: 'usr-1', name: 'John Doe (Director)', email: 'johndoe@gmail.com', role: Role.OPERATIONS_DIRECTOR },
  { id: 'usr-2', name: 'Alex Vance (Dispatcher)', email: 'dispatcher@aeroflow.com', role: Role.FLIGHT_DISPATCHER },
  { id: 'usr-3', name: 'Sam Miller (Crew Lead)', email: 'crew@aeroflow.com', role: Role.GROUND_CREW_LEAD },
];

export async function fetchDirectorMasterData(userId: string) {
  let auditLogs: any[] = [];
  let users: any[] = [];
  let threshold = 7.5;
  let recentLogs: any[] = [];
  let incidentsRaw: any[] = [];
  let flights: any[] = [];
  let shiftLogs: any[] = [];
  let preferences: any = null;
  let broadcasts: any[] = [];
  let monitoredCodes: string[] = ['JFK', 'LAX', 'ORD', 'MIA', 'SEA'];
  let flagged: any[] = [];
  let savedFilters: any[] = [];

  try {
    const results = await Promise.allSettled([
      db.auditLedger.findMany({ orderBy: { timestamp: 'desc' }, take: 50 }),
      db.users.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true } }),
      getRiskThreshold(),
      db.auditLedger.findMany({ where: { action: { in: ['SIGN_IN', 'UPDATE_USER_ROLE', 'UPDATE_SYSTEM_CONFIG'] } }, orderBy: { timestamp: 'desc' }, take: 50 }),
      db.incidents.findMany({ include: { flight: { include: { risk: true } } } }),
      db.flights.findMany({ include: { risk: true, checklists: { include: { items: true } } }, take: 100, orderBy: { id: 'desc' } }),
      db.shiftLogs.findMany({ orderBy: { startTime: 'desc' }, take: 100 }),
      db.dashboardPreferences.findUnique({ where: { userId } }),
      db.broadcastMessages.findMany({ orderBy: { createdAt: 'desc' }, take: 50 }),
      db.systemConfig.findUnique({ where: { key: 'monitored_airports' } }),
      db.flaggedZones.findMany(),
      db.savedFilters.findMany(),
    ]);

    if (results[0].status === 'fulfilled' && results[0].value.length > 0) auditLogs = results[0].value;
    else auditLogs = mockLedger as any;

    if (results[1].status === 'fulfilled' && results[1].value.length > 0) users = results[1].value;
    else users = DEFAULT_MOCK_USERS;

    if (results[2].status === 'fulfilled') threshold = results[2].value;

    if (results[3].status === 'fulfilled') recentLogs = results[3].value;

    if (results[4].status === 'fulfilled') incidentsRaw = results[4].value;

    if (results[5].status === 'fulfilled') flights = results[5].value;

    if (results[6].status === 'fulfilled') shiftLogs = results[6].value;

    if (results[7].status === 'fulfilled') preferences = results[7].value;

    if (results[8].status === 'fulfilled' && results[8].value.length > 0) broadcasts = results[8].value;
    else broadcasts = mockBroadcasts as any;

    if (results[9].status === 'fulfilled' && results[9].value?.value) {
      monitoredCodes = JSON.parse(results[9].value.value);
    }

    if (results[10].status === 'fulfilled') flagged = results[10].value;

    if (results[11].status === 'fulfilled') savedFilters = results[11].value;

  } catch (err) {
    console.error("Director Master Data Fetch Error, using mock fallbacks:", err);
    auditLogs = mockLedger as any;
    users = DEFAULT_MOCK_USERS;
    broadcasts = mockBroadcasts as any;
    flights = mockFlights as any;
  }

  // Weather processing for risk map
  const { fetchWeatherSeverity } = await import("@/lib/services/weather");
  const { globalAirports } = await import("@/lib/data/airports");

  const baseAirports = monitoredCodes.map(code => {
    const ap = globalAirports.find(a => a.code === code);
    return ap || { code, name: code, lat: 0, lng: 0, city: '', country: '' };
  });

  const airports = await Promise.all(
    baseAirports.map(async (ap) => {
      try {
        const weather = await fetchWeatherSeverity(ap.code);
        return { 
          ...ap, 
          risk: weather.severityIndex * 10,
          hourlyForecast: weather.rawData?.hourly 
        };
      } catch (e) {
        return { ...ap, risk: 0 };
      }
    })
  );

  // KPI Calculations
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

  const riskData = (flights.length > 0 ? flights : mockFlights)
    .filter(f => f.risk)
    .map(f => ({ name: f.flightNumber, risk: f.risk!.totalScore }));

  const fatigueData = shiftLogs.map((log, i) => ({
    name: `Log ${i}`,
    fatigue: log.fatigueIndex
  }));

  const checklistData = (flights.length > 0 ? flights : mockFlights).map(f => {
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

  // Route Trends Calculations
  const effectiveFlights = flights.length > 0 ? flights : mockFlights;
  const routesData: Record<string, any[]> = {};
  effectiveFlights.forEach(f => {
    if (!f.risk) return;
    const date = new Date(f.risk.calculatedAt || Date.now());
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const rId = f.routeId || 'UNKNOWN';
    if (!routesData[rId]) routesData[rId] = [];
    let monthEntry = routesData[rId].find(d => d.month === month);
    if (!monthEntry) {
      monthEntry = { month, totalRisk: 0, count: 0 };
      routesData[rId].push(monthEntry);
    }
    monthEntry.totalRisk += f.risk.totalScore;
    monthEntry.count += 1;
  });

  const chartData: any[] = [];
  const monthsSet = new Set<string>();
  Object.values(routesData).forEach(routeList => {
    routeList.forEach(entry => monthsSet.add(entry.month));
  });
  const sortedMonths = Array.from(monthsSet).sort();
  sortedMonths.forEach(month => {
    const dataPoint: any = { month };
    Object.keys(routesData).forEach(route => {
      const routeMonth = routesData[route].find(d => d.month === month);
      if (routeMonth) {
        dataPoint[route] = (routeMonth.totalRisk / routeMonth.count).toFixed(2);
      }
    });
    chartData.push(dataPoint);
  });

  const serializedAuditLogs = auditLogs.map(log => ({
    ...log,
    timestamp: log.timestamp instanceof Date ? log.timestamp.toISOString() : log.timestamp,
  }));

  return {
    auditLogs: serializedAuditLogs,
    users,
    threshold,
    recentLogs,
    kpiData: {
      incidentData: incidentsRaw.length > 0 ? incidentData : mockKpiAnalytics.incidentData,
      riskData: riskData.length > 0 ? riskData.slice(0, 10) : mockKpiAnalytics.riskData,
      fatigueData: fatigueData.length > 0 ? fatigueData.slice(0, 10) : mockKpiAnalytics.fatigueData,
      checklistData: checklistData.length > 0 ? checklistData.slice(0, 10) : mockKpiAnalytics.checklistData,
      initialLayout: normalizeDashboardLayout(preferences?.layoutConfig ? (preferences.layoutConfig as any).layout : null),
    },
    broadcasts,
    airports,
    flagged,
    chartData,
    availableRoutes: Object.keys(routesData),
    savedFilters,
  };
}
