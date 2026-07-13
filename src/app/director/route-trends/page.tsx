import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RouteTrendsClient } from "./client-trends";

export default async function RouteTrendsPage() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  // Fetch flights and group by routeId and month.
  // In a real prod environment we'd use raw SQL for group by month,
  // but Prisma makes Date grouping tricky without rawQuery, so for the prototype
  // we pull recent risk calculations and aggregate manually or use raw.
  
  let flights = await db.flights.findMany({
    where: { risk: { isNot: null } },
    include: { risk: true }
  });

  if (flights.length === 0) {
    const { mockFlights } = await import("@/lib/mock-data");
    flights = mockFlights as any;
  }

  const savedFilters = await db.savedFilters.findMany();

  // Aggregate by route
  const routesData: Record<string, any[]> = {};
  
  flights.forEach(f => {
    if (!f.risk) return;
    const date = new Date(f.risk.calculatedAt);
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    
    if (!routesData[f.routeId]) {
      routesData[f.routeId] = [];
    }
    
    let monthEntry = routesData[f.routeId].find(d => d.month === month);
    if (!monthEntry) {
      monthEntry = { month, totalRisk: 0, count: 0 };
      routesData[f.routeId].push(monthEntry);
    }
    
    monthEntry.totalRisk += f.risk.totalScore;
    monthEntry.count += 1;
  });

  // Calculate averages
  const chartData: any[] = [];
  // For Recharts we want an array where each object is a month, with routes as keys
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
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Flight Route Risk Trends</h1>
      <p className="text-slate-500 mb-8">Monthly average risk trends analyzed by departure route.</p>
      
      <RouteTrendsClient 
        chartData={chartData} 
        availableRoutes={availableRoutes} 
        savedFilters={savedFilters} 
      />
    </div>
  );
}
