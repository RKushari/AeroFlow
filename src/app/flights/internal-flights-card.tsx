'use client';

import React, { useState } from 'react';
import { Server, ChevronDown, ChevronUp, Plane } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { SyncFlightsButton } from './sync-button';

interface InternalFlight {
  id: string;
  flightNumber: string;
  status: string;
  route: {
    originId: string;
    destinationId: string;
    baseRisk: number;
  };
}

export function InternalFlightsCard({ flights }: { flights: InternalFlight[] }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-slate-900/60 rounded-2xl shadow-2xl border border-slate-800/80 overflow-hidden backdrop-blur-xl transition-all">
      {/* Header Bar */}
      <div 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="p-5 bg-slate-950/80 border-b border-slate-800 font-bold text-slate-100 flex items-center justify-between cursor-pointer select-none hover:bg-slate-900/80 transition-colors flex-wrap gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg border border-indigo-500/30">
            <Server className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-mono">AeroFlow Internal Monitored Flights</span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full font-mono font-bold border border-slate-700">
                {flights.length} Enrolled
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">Click header to {isCollapsed ? 'expand' : 'collapse'} table view</p>
          </div>
        </div>

        <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
          <SyncFlightsButton />
          <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700"
            title={isCollapsed ? "Expand Table" : "Collapse Table"}
          >
            {isCollapsed ? <ChevronDown className="h-5 w-5" /> : <ChevronUp className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Collapsible Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            {flights.length === 0 ? (
              <div className="p-12 text-center text-slate-500 font-mono text-sm">
                No internal flights currently registered in system database. Click "Sync from OpenSky" above to import live flights.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400">
                      <th className="p-4 font-semibold">Flight ID</th>
                      <th className="p-4 font-semibold">Origin Airport</th>
                      <th className="p-4 font-semibold">Destination Airport</th>
                      <th className="p-4 font-semibold">Base Risk Factor</th>
                      <th className="p-4 font-semibold">Flight Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {flights.map(flight => (
                      <tr key={flight.id} className="hover:bg-slate-800/50 transition-colors">
                        <td className="p-4 font-bold text-white flex items-center gap-2">
                          <Plane className="h-3.5 w-3.5 text-blue-400" />
                          {flight.flightNumber}
                        </td>
                        <td className="p-4 text-orange-400 font-bold">{flight.route.originId}</td>
                        <td className="p-4 text-emerald-400 font-bold">{flight.route.destinationId}</td>
                        <td className="p-4 text-slate-300">{(flight.route.baseRisk * 100).toFixed(0)}%</td>
                        <td className="p-4">
                          <span className={`text-[10px] font-bold px-3 py-1.5 rounded-full uppercase tracking-wide border ${
                            flight.status === 'HOLD' || flight.status === 'CANCELLED' ? 'bg-red-950/60 text-red-300 border-red-800/50' :
                            flight.status === 'SCHEDULED' ? 'bg-slate-800 text-slate-300 border-slate-700' :
                            flight.status === 'BOARDING' ? 'bg-amber-950/60 text-amber-300 border-amber-800/50' :
                            'bg-emerald-950/60 text-emerald-300 border-emerald-800/50'
                          }`}>
                            {flight.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
