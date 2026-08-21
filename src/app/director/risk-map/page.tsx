import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RiskMapClient } from "./client-map";

export const dynamic = 'force-dynamic';

export default async function RiskMapPage() {
  await requireRole(['OPERATIONS_DIRECTOR', 'FLIGHT_DISPATCHER', 'GROUND_CREW_LEAD']);

  const { fetchWeatherSeverity } = await import("@/lib/services/weather");
  const { globalAirports } = await import("@/lib/data/airports");

  let monitoredCodes: string[] = ['JFK', 'LAX', 'ORD', 'MIA', 'SEA'];
  let flagged: any[] = [];

  try {
    const config = await db.systemConfig.findUnique({ where: { key: 'monitored_airports' } });
    if (config?.value) {
      monitoredCodes = JSON.parse(config.value);
    }
    flagged = await db.flaggedZones.findMany();
  } catch (err) {
    console.error("Risk Map DB Error, falling back to default monitored airports:", err);
  }

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto font-mono">
      <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Weather Risk Map</h1>
      <p className="text-slate-400 text-sm mb-6">Real-time geographic risk visualization and zone flagging.</p>
      
      <RiskMapClient airports={airports} initialFlagged={flagged} />
    </div>
  );
}
