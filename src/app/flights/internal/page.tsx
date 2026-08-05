import { db } from "@/lib/db";
import Link from "next/link";
import { ArrowLeft, Shield, Radio, Cpu, Globe2, Activity } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { InternalFlightsCard } from "../internal-flights-card";
import { getMonitoredFlightIds } from "@/lib/actions/risk-analytics";

export const dynamic = 'force-dynamic';

export default async function InternalFlightsPage() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR', 'GROUND_CREW_LEAD']);

  let flights = await db.flights.findMany({
    include: { route: true },
    orderBy: { flightNumber: 'asc' }
  });

  let initialMonitoredIds = await getMonitoredFlightIds();
  if (!initialMonitoredIds) {
    initialMonitoredIds = flights.map(f => f.id);
  }

  const monitoredCount = initialMonitoredIds?.length ?? 0;
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'UTC' });
  const dateStr = now.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' });

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100 relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.03)_1px,transparent_1px),linear-gradient(to_bottom,rgba(99,102,241,0.03)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-indigo-600/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6 md:px-8 py-6 flex flex-col gap-6">

        {/* ─── System Status Bar ─── */}
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-600 px-1">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              SYS NOMINAL
            </span>
            <span>UTC {timeStr}</span>
            <span>{dateStr}</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-indigo-400/60">AeroFlow IFFMS v2.4.1</span>
          </div>
        </div>

        {/* ─── Page Header ─── */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-5">
            {/* Icon stack */}
            <div className="relative">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-900/40">
                <Shield className="h-7 w-7 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-lg bg-indigo-600 border-2 border-[#06090f] flex items-center justify-center">
                <Activity className="h-2.5 w-2.5 text-white" />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-mono uppercase">
                  Internal Fleet Monitor
                </h1>
                <span className="px-2.5 py-1 text-[9px] font-extrabold tracking-widest rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 uppercase">
                  Secure Deck
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] font-mono text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Cpu className="h-3 w-3 text-indigo-400" />
                  Corporate &amp; Fleet Aviation Surveillance
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5">
                  <Radio className="h-3 w-3 text-emerald-400" />
                  OpenSky Integration Active
                </span>
                <span className="text-slate-700">·</span>
                <span className="flex items-center gap-1.5">
                  <Globe2 className="h-3 w-3 text-cyan-400" />
                  {monitoredCount} Flights Enrolled
                </span>
              </div>
            </div>
          </div>

          <Link
            href="/flights"
            className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold font-mono text-slate-400 hover:text-white bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700/60 hover:border-slate-600 rounded-xl transition-all"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Return to Active Radar
          </Link>
        </div>

        {/* ─── Main Card ─── */}
        <InternalFlightsCard flights={flights} initialMonitoredIds={initialMonitoredIds} />

        {/* ─── Footer note ─── */}
        <p className="text-center text-[10px] font-mono text-slate-700 pb-4">
          AeroFlow Internal Fleet Monitoring System (IFFMS) · Data sourced from OpenSky Network · For authorized personnel only
        </p>
      </div>
    </div>
  );
}
