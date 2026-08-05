'use client';

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Server, ChevronDown, ChevronUp, Plane, Filter, Plus, Search,
  Trash2, Globe, Radio, Shield, Activity, AlertTriangle, 
  TrendingUp, Eye, Wifi, BarChart3, Target, Zap, Clock,
  Cloud, Wind, Thermometer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { updateMonitoredFlights } from '@/lib/actions/risk-analytics';
import { searchLiveFlight, enrollFlight, getWeatherForAirport } from '@/lib/actions/opensky-actions';
import { globalAirports } from '@/lib/data/airports';
import { FlightDiscoveryModal } from './flight-discovery-modal';

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

// Build full lookup from the 8k-airport global dataset
const iataToCountry: Record<string, string> = Object.fromEntries(
  globalAirports.filter(a => a.code).map(a => [a.code, a.country])
);
const iataToName: Record<string, string> = Object.fromEntries(
  globalAirports.filter(a => a.code).map(a => [a.code, `${a.name} (${a.code})`])
);

function RiskBar({ risk }: { risk: number }) {
  const pct = Math.round(risk * 100);
  const color = pct >= 70 ? '#ef4444' : pct >= 40 ? '#f59e0b' : '#10b981';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-slate-800 rounded-full h-1.5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-bold font-mono w-7 text-right" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; dot: string; bg: string; text: string; border: string }> = {
    DEPARTED: { label: 'EN ROUTE', dot: 'bg-emerald-400 animate-pulse', bg: 'bg-emerald-950/60', text: 'text-emerald-300', border: 'border-emerald-800/50' },
    SCHEDULED: { label: 'SCHEDULED', dot: 'bg-slate-400', bg: 'bg-slate-800/60', text: 'text-slate-300', border: 'border-slate-700/50' },
    BOARDING: { label: 'BOARDING', dot: 'bg-amber-400 animate-pulse', bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800/50' },
    HOLD: { label: 'HOLDING', dot: 'bg-red-400 animate-pulse', bg: 'bg-red-950/60', text: 'text-red-300', border: 'border-red-800/50' },
    CANCELLED: { label: 'CANCELLED', dot: 'bg-red-600', bg: 'bg-red-950/60', text: 'text-red-400', border: 'border-red-900/50' },
  };
  const c = config[status] ?? config['DEPARTED'];
  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold tracking-widest uppercase ${c.bg} ${c.text} ${c.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </div>
  );
}

export function InternalFlightsCard({
  flights,
  initialMonitoredIds,
}: {
  flights: InternalFlight[];
  initialMonitoredIds: string[];
}) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState('All');
  const [selectedAirport, setSelectedAirport] = useState('All');
  const [flightIdInput, setFlightIdInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isDiscoveryOpen, setIsDiscoveryOpen] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const router = useRouter();
  const [monitoredFlights, setMonitoredFlights] = useState<InternalFlight[]>(
    flights.filter(f => initialMonitoredIds.includes(f.id))
  );
  const [weatherCache, setWeatherCache] = useState<Record<string, { conditions: string; severity: number }>>({});

  useEffect(() => {
    const fetchAllWeather = async () => {
      const uniqueAirports = new Set<string>();
      monitoredFlights.forEach(f => {
        if (f.route.originId && f.route.originId !== 'UNK') uniqueAirports.add(f.route.originId);
        if (f.route.destinationId && f.route.destinationId !== 'UNK') uniqueAirports.add(f.route.destinationId);
      });

      const codes = Array.from(uniqueAirports);
      for (const code of codes) {
        if (weatherCache[code]) continue;
        const res = await getWeatherForAirport(code);
        if (res.success && res.conditions) {
          setWeatherCache(prev => ({
            ...prev,
            [code]: { conditions: res.conditions!, severity: res.severity ?? 0.1 }
          }));
        }
      }
    };
    fetchAllWeather();
  }, [monitoredFlights]);

  const showToast = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    setToastMsg({ text, type });
    setTimeout(() => setToastMsg(null), 3000);
  }, []);

  // Derive filtering options from active monitored list using full global dataset
  const countries = useMemo(() => {
    const c = new Set<string>();
    monitoredFlights.forEach(f => {
      const oc = iataToCountry[f.route.originId];
      const dc = iataToCountry[f.route.destinationId];
      if (oc) c.add(oc);
      if (dc) c.add(dc);
    });
    return ['All', ...Array.from(c).sort()];
  }, [monitoredFlights]);

  const airports = useMemo(() => {
    const a = new Set<string>();
    monitoredFlights.forEach(f => {
      a.add(f.route.originId);
      a.add(f.route.destinationId);
    });
    return ['All', ...Array.from(a).sort()];
  }, [monitoredFlights]);

  const filteredFlights = useMemo(() => {
    return monitoredFlights.filter(f => {
      let passCountry = true;
      if (selectedCountry !== 'All') {
        passCountry =
          iataToCountry[f.route.originId] === selectedCountry ||
          iataToCountry[f.route.destinationId] === selectedCountry;
      }
      let passAirport = true;
      if (selectedAirport !== 'All') {
        passAirport = f.route.originId === selectedAirport || f.route.destinationId === selectedAirport;
      }
      return passCountry && passAirport;
    });
  }, [monitoredFlights, selectedCountry, selectedAirport]);

  // Stats derived from monitored flights
  const stats = useMemo(() => {
    const activeCount = monitoredFlights.filter(f => f.status === 'DEPARTED').length;
    const avgRisk = monitoredFlights.length
      ? monitoredFlights.reduce((sum, f) => sum + f.route.baseRisk, 0) / monitoredFlights.length
      : 0;
    const highRiskCount = monitoredFlights.filter(f => f.route.baseRisk >= 0.5).length;
    return { activeCount, avgRisk, highRiskCount };
  }, [monitoredFlights]);

  const handleAddFlight = async () => {
    if (!flightIdInput) return;
    setIsSearching(true);
    try {
      const existingDbFlight = flights.find(
        f => f.flightNumber.toLowerCase() === flightIdInput.toLowerCase() || f.id.toLowerCase() === flightIdInput.toLowerCase()
      );
      if (existingDbFlight) {
        if (monitoredFlights.some(f => f.id === existingDbFlight.id)) {
          showToast('Flight is already monitored', 'error');
          return;
        }
        const newMonitored = [...monitoredFlights, existingDbFlight];
        setMonitoredFlights(newMonitored);
        await updateMonitoredFlights(newMonitored.map(f => f.id));
        setFlightIdInput('');
        showToast(`Flight ${existingDbFlight.flightNumber} enrolled successfully`);
        return;
      }
      const liveFlight = await searchLiveFlight(flightIdInput);
      if (!liveFlight) {
        showToast('Flight not found or not airborne', 'error');
        return;
      }
      const enrolledRes = await enrollFlight(liveFlight.callsign, 'UNK', 'UNK');
      if (enrolledRes.success && enrolledRes.flight) {
        const optimisticFlight: InternalFlight = {
          id: enrolledRes.flight.id,
          flightNumber: enrolledRes.flight.flightNumber,
          status: enrolledRes.flight.status,
          route: { originId: 'UNK', destinationId: 'UNK', baseRisk: 0.1 },
        };
        setMonitoredFlights(prev => [...prev, optimisticFlight]);
        setFlightIdInput('');
        showToast(`Flight ${enrolledRes.flight.flightNumber} enrolled from OpenSky`);
      } else {
        showToast(enrolledRes.error || 'Failed to enroll flight', 'error');
      }
    } catch (e) {
      showToast('Error adding flight', 'error');
    } finally {
      setIsSearching(false);
    }
  };

  const handleRemoveFlight = async (id: string) => {
    setRemovingId(id);
    await new Promise(r => setTimeout(r, 300)); // let exit animation play
    const newMonitored = monitoredFlights.filter(f => f.id !== id);
    setMonitoredFlights(newMonitored);
    await updateMonitoredFlights(newMonitored.map(f => f.id));
    setRemovingId(null);
    showToast('Flight removed from monitor');
  };

  return (
    <div className="relative flex flex-col gap-0 rounded-2xl overflow-hidden border border-slate-800/80 shadow-[0_0_80px_rgba(99,102,241,0.08)] bg-slate-950">
      {/* Toast */}
      <AnimatePresence>
        {toastMsg && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`absolute top-4 right-4 z-50 px-4 py-2.5 rounded-xl text-xs font-bold font-mono shadow-xl border ${
              toastMsg.type === 'error'
                ? 'bg-red-950/90 text-red-300 border-red-800/60'
                : 'bg-emerald-950/90 text-emerald-300 border-emerald-800/60'
            }`}
          >
            {toastMsg.type === 'error' ? '⚠ ' : '✓ '}{toastMsg.text}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Top Header Bar ─── */}
      <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-900 to-slate-900/80 border-b border-slate-800/60">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="p-2.5 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Server className="h-5 w-5" />
            </div>
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-slate-900 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-sm font-bold font-mono text-white tracking-widest uppercase">
                Internal Fleet Monitor
              </h2>
              <span className="px-2 py-0.5 text-[9px] font-extrabold tracking-widest uppercase rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                LIVE
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">
              AeroFlow · Corporate Fleet Surveillance System v2.4
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 text-[10px] font-mono text-slate-500 border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-900/60">
            <Wifi className="h-3 w-3 text-emerald-400 animate-pulse" />
            <span className="text-slate-400">OpenSky</span>
            <span className="text-emerald-400 font-bold">CONNECTED</span>
          </div>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition-all border border-slate-700/60"
          >
            {isCollapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* ─── Stats Strip ─── */}
      <div className="grid grid-cols-4 border-b border-slate-800/60 divide-x divide-slate-800/60">
        {[
          { icon: Activity, label: 'Monitored', value: monitoredFlights.length, color: 'text-indigo-400', accent: 'from-indigo-600/10' },
          { icon: Plane, label: 'En Route', value: stats.activeCount, color: 'text-emerald-400', accent: 'from-emerald-600/10' },
          { icon: AlertTriangle, label: 'High Risk', value: stats.highRiskCount, color: 'text-red-400', accent: 'from-red-600/10' },
          { icon: BarChart3, label: 'Avg Risk', value: `${Math.round(stats.avgRisk * 100)}%`, color: 'text-amber-400', accent: 'from-amber-600/10' },
        ].map(({ icon: Icon, label, value, color, accent }) => (
          <div key={label} className={`px-4 py-3 bg-gradient-to-b ${accent} to-transparent`}>
            <div className="flex items-center gap-2 mb-0.5">
              <Icon className={`h-3.5 w-3.5 ${color}`} />
              <span className="text-[9px] font-bold font-mono text-slate-500 uppercase tracking-widest">{label}</span>
            </div>
            <p className={`text-2xl font-extrabold font-mono ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* ─── Toolbar ─── */}
      <div className="flex flex-wrap items-center gap-3 px-5 py-3 bg-slate-900/40 border-b border-slate-800/60 backdrop-blur">
        {/* Filter group */}
        <div className="flex items-center gap-2 border border-slate-800 rounded-lg px-2.5 py-1.5 bg-slate-900/60 text-xs font-mono">
          <Filter className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="bg-transparent text-slate-300 outline-none text-xs cursor-pointer"
          >
            {countries.map(c => <option key={c} value={c} className="bg-slate-900">{c}</option>)}
          </select>
          <span className="text-slate-700">|</span>
          <Globe className="h-3.5 w-3.5 text-slate-500" />
          <select
            value={selectedAirport}
            onChange={e => setSelectedAirport(e.target.value)}
            className="bg-transparent text-slate-300 outline-none text-xs cursor-pointer"
          >
            {airports.map(a => <option key={a} value={a} className="bg-slate-900">{a}</option>)}
          </select>
        </div>

        <div className="w-px h-5 bg-slate-800" />

        {/* Quick Enroll */}
        <div className="flex items-center gap-1.5 border border-slate-800 rounded-lg bg-slate-900/60 overflow-hidden">
          <div className="flex items-center gap-2 px-2.5">
            <Target className="h-3.5 w-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Callsign / ICAO24..."
              value={flightIdInput}
              onChange={e => setFlightIdInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddFlight()}
              disabled={isSearching}
              className="bg-transparent text-slate-200 text-xs font-mono outline-none w-36 placeholder:text-slate-600 disabled:opacity-50 py-1.5"
            />
          </div>
          <button
            onClick={handleAddFlight}
            disabled={isSearching || !flightIdInput}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold font-mono transition-colors disabled:opacity-50 border-l border-indigo-700"
          >
            {isSearching
              ? <span className="w-3.5 h-3.5 block animate-spin rounded-full border-2 border-white border-t-transparent" />
              : <Plus className="h-3.5 w-3.5" />}
            Enroll
          </button>
        </div>

        {/* Discover Button */}
        <button
          onClick={() => setIsDiscoveryOpen(true)}
          className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600/20 to-indigo-600/20 hover:from-cyan-600/30 hover:to-indigo-600/30 text-cyan-300 border border-cyan-800/50 hover:border-cyan-700/60 text-xs font-bold font-mono transition-all gap-2"
        >
          <Radio className="h-3.5 w-3.5 animate-pulse" />
          Radar Discovery
        </button>

        <div className="ml-auto text-[10px] font-mono text-slate-600">
          Showing <span className="text-slate-300 font-bold">{filteredFlights.length}</span> / {monitoredFlights.length} enrolled
        </div>
      </div>

      {/* ─── Table ─── */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            {filteredFlights.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-600 gap-3">
                <Server className="h-10 w-10 opacity-30" />
                <p className="font-mono text-sm">No enrolled flights match the current filter.</p>
                <p className="font-mono text-xs text-slate-700">Use Radar Discovery or quick enroll to add flights.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/80 text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest border-b border-slate-800/60">
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1.5"><Plane className="h-3 w-3" /> Flight</div>
                      </th>
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1.5"><TrendingUp className="h-3 w-3" /> Route</div>
                      </th>
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1.5"><Shield className="h-3 w-3" /> Risk Level</div>
                      </th>
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1.5"><Activity className="h-3 w-3" /> Status</div>
                      </th>
                      <th className="px-5 py-3">
                        <div className="flex items-center gap-1.5"><Eye className="h-3 w-3" /> Telemetry</div>
                      </th>
                      <th className="px-5 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/40">
                    <AnimatePresence>
                      {filteredFlights.map((flight, idx) => (
                        <motion.tr
                          key={flight.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: removingId === flight.id ? 0 : 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          transition={{ duration: 0.25, delay: idx * 0.03 }}
                          className="group hover:bg-indigo-500/5 transition-colors cursor-default relative"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="relative w-8 h-8 rounded-lg bg-slate-800/60 border border-slate-700/50 flex items-center justify-center flex-shrink-0">
                                <Plane className="h-4 w-4 text-indigo-400" />
                              </div>
                              <div>
                                <p className="text-sm font-extrabold font-mono text-white tracking-wider">
                                  {flight.flightNumber}
                                </p>
                                <p className="text-[9px] font-mono text-slate-600 uppercase">AeroFlow Corp</p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3 font-mono text-xs">
                              <div className="flex flex-col items-center min-w-[40px]">
                                <span className="text-[9px] text-slate-600 uppercase">From</span>
                                <span className="text-orange-400 font-bold text-sm">
                                  {flight.route.originId === 'UNK' ? '???' : flight.route.originId}
                                </span>
                                {flight.route.originId !== 'UNK' && iataToCountry[flight.route.originId] && (
                                  <span className="text-[8px] text-slate-600">{iataToCountry[flight.route.originId]}</span>
                                )}
                              </div>
                              <div className="flex-1 flex flex-col items-center gap-0.5 px-1">
                                <div className="flex gap-0.5">
                                  {[0,1,2].map(i => <div key={i} className="w-1.5 h-0.5 rounded-full bg-slate-700" />)}
                                </div>
                                <Zap className="h-3 w-3 text-slate-600" />
                              </div>
                              <div className="flex flex-col items-center min-w-[40px]">
                                <span className="text-[9px] text-slate-600 uppercase">To</span>
                                <span className="text-emerald-400 font-bold text-sm">
                                  {flight.route.destinationId === 'UNK' ? '???' : flight.route.destinationId}
                                </span>
                                {flight.route.destinationId !== 'UNK' && iataToCountry[flight.route.destinationId] && (
                                  <span className="text-[8px] text-slate-600">{iataToCountry[flight.route.destinationId]}</span>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-3.5 w-44">
                            <RiskBar risk={flight.route.baseRisk} />
                          </td>

                          <td className="px-5 py-3.5">
                            <StatusBadge status={flight.status} />
                          </td>

                          <td className="px-5 py-3.5">
                            {(() => {
                              const code = flight.route.originId !== 'UNK' ? flight.route.originId : flight.route.destinationId;
                              const weather = weatherCache[code];
                              if (!weather) {
                                return (
                                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-600">
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/50 animate-pulse" />
                                    <span className="animate-pulse">Loading telemetry...</span>
                                  </div>
                                );
                              }
                              // Parse weather string: e.g. "Wind 4.2 m/s, Temp: 18°C"
                              const isWindy = weather.severity >= 0.5;
                              const isCold = weather.severity >= 0.8;
                              const statusColor = 
                                weather.severity >= 0.7 ? 'text-red-400' :
                                weather.severity >= 0.4 ? 'text-amber-400' :
                                'text-emerald-400';
                              return (
                                <div className="flex flex-col gap-0.5 font-mono text-[10px] text-slate-300">
                                  <div className="flex items-center gap-1.5">
                                    <Cloud className="h-3.5 w-3.5 text-indigo-400" />
                                    <span className="font-semibold text-[11px]">{weather.conditions}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-slate-500 text-[9px]">
                                    <span className="uppercase">{code} METAR</span>
                                    <span className="w-1 h-1 rounded-full bg-slate-700" />
                                    <span className={`font-bold uppercase tracking-wider ${statusColor}`}>
                                      {weather.severity >= 0.7 ? 'Severe' : weather.severity >= 0.4 ? 'Caution' : 'Normal'}
                                    </span>
                                  </div>
                                </div>
                              );
                            })()}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => handleRemoveFlight(flight.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-bold font-mono text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded-lg border border-transparent hover:border-red-900/50 transition-all"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Remove
                            </button>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-800/60 bg-slate-900/40 text-[10px] font-mono text-slate-600">
              <span>Last updated: {new Date().toLocaleTimeString('en-US', { hour12: false })}</span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Telemetry stream active
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <FlightDiscoveryModal
        isOpen={isDiscoveryOpen}
        onClose={() => setIsDiscoveryOpen(false)}
        onFlightEnrolled={(newFlight) => {
          // Instantly update the local table without page reload
          setMonitoredFlights(prev => {
            if (prev.some(f => f.id === newFlight.id)) return prev;
            return [...prev, newFlight];
          });
          showToast(`Flight ${newFlight.flightNumber} enrolled`);
          // Background refresh to sync server state
          router.refresh();
        }}
        monitoredCallsigns={monitoredFlights.map(f => f.flightNumber)}
      />
    </div>
  );
}
