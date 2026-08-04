import Link from "next/link";
import { ArrowLeft, Shield, Radio, Database } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { LiveFlights } from "@/components/live-flights";

export const dynamic = 'force-dynamic';

export default async function FlightBoardPage() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR', 'GROUND_CREW_LEAD']);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-7xl mx-auto flex flex-col gap-8">
        
        {/* Command Deck Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800/80 backdrop-blur-xl shadow-2xl">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg shadow-blue-900/40">
              <Radio className="h-7 w-7 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white font-mono">
                  AEROFLOW TELEMETRY RADAR
                </h1>
              </div>
              <p className="text-xs text-slate-400 mt-1 font-mono flex items-center gap-2">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Geospatial Radar Engine & Airspace Operations Deck</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link 
              href="/flights/internal" 
              className="px-4 py-2.5 bg-amber-900/40 hover:bg-amber-800/60 text-amber-400 border border-amber-700/50 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg"
            >
              <Database className="h-4 w-4" />
              Internal Fleet
            </Link>
            <Link 
              href="/" 
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 border border-slate-700/80 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-2 shadow-lg"
            >
              <ArrowLeft className="h-4 w-4" />
              Command Center
            </Link>
          </div>
        </div>

        {/* Live Flights Component */}
        <div className="w-full">
          <LiveFlights />
        </div>

      </div>
    </div>
  );
}
