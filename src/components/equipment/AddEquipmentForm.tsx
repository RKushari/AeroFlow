"use client";
import { useState, useTransition } from "react";
import { createEquipment } from "@/lib/actions/equipment";
import { Wrench } from "lucide-react";

interface AddEquipmentFormProps {
  onAdd?: (newEquipment: any) => void;
}

export function AddEquipmentForm({ onAdd }: AddEquipmentFormProps) {
  const [isPending, startTransition] = useTransition();
  const [identifier, setIdentifier] = useState("");
  const [type, setType] = useState("TOWING");
  const [status, setStatus] = useState<"LOW" | "MEDIUM" | "HIGH" | "CRITICAL">("LOW");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const newEquipment = await createEquipment({ identifier, type, status });
      // Call the onAdd callback to update the local state instantly
      if (onAdd && newEquipment) {
        onAdd(newEquipment);
      }
    });
    // Reset form
    setIdentifier("");
    setType("TOWING");
    setStatus("LOW");
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-6 shadow-2xl mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl shadow-lg shadow-amber-900/30">
          <Wrench className="h-5 w-5 text-white" />
        </div>
        <h2 className="text-lg font-bold font-mono text-slate-200">Register New Equipment</h2>
      </div>
      
      <form onSubmit={handleSubmit} className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Equipment Name</label>
          <input
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            className="w-full border border-slate-700 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            placeholder="e.g., Towing Truck A7"
            required
          />
        </div>
        <div className="w-[160px]">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Type</label>
          <select 
            value={type} 
            onChange={(e) => setType(e.target.value)} 
            className="w-full border border-slate-700 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="TOWING">Towing</option>
            <option value="GENERATOR">Generator</option>
            <option value="BAGGAGE_LOADER">Baggage Loader</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div className="w-[160px]">
          <label className="block text-xs font-mono text-slate-400 uppercase tracking-wider mb-1.5">Status</label>
          <select 
            value={status} 
            onChange={(e) => setStatus(e.target.value as any)} 
            className="w-full border border-slate-700 bg-slate-950 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="LOW">Operational</option>
            <option value="MEDIUM">Needs Maintenance</option>
            <option value="HIGH">Degraded</option>
            <option value="CRITICAL">Out of Service</option>
          </select>
        </div>
        <button 
          type="submit" 
          disabled={isPending} 
          className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-blue-900/30 disabled:opacity-50"
        >
          {isPending ? "Adding..." : "+ Add Equipment"}
        </button>
      </form>
    </div>
  );
}