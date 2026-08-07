"use client";
import { useState, useTransition } from "react";
import { updateEquipment, deleteEquipment } from "@/lib/actions/equipment";
import { GroundEquipment } from "@prisma/client";
import { Search, Shield, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

const getStatusInfo = (status: string) => {
  switch (status) {
    case "LOW": return { 
      color: "bg-emerald-500", 
      text: "Operational", 
      border: "border-emerald-500/30",
      bg: "bg-emerald-950/60",
      textColor: "text-emerald-300",
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    };
    case "MEDIUM": return { 
      color: "bg-amber-500", 
      text: "Needs Maintenance", 
      border: "border-amber-500/30",
      bg: "bg-amber-950/60",
      textColor: "text-amber-300",
      icon: <AlertCircle className="h-4 w-4 text-amber-400" />
    };
    case "HIGH": return { 
      color: "bg-orange-500", 
      text: "Degraded", 
      border: "border-orange-500/30",
      bg: "bg-orange-950/60",
      textColor: "text-orange-300",
      icon: <AlertCircle className="h-4 w-4 text-orange-400" />
    };
    case "CRITICAL": return { 
      color: "bg-red-500", 
      text: "Out of Service", 
      border: "border-red-500/30",
      bg: "bg-red-950/60",
      textColor: "text-red-300",
      icon: <XCircle className="h-4 w-4 text-red-400" />
    };
    default: return { 
      color: "bg-gray-500", 
      text: "Unknown", 
      border: "border-gray-500/30",
      bg: "bg-gray-950/60",
      textColor: "text-gray-300",
      icon: null
    };
  }
};

interface EquipmentListProps {
  equipment: GroundEquipment[];
  onDelete: (id: string) => void;
  onUpdate: (updated: GroundEquipment) => void;
}

export function EquipmentList({ equipment, onDelete, onUpdate }: EquipmentListProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [isPending, startTransition] = useTransition();

  const filtered = equipment.filter((item) => {
    const matchesSearch = item.identifier.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === "ALL" || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const handleDelete = (id: string) => {
    if (confirm("Delete this equipment permanently?")) {
      startTransition(async () => {
        await deleteEquipment(id);
        onDelete(id);
      });
    }
  };

  const handleQuickStatusChange = (id: string, newStatus: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL") => {
    startTransition(async () => {
      const updated = await updateEquipment(id, { status: newStatus });
      if (updated) {
        onUpdate(updated);
      }
    });
  };

  // Get unique types for filter
  const types = ["All Types", "Towing", "Generator", "Baggage Loader", "Other"];

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl">
      {/* Search & Filter Bar */}
      <div className="flex flex-wrap gap-4 mb-6 pb-4 border-b border-slate-800/80">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search equipment by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border border-slate-700 bg-slate-950 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="w-[180px]">
          <select 
            value={filterType} 
            onChange={(e) => setFilterType(e.target.value)} 
            className="w-full border border-slate-700 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {types.map(t => (
              <option key={t} value={t}>{t === "ALL" ? "All Types" : t}</option>
            ))}
          </select>
        </div>
        <div className="text-xs text-slate-400 font-mono self-center">
          {filtered.length} / {equipment.length} items
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-slate-400 font-mono">
          <Shield className="h-12 w-12 mx-auto text-slate-600 mb-3" />
          <p>No equipment found matching your criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((item) => {
            const statusInfo = getStatusInfo(item.status);
            return (
              <div 
                key={item.id} 
                className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-5 hover:border-slate-700/80 transition-all shadow-lg hover:shadow-xl"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-400" />
                    <h3 className="font-bold text-white text-sm font-mono">{item.identifier}</h3>
                  </div>
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={isPending}
                    className="text-red-500/70 hover:text-red-400 text-xs font-mono transition-colors"
                  >
                    ✕ Delete
                  </button>
                </div>
                
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase border ${statusInfo.border} ${statusInfo.bg} ${statusInfo.textColor}`}>
                    {statusInfo.text}
                  </span>
                  <span className="text-xs text-slate-500 font-mono bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
                    {item.type}
                  </span>
                </div>

                {/* Health Meter */}
                <div className="mt-3">
                  <div className="flex justify-between text-xs text-slate-400 font-mono mb-1">
                    <span>System Health</span>
                    <span className="font-bold">{statusInfo.percent}%</span>
                  </div>
                  <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 rounded-full transition-all duration-500 ${statusInfo.color}`}
                      style={{ width: `${statusInfo.percent}%` }}
                    />
                  </div>
                </div>

                {/* Quick Status Toggle */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1.5">
                    Quick Status
                  </label>
                  <select
                    value={item.status}
                    onChange={(e) => handleQuickStatusChange(item.id, e.target.value as any)}
                    className="w-full border border-slate-700 bg-slate-950 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                    disabled={isPending}
                  >
                    <option value="LOW">Operational</option>
                    <option value="MEDIUM">Needs Maintenance</option>
                    <option value="HIGH">Degraded</option>
                    <option value="CRITICAL">Out of Service</option>
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}