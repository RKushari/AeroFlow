import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Shield } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { InternalFlightsCard } from "../internal-flights-card";

export const dynamic = 'force-dynamic';

export default async function InternalFlightsPage() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR', 'GROUND_CREW_LEAD']);

  let flights = await db.flights.findMany({
    include: {
      route: true
    },
    orderBy: {
      flightNumber: 'asc'
    }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Command Deck Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-amber-600 to-orange-600 text-white rounded-xl shadow-lg shadow-amber-900/40">
              <Shield className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
                  INTERNAL FLEET MONITOR
                </h1>
                <span className="px-2.5 py-1 text-[10px] font-bold font-mono rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  SECURE DECK
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                <span>AeroFlow Corporate & Fleet Aviation Tracking</span>
              </p>
            </div>
          </div>

          <Link 
            href="/flights" 
            className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg"
          >
            <ArrowLeft className="h-4 w-4" />
            Return to Active Radar
          </Link>
        </div>

        {/* AeroFlow Internal Monitored Flights */}
        <div className="w-full">
          <InternalFlightsCard flights={flights} />
        </div>

      </div>
    </div>
  );
}
