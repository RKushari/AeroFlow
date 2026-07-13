import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { RiskMapClient } from "./client-map";

export default async function RiskMapPage() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  // We fetch current flights with weather and calculate a score per airport (origin/destination)
  // For the prototype, we'll just mock airport coordinates and their current max risk.
  const airports = [
    { code: 'JFK', name: 'John F. Kennedy Intl', cx: 80, cy: 30, risk: Math.random() * 10 },
    { code: 'LAX', name: 'Los Angeles Intl', cx: 20, cy: 60, risk: Math.random() * 10 },
    { code: 'ORD', name: 'Chicago O\'Hare Intl', cx: 60, cy: 35, risk: Math.random() * 10 },
    { code: 'MIA', name: 'Miami Intl', cx: 75, cy: 80, risk: Math.random() * 10 },
    { code: 'SEA', name: 'Seattle-Tacoma Intl', cx: 15, cy: 20, risk: Math.random() * 10 },
  ];

  // Fetch flagged zones
  let flagged = await db.flaggedZones.findMany();
  
  if (flagged.length === 0) {
    flagged = (await import("@/lib/mock-data")).mockRiskMap as any;
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-2">Weather Risk Map</h1>
      <p className="text-slate-500 mb-8">Real-time geographic risk visualization and zone flagging.</p>
      
      <RiskMapClient airports={airports} initialFlagged={flagged} />
    </div>
  );
}
