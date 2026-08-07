"use client";

import { useState } from "react";
import { AlertTriangle, Plus, ShieldAlert, CheckCircle2, Flame, RefreshCw } from "lucide-react";
import { RapidIncidentModal } from "@/components/incidents/rapid-incident-modal";
import { IncidentsManagementPanel, IncidentItem } from "@/components/incidents/incidents-management-panel";
import { useRouter } from "next/navigation";

interface IncidentsClientProps {
  initialIncidents: IncidentItem[];
  flights: Array<{ id: string; flightNumber: string }>;
  stats: {
    total: number;
    open: number;
    critical: number;
    resolved: number;
  };
}

export function IncidentsClient({
  initialIncidents,
  flights,
  stats
}: IncidentsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-8 pb-12 max-w-7xl mx-auto w-full">
      {/* ── Page Header ── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/10 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/15 text-red-300 text-xs font-mono font-medium border border-red-500/30 mb-2">
            <ShieldAlert size={14} className="text-red-400" /> Ground Safety &amp; Dispatch Protection
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            Rapid Ground Incident &amp; Hazard Reporter
          </h1>
          <p className="text-sm text-white/60 mt-1 max-w-2xl leading-relaxed">
            Report fuel spills, GSE collisions, and ground hazards in real-time. Instantly broadcasts high-priority telemetry alerts to active dispatchers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors"
            title="Refresh Incident Feed"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-red-950/40 flex items-center gap-2"
          >
            <Plus size={18} /> Log Ground Incident
          </button>
        </div>
      </div>

      {/* ── Realtime Stats Bar ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-slate-400">Total Logged</span>
          <div className="text-3xl font-black text-white font-mono mt-2">{stats.total}</div>
          <span className="text-[10px] text-slate-500 mt-1 font-mono">Historical records</span>
        </div>

        <div className="bg-amber-950/30 border border-amber-800/40 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-amber-400">Active / Open</span>
          <div className="text-3xl font-black text-amber-300 font-mono mt-2">{stats.open}</div>
          <span className="text-[10px] text-amber-400/60 mt-1 font-mono">Pending resolution</span>
        </div>

        <div className="bg-red-950/40 border border-red-800/60 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-red-400 flex items-center gap-1">
            <AlertTriangle size={14} /> Critical Hazards
          </span>
          <div className="text-3xl font-black text-red-400 font-mono mt-2">{stats.critical}</div>
          <span className="text-[10px] text-red-400/60 mt-1 font-mono">Blocking dispatch</span>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-800/40 rounded-2xl p-5 flex flex-col justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-emerald-400">Closed &amp; Resolved</span>
          <div className="text-3xl font-black text-emerald-400 font-mono mt-2">{stats.resolved}</div>
          <span className="text-[10px] text-emerald-400/60 mt-1 font-mono">Verified by supervisor</span>
        </div>
      </div>

      {/* ── Main Incidents Management Panel ── */}
      <IncidentsManagementPanel
        initialIncidents={initialIncidents}
        onRefresh={handleRefresh}
      />

      {/* ── Log Incident Modal ── */}
      <RapidIncidentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        flights={flights}
        onSuccess={handleRefresh}
      />
    </div>
  );
}
