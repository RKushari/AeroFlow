'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  Plane, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  Search, 
  Plus, 
  Bell, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles,
  Layers,
  Filter
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlightItem {
  id: string;
  flightNumber: string;
  status: string;
  routeId: string;
  route?: {
    originId: string;
    destinationId: string;
    baseRisk: number;
  } | null;
  risk?: {
    totalScore: number;
    fatigueFactor: number;
    weatherFactor: number;
    mechFactor: number;
  } | null;
  incidents: Array<{ id: string; severity: string }>;
  checklists: Array<{ id: string; isComplete: boolean }>;
}

interface DispatcherCockpitProps {
  flights: FlightItem[];
  threshold: number;
  unreadAlertsCount: number;
}

export function DispatcherCockpit({ flights, threshold, unreadAlertsCount }: DispatcherCockpitProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'BLOCKED' | 'READY' | 'DEPARTED'>('ALL');

  // Compute stats
  const totalFlights = flights.length;
  const blockedFlights = flights.filter(f => {
    const isCritical = f.risk && f.risk.totalScore >= threshold;
    const hasIncidents = f.incidents.length > 0;
    return isCritical || hasIncidents || f.status === 'HOLD';
  }).length;
  const readyFlights = flights.filter(f => f.status === 'READY' || (f.risk && f.risk.totalScore < threshold && f.incidents.length === 0 && f.status === 'BOARDING')).length;
  const criticalRiskCount = flights.filter(f => f.risk && f.risk.totalScore >= threshold).length;

  const filteredFlights = flights.filter(f => {
    const isCritical = f.risk && f.risk.totalScore >= threshold;
    const hasIncidents = f.incidents.length > 0;
    const isBlocked = isCritical || hasIncidents || f.status === 'HOLD';
    
    // Status Filter
    if (statusFilter === 'BLOCKED' && !isBlocked) return false;
    if (statusFilter === 'READY' && isBlocked) return false;
    if (statusFilter === 'DEPARTED' && f.status !== 'DEPARTED') return false;

    // Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = f.flightNumber.toLowerCase().includes(q);
      const matchRoute = f.route ? `${f.route.originId} ${f.route.destinationId}`.toLowerCase().includes(q) : f.routeId.toLowerCase().includes(q);
      return matchNum || matchRoute;
    }
    return true;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-600/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Dispatch Readiness Cockpit
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time algorithmic risk gatekeeping, pre-flight clearance enforcement & AI briefing dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/dispatcher/alerts"
            className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-2 border border-slate-200 dark:border-slate-700 transition-all shadow-xs"
          >
            <Bell className="w-4 h-4 text-amber-500" />
            <span>Active Alerts</span>
            {unreadAlertsCount > 0 && (
              <span className="px-1.5 py-0.2 bg-red-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </Link>
          <Link
            href="/dispatcher/flights/new"
            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Declare Flight
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Total Monitored</span>
            <Plane className="w-4 h-4 text-blue-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900 dark:text-white">{totalFlights}</span>
            <span className="text-[11px] text-slate-400">flights scheduled</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Blocked / Hold Gate</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600 dark:text-red-400">{blockedFlights}</span>
            <span className="text-[11px] text-red-500/80 font-medium">requires resolution</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Cleared / Ready</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{readyFlights}</span>
            <span className="text-[11px] text-emerald-500/80 font-medium">dispatch approved</span>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-medium">
            <span>Critical Risk Spike</span>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600 dark:text-amber-400">{criticalRiskCount}</span>
            <span className="text-[11px] text-slate-400">score &ge; {threshold * 10}</span>
          </div>
        </motion.div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by flight (e.g. AF-1042 or JFK)..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Status Filter Chips */}
        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto">
          {(['ALL', 'BLOCKED', 'READY', 'DEPARTED'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === filter
                  ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                  : 'bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              {filter === 'ALL' ? 'All Flights' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Flight Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredFlights.map((flight) => {
            const riskScore = flight.risk?.totalScore ?? 0.0;
            const isCritical = riskScore >= threshold;
            const hasIncidents = flight.incidents.length > 0;
            const blocked = isCritical || hasIncidents || flight.status === 'HOLD';

            const origin = flight.route?.originId || flight.routeId.split('-')[0] || 'DEP';
            const destination = flight.route?.destinationId || flight.routeId.split('-')[1] || 'ARR';

            return (
              <motion.div
                key={flight.id}
                layout
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.2 }}
              >
                <Link
                  href={`/dispatcher/flight/${flight.id}`}
                  className={`group relative p-5 rounded-2xl border transition-all duration-200 flex flex-col justify-between gap-4 hover:shadow-md ${
                    blocked
                      ? 'bg-gradient-to-b from-red-50/70 to-white dark:from-red-950/20 dark:to-slate-900 border-red-200 dark:border-red-900/60'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                  }`}
                >
                  {/* Top Row: Flight number & status badge */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-colors text-slate-700 dark:text-slate-300">
                          <Plane className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-base text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {flight.flightNumber}
                          </span>
                          <div className="text-[11px] text-slate-400">
                            {origin} ➔ {destination}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className={`px-2.5 py-0.5 text-[11px] font-bold rounded-full tracking-wide ${
                          blocked 
                            ? 'bg-red-100 text-red-800 dark:bg-red-950/80 dark:text-red-300 border border-red-200 dark:border-red-800'
                            : flight.status === 'READY'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950/80 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                        }`}>
                          {blocked ? 'BLOCKED' : flight.status}
                        </span>
                      </div>
                    </div>

                    {/* Route Visualizer Line */}
                    <div className="mt-3 py-2 px-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        <span>{origin}</span>
                      </div>
                      <div className="flex-1 mx-3 flex items-center gap-1 text-slate-300 dark:text-slate-700">
                        <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-800" />
                        <Plane className="w-3 h-3 rotate-90 text-blue-500" />
                        <div className="h-[2px] w-full bg-slate-200 dark:bg-slate-800" />
                      </div>
                      <div className="flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
                        <span>{destination}</span>
                      </div>
                    </div>
                  </div>

                  {/* Risk Progress Bar */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 dark:text-slate-400 text-[11px] font-medium">Risk Score</span>
                      <span className={`font-bold text-xs ${
                        isCritical ? 'text-red-600 dark:text-red-400' :
                        riskScore >= 5.0 ? 'text-amber-600 dark:text-amber-400' :
                        'text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {riskScore.toFixed(2)} / 10.0
                      </span>
                    </div>

                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          riskScore >= 7.5 ? 'bg-red-500' :
                          riskScore >= 5.0 ? 'bg-amber-500' :
                          'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, (riskScore / 10) * 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Warnings / Reason badges if blocked */}
                  {blocked && (
                    <div className="p-2.5 bg-red-100/60 dark:bg-red-950/40 rounded-xl text-[11px] text-red-800 dark:text-red-300 font-medium space-y-1 border border-red-200/60 dark:border-red-900/40">
                      {isCritical && <div className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-red-600" /> Critical Risk Exceeds Threshold</div>}
                      {hasIncidents && <div className="flex items-center gap-1.5"><ShieldAlert className="w-3 h-3 text-red-600" /> {flight.incidents.length} Unresolved Incident(s)</div>}
                      {flight.status === 'HOLD' && <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-red-600" /> Operations Hold Active</div>}
                    </div>
                  )}

                  {/* Card Footer */}
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1 text-[11px]">
                      <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                      AI Briefing & Dossier
                    </span>
                    <span className="font-semibold text-blue-600 dark:text-blue-400 group-hover:translate-x-1 transition-transform flex items-center gap-1 text-[11px]">
                      Open Console <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredFlights.length === 0 && (
          <div className="col-span-full p-12 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
              <Plane className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-900 dark:text-white text-sm">No Flights Found</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-xs">
              No flights matching your filter criteria. Try clearing the search query or switching tabs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
