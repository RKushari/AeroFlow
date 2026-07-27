import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RiskMapClient } from "./client-map";

export default async function RiskMapPage() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  const { fetchWeatherSeverity } = await import("@/lib/services/weather");
  const { globalAirports } = await import("@/lib/data/airports");

  const config = await db.systemConfig.findUnique({ where: { key: 'monitored_airports' } });
  const monitoredCodes: string[] = config ? JSON.parse(config.value) : ['JFK', 'LAX', 'ORD', 'MIA', 'SEA'];

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
        console.warn(`Weather fetch failed for ${ap.code}`, e);
        return { ...ap, risk: 0 };
      }
    })
  );

  // Fetch flagged zones
  let flagged = await db.flaggedZones.findMany();
  


  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Weather Risk Map</h1>
      <p className="text-slate-500 mb-8">Real-time geographic risk visualization and zone flagging.</p>
      
      <RiskMapClient airports={airports} initialFlagged={flagged} />
    </div>
  );
}
