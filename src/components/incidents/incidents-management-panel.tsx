"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Filter, 
  Search, 
  User, 
  FileText, 
  ShieldAlert, 
  CheckSquare, 
  RefreshCw, 
  X, 
  Flame, 
  Truck, 
  Biohazard, 
  UserX, 
  AlertOctagon,
  Plane,
  ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { updateIncidentResolution } from "@/lib/actions/incidents";

export interface IncidentItem {
  id: string;
  type: string;
  description: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  resolved: boolean;
  resolutionNotes?: string | null;
  resolvedAt?: Date | string | null;
  createdAt: Date | string;
  flightId?: string | null;
  flight?: { flightNumber: string; status: string } | null;
  reporter?: { name: string; email: string; role: string } | null;
  resolvedBy?: { name: string; email: string; role: string } | null;
}

interface IncidentsManagementPanelProps {
  initialIncidents: IncidentItem[];
  userRole?: string;
  onRefresh?: () => void;
}

export function IncidentsManagementPanel({
  initialIncidents,
  userRole,
  onRefresh
}: IncidentsManagementPanelProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>(initialIncidents);
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "RESOLVED" | "CRITICAL">("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [isResolvedCheck, setIsResolvedCheck] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleOpenResolutionModal = (incident: IncidentItem) => {
    setSelectedIncident(incident);
    setResolutionNotes(incident.resolutionNotes || "");
    setIsResolvedCheck(incident.resolved);
    setErrorMsg(null);
  };

  const handleSaveResolution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedIncident) return;

    if (!resolutionNotes.trim()) {
      setErrorMsg("Please enter resolution notes detailing action taken.");
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const updated = await updateIncidentResolution({
        incidentId: selectedIncident.id,
        resolutionNotes: resolutionNotes.trim(),
        resolved: isResolvedCheck,
      });

      setIncidents((prev) =>
        prev.map((item) =>
          item.id === selectedIncident.id
            ? {
                ...item,
                resolved: updated.resolved,
                resolutionNotes: updated.resolutionNotes,
                resolvedAt: updated.resolvedAt,
                resolvedBy: updated.resolvedBy,
              }
            : item
        )
      );

      setSelectedIncident(null);
      if (onRefresh) onRefresh();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to update incident resolution status.");
    } finally {
      setSubmitting(false);
    }
  };

  const filtered = incidents.filter((inc) => {
    // Status filter
    if (filterStatus === "OPEN" && inc.resolved) return false;
    if (filterStatus === "RESOLVED" && !inc.resolved) return false;
    if (filterStatus === "CRITICAL" && inc.severity !== "CRITICAL") return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchType = inc.type.toLowerCase().includes(q);
      const matchDesc = inc.description.toLowerCase().includes(q);
      const matchFlight = inc.flight?.flightNumber.toLowerCase().includes(q);
      const matchReporter = inc.reporter?.name.toLowerCase().includes(q);
      return matchType || matchDesc || matchFlight || matchReporter;
    }

    return true;
  });

  const getPresetIcon = (type: string) => {
    switch (type) {
      case "FUEL_SPILL": return Flame;
      case "EQUIPMENT_COLLISION": return Truck;
      case "HAZMAT_LEAK": return Biohazard;
      case "PERSONNEL_INJURY": return UserX;
      case "FOD_HAZARD": return AlertOctagon;
      default: return ShieldAlert;
    }
  };

  return (
    <div className="space-y-6">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1 w-full max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search hazards by type, description, flight, or reporter..."
            className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: "ALL", label: "All Incidents" },
            { id: "OPEN", label: "Active / Open" },
            { id: "CRITICAL", label: "Critical" },
            { id: "RESOLVED", label: "Closed / Resolved" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${
                filterStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-900/30"
                  : "bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Incidents */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((incident) => {
          const IconComponent = getPresetIcon(incident.type);
          const isCritical = incident.severity === "CRITICAL";

          return (
            <motion.div
              layout
              key={incident.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border p-5 flex flex-col justify-between gap-4 transition-all relative ${
                incident.resolved
                  ? "bg-slate-900/50 border-slate-800/70 text-slate-400 opacity-80"
                  : isCritical
                  ? "bg-red-950/40 border-red-800/60 text-red-100 shadow-lg shadow-red-950/40"
                  : "bg-slate-900 border-slate-800 text-white"
              }`}
            >
              <div>
                {/* Header info */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${
                      isCritical ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                    }`}>
                      <IconComponent size={18} />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-white capitalize">
                        {incident.type.replace(/_/g, " ")}
                      </h4>
                      <p className="text-[11px] text-slate-400 font-mono">
                        {new Date(incident.createdAt).toLocaleTimeString()} · {new Date(incident.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                    incident.resolved
                      ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
                      : incident.severity === "CRITICAL"
                      ? "bg-red-500/20 border-red-500/40 text-red-300 animate-pulse"
                      : incident.severity === "HIGH"
                      ? "bg-orange-500/20 border-orange-500/40 text-orange-300"
                      : incident.severity === "MEDIUM"
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-300"
                      : "bg-blue-500/20 border-blue-500/40 text-blue-300"
                  }`}>
                    {incident.resolved ? "Resolved" : incident.severity}
                  </span>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 mb-3 font-sans">
                  {incident.description}
                </p>

                {/* Flight & Reporter Metadata */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 font-mono">
                  <div className="flex items-center gap-1.5">
                    <Plane size={13} className="text-slate-500" />
                    <span>{incident.flight ? `Flight ${incident.flight.flightNumber}` : "General Ramp"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate">
                    <User size={13} className="text-slate-500 shrink-0" />
                    <span className="truncate">{incident.reporter?.name || incident.reporter?.email || "Ground Crew"}</span>
                  </div>
                </div>

                {/* Resolution Notes preview if resolved */}
                {incident.resolutionNotes && (
                  <div className="mt-3 p-2.5 bg-emerald-950/30 border border-emerald-800/40 rounded-xl text-xs text-emerald-300">
                    <span className="font-bold text-[10px] uppercase block text-emerald-400 font-mono mb-0.5">
                      Resolution Notes ({incident.resolvedBy?.name || "Supervisor"})
                    </span>
                    {incident.resolutionNotes}
                  </div>
                )}
              </div>

              {/* Action Button */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-500 font-mono">ID: {incident.id.slice(0, 8)}</span>
                <button
                  onClick={() => handleOpenResolutionModal(incident)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 ${
                    incident.resolved
                      ? "bg-slate-800 hover:bg-slate-700 text-slate-300"
                      : "bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-900/30"
                  }`}
                >
                  {incident.resolved ? (
                    <>Update Notes <ChevronRight size={14} /></>
                  ) : (
                    <>Resolve &amp; Close <CheckCircle2 size={14} /></>
                  )}
                </button>
              </div>
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/40 border border-slate-800/60 rounded-2xl">
            <ShieldAlert size={40} className="mx-auto mb-3 opacity-30 text-slate-400" />
            <p className="text-sm font-medium">No ground incidents found matching current filter.</p>
          </div>
        )}
      </div>

      {/* Resolution & Closure Modal */}
      <AnimatePresence>
        {selectedIncident && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden"
            >
              <button
                onClick={() => setSelectedIncident(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <CheckSquare size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Supervisor Resolution &amp; Closure
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">
                    Incident ID: {selectedIncident.id}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveResolution} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-xl">
                    {errorMsg}
                  </div>
                )}

                {/* Incident summary */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1.5">
                  <div className="flex justify-between font-mono text-slate-400">
                    <span>Type: <strong className="text-white">{selectedIncident.type}</strong></span>
                    <span>Severity: <strong className="text-amber-400">{selectedIncident.severity}</strong></span>
                  </div>
                  <p className="text-slate-300 italic">{selectedIncident.description}</p>
                </div>

                {/* Resolution Notes Input */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Resolution Notes &amp; Corrective Action Taken
                  </label>
                  <textarea
                    rows={4}
                    value={resolutionNotes}
                    onChange={(e) => setResolutionNotes(e.target.value)}
                    placeholder="Enter details of cleanup, equipment inspection, supervisor sign-off, or mitigation steps..."
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                    required
                  />
                </div>

                {/* Toggle Resolved Checkbox */}
                <label className="flex items-center gap-3 p-3 bg-slate-950/60 border border-slate-800 rounded-xl cursor-pointer hover:bg-slate-950 transition-colors">
                  <input
                    type="checkbox"
                    checked={isResolvedCheck}
                    onChange={(e) => setIsResolvedCheck(e.target.checked)}
                    className="h-4 w-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      Mark Incident as Fully Resolved / Closed
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Clears dispatch hold constraint if linked to an active flight
                    </span>
                  </div>
                </label>

                {/* Submit button */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIncident(null)}
                    className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-all shadow-lg shadow-indigo-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {submitting ? (
                      <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : (
                      "Save & Update Incident"
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
