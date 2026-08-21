import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RouteTrendsClient } from "./client-trends";
import { mockFlights } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function RouteTrendsPage() {
  await requireRole(['OPERATIONS_DIRECTOR', 'FLIGHT_DISPATCHER', 'GROUND_CREW_LEAD']);

  let flights: any[] = [];
  let savedFilters: any[] = [];

  try {
    flights = await db.flights.findMany({
      where: { risk: { isNot: null } },
      include: { risk: true }
    });

    if (flights.length === 0) {
      flights = mockFlights as any;
    }

    savedFilters = await db.savedFilters.findMany();
  } catch (err) {
    console.error("Route Trends DB Error, falling back to mock flights:", err);
    flights = mockFlights as any;
  }

  // Aggregate by route
  const routesData: Record<string, any[]> = {};
  
  flights.forEach(f => {
    if (!f.risk) return;
    const date = new Date(f.risk.calculatedAt || Date.now());
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    const rId = f.routeId || 'UNKNOWN';
    if (!routesData[rId]) {
      routesData[rId] = [];
    }
    
    let monthEntry = routesData[rId].find(d => d.month === month);
    if (!monthEntry) {
      monthEntry = { month, totalRisk: 0, count: 0 };
      routesData[rId].push(monthEntry);
    }
    
    monthEntry.totalRisk += f.risk.totalScore;
    monthEntry.count += 1;
  });

  // Calculate averages
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

  const availableRoutes = Object.keys(routesData);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-mono">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Flight Route Risk Trends</h1>
      <p className="text-slate-400 text-sm mb-6">Monthly average risk trends analyzed by departure route.</p>
      
      <RouteTrendsClient 
        chartData={chartData} 
        availableRoutes={availableRoutes} 
        savedFilters={savedFilters} 
      />
    </div>
  );
}
