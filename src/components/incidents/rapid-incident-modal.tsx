"use client";

import { useState } from "react";
import { 
  AlertTriangle, 
  Flame, 
  Truck, 
  ShieldAlert, 
  X, 
  Send, 
  CheckCircle2, 
  Plane, 
  Biohazard, 
  UserX, 
  AlertOctagon,
  Sparkles
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createGroundIncident } from "@/lib/actions/incidents";

interface RapidIncidentModalProps {
  isOpen: boolean;
  onClose: () => void;
  flights?: Array<{ id: string; flightNumber: string }>;
  defaultFlightId?: string;
  onSuccess?: () => void;
}

const INCIDENT_PRESETS = [
  { id: "FUEL_SPILL", label: "Fuel Spill", icon: Flame, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { id: "EQUIPMENT_COLLISION", label: "Equipment Collision", icon: Truck, color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  { id: "FOD_HAZARD", label: "Foreign Object Debris (FOD)", icon: AlertOctagon, color: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30" },
  { id: "HAZMAT_LEAK", label: "Hazmat / Fluid Leak", icon: Biohazard, color: "text-red-400 bg-red-500/10 border-red-500/30" },
  { id: "PERSONNEL_INJURY", label: "Personnel / Crew Injury", icon: UserX, color: "text-rose-400 bg-rose-500/10 border-rose-500/30" },
  { id: "RAMP_HAZARD", label: "Ramp Safety Hazard", icon: ShieldAlert, color: "text-purple-400 bg-purple-500/10 border-purple-500/30" },
];

export function RapidIncidentModal({
  isOpen,
  onClose,
  flights = [],
  defaultFlightId = "",
  onSuccess
}: RapidIncidentModalProps) {
  const [selectedType, setSelectedType] = useState<string>("FUEL_SPILL");
  const [customType, setCustomType] = useState<string>("");
  const [flightId, setFlightId] = useState<string>(defaultFlightId);
  const [severity, setSeverity] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("HIGH");
  const [description, setDescription] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      setError("Please enter an incident description.");
      return;
    }

    setLoading(true);
    setError(null);

    const typeToSubmit = selectedType === "OTHER" ? (customType.trim() || "OTHER_HAZARD") : selectedType;

    try {
      await createGroundIncident({
        flightId: flightId ? flightId : null,
        type: typeToSubmit,
        description: description.trim(),
        severity,
      });

      setSubmitted(true);
      if (onSuccess) onSuccess();

      setTimeout(() => {
        setSubmitted(false);
        setDescription("");
        onClose();
      }, 1800);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit ground incident report.");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden relative"
        >
          {/* Header Bar */}
          <div className="bg-slate-950/80 p-5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  Rapid Ground Incident &amp; Hazard Reporter
                </h2>
                <p className="text-xs text-slate-400 font-mono">
                  Instant alert push to dispatcher cockpit upon submission
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {submitted ? (
            <div className="p-10 flex flex-col items-center justify-center text-center gap-3">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 12 }}
                className="p-4 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/40"
              >
                <CheckCircle2 size={48} />
              </motion.div>
              <h3 className="text-xl font-bold text-white">Incident Logged &amp; Alert Pushed!</h3>
              <p className="text-sm text-slate-400 max-w-sm">
                High-priority alert has been broadcasted live to the active dispatcher and recorded in the audit log.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {error && (
                <div className="p-3.5 bg-red-950/60 border border-red-800/60 text-red-200 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                  {error}
                </div>
              )}

              {/* Preset Incident Type Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  1. Select Incident Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {INCIDENT_PRESETS.map((preset) => {
                    const Icon = preset.icon;
                    const isSelected = selectedType === preset.id;
                    return (
                      <button
                        type="button"
                        key={preset.id}
                        onClick={() => setSelectedType(preset.id)}
                        className={`p-3 rounded-xl border text-left flex flex-col items-start justify-between gap-2 transition-all ${
                          isSelected
                            ? "bg-indigo-600/30 border-indigo-500 ring-2 ring-indigo-500/50 text-white"
                            : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg border ${preset.color}`}>
                          <Icon size={16} />
                        </div>
                        <span className="text-xs font-semibold">{preset.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Severity Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  2. Severity Level
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { level: "LOW", label: "Low (Info)", bg: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700", active: "bg-blue-600 border-blue-400 text-white ring-2 ring-blue-400/40" },
                    { level: "MEDIUM", label: "Medium", bg: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700", active: "bg-amber-600 border-amber-400 text-white ring-2 ring-amber-400/40" },
                    { level: "HIGH", label: "High", bg: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700", active: "bg-orange-600 border-orange-400 text-white ring-2 ring-orange-400/40" },
                    { level: "CRITICAL", label: "Critical", bg: "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700", active: "bg-red-600 border-red-400 text-white ring-2 ring-red-400/40 animate-pulse" },
                  ].map((s) => (
                    <button
                      type="button"
                      key={s.level}
                      onClick={() => setSeverity(s.level as any)}
                      className={`p-2.5 rounded-xl border text-center text-xs font-bold transition-all ${
                        severity === s.level ? s.active : s.bg
                      }`}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Flight Link */}
              {flights.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono flex items-center justify-between">
                    <span>3. Associated Flight (Optional)</span>
                    <span className="text-[10px] text-slate-500 font-normal">Select if logged during dispatch prep</span>
                  </label>
                  <div className="relative">
                    <Plane className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
                    <select
                      value={flightId}
                      onChange={(e) => setFlightId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-9 pr-4 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    >
                      <option value="">-- General Ground Safety Hazard (No Flight Specified) --</option>
                      {flights.map((f) => (
                        <option key={f.id} value={f.id}>
                          Flight {f.flightNumber}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Incident Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  4. Incident Description &amp; Details
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the hazard location, gate number, involved equipment, or fuel quantity spilled..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 leading-relaxed resize-none"
                  required
                />
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-xl font-semibold text-sm transition-all shadow-lg shadow-red-900/30 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <>
                      <Send size={16} /> Submit &amp; Push Alert
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
