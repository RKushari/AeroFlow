'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Plane, Loader2, Plus, Check, Radio, Globe, MapPin } from 'lucide-react';
import { getCountries, getAirportsByCountry } from '@/lib/data/airports';
import { getFlightsByAirport, enrollFlight } from '@/lib/actions/opensky-actions';

interface EnrolledFlight {
  id: string;
  flightNumber: string;
  status: string;
  route: { originId: string; destinationId: string; baseRisk: number };
}

interface FlightDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called each time a flight is successfully enrolled — passes the new flight so the parent can add it to state */
  onFlightEnrolled: (flight: EnrolledFlight) => void;
  /** Callsigns that are already monitored, for visual feedback */
  monitoredCallsigns: string[];
}

export function FlightDiscoveryModal({
  isOpen,
  onClose,
  onFlightEnrolled,
  monitoredCallsigns,
}: FlightDiscoveryModalProps) {
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [airports, setAirports] = useState<any[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<string>('');
  const [selectedAirportName, setSelectedAirportName] = useState<string>('');
  const [selectedAirportIata, setSelectedAirportIata] = useState<string>('');

  const [flights, setFlights] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Track enrollments locally so modal stays open and buttons update instantly
  const [enrollingIcao, setEnrollingIcao] = useState<string | null>(null);
  const [locallyEnrolled, setLocallyEnrolled] = useState<Set<string>>(new Set());
  const [enrollCount, setEnrollCount] = useState(0);

  useEffect(() => {
    if (isOpen && countries.length === 0) {
      setCountries(getCountries());
    }
    if (!isOpen) {
      // Reset local state when closed
      setSelectedCountry('');
      setSelectedAirport('');
      setFlights([]);
      setLocallyEnrolled(new Set());
      setEnrollCount(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (selectedCountry) {
      const list = getAirportsByCountry(selectedCountry);
      setAirports(list);
      setSelectedAirport('');
      setSelectedAirportName('');
      setSelectedAirportIata('');
      setFlights([]);
    }
  }, [selectedCountry]);

  useEffect(() => {
    if (selectedAirport) {
      const ap = airports.find(a => a.icao === selectedAirport);
      setSelectedAirportName(ap?.name ?? selectedAirport);
      setSelectedAirportIata(ap?.code ?? '');
      setLoading(true);
      setFlights([]);
      getFlightsByAirport(selectedAirport).then(res => {
        setFlights(res);
        setLoading(false);
      });
    }
  }, [selectedAirport]);

  const handleEnroll = useCallback(async (flight: any) => {
    if (!flight.callsign || flight.callsign === 'UNKNOWN') return;
    if (enrollingIcao) return; // prevent double-tap

    setEnrollingIcao(flight.icao24);
    // Pass the selected airport's IATA code as the departure airport
    const res = await enrollFlight(flight.callsign, selectedAirportIata || 'UNK', 'UNK');
    setEnrollingIcao(null);

    if (res.success && res.flight) {
      // Mark as enrolled locally — keep modal open!
      setLocallyEnrolled(prev => new Set([...prev, flight.callsign]));
      setEnrollCount(c => c + 1);
      // Notify parent with the new flight so the table updates instantly
      const enrolled = res.flight as any;
      onFlightEnrolled({
        id: enrolled.id,
        flightNumber: enrolled.flightNumber,
        status: enrolled.status,
        route: enrolled.route ?? { originId: selectedAirportIata || 'UNK', destinationId: 'UNK', baseRisk: 0.1 },
      });
    } else {
      alert(res.error ?? 'Failed to enroll flight');
    }
  }, [enrollingIcao, selectedAirportIata, onFlightEnrolled]);

  if (!isOpen) return null;

  const isEnrolled = (callsign: string) =>
    locallyEnrolled.has(callsign) || monitoredCallsigns.includes(callsign);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 12 }}
        transition={{ duration: 0.18 }}
        className="bg-[#0d1117] border border-slate-800/80 w-full max-w-4xl rounded-2xl shadow-[0_0_80px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col max-h-[88vh]"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/60 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/20 border border-indigo-500/30 text-indigo-400 rounded-xl">
              <Radio className="h-5 w-5 animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono tracking-wide">Global Flight Discovery</h2>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                Select country → airport to scan live radar (50km radius) · Enroll multiple flights
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {enrollCount > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold font-mono">
                <Check className="h-3.5 w-3.5" />
                {enrollCount} enrolled
              </div>
            )}
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Country + Airport selectors */}
        <div className="px-6 py-4 border-b border-slate-800/60 bg-slate-950/40 flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
              <Globe className="h-3 w-3" /> Country
            </label>
            <select
              value={selectedCountry}
              onChange={e => setSelectedCountry(e.target.value)}
              className="w-full bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 text-sm font-mono"
            >
              <option value="">Select a Country...</option>
              {countries.map(c => (
                <option key={c} value={c} className="bg-slate-900">{c}</option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 mb-2 uppercase tracking-widest">
              <MapPin className="h-3 w-3" /> Airport
            </label>
            <select
              value={selectedAirport}
              onChange={e => setSelectedAirport(e.target.value)}
              disabled={!selectedCountry}
              className="w-full bg-slate-800/80 border border-slate-700/60 text-slate-200 rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 disabled:opacity-40 text-sm font-mono"
            >
              <option value="" className="bg-slate-900">
                {selectedCountry ? 'Select an Airport...' : 'Select a Country first'}
              </option>
              {airports.map(a => (
                <option key={a.icao} value={a.icao} className="bg-slate-900">
                  {a.name} ({a.icao} / {a.code})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Airport info strip */}
        {selectedAirportName && (
          <div className="px-6 py-2.5 bg-indigo-500/5 border-b border-indigo-500/10 flex items-center gap-2 text-xs font-mono text-indigo-300/70">
            <Plane className="h-3.5 w-3.5 text-indigo-400" />
            <span>Scanning 50km radius around <span className="text-indigo-300 font-bold">{selectedAirportName}</span></span>
            {selectedAirportIata && (
              <span className="px-2 py-0.5 bg-indigo-500/20 border border-indigo-500/30 rounded text-indigo-300 font-bold text-[10px]">
                {selectedAirportIata}
              </span>
            )}
            {!loading && flights.length > 0 && (
              <span className="ml-auto text-slate-500">{flights.length} aircraft detected</span>
            )}
          </div>
        )}

        {/* Flight List */}
        <div className="flex-1 overflow-auto p-5 bg-slate-950/20">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-52 text-indigo-400 gap-4">
              <div className="relative">
                <Loader2 className="h-10 w-10 animate-spin" />
                <div className="absolute inset-0 h-10 w-10 rounded-full bg-indigo-500/10 animate-ping" />
              </div>
              <div className="text-center">
                <p className="text-sm font-bold font-mono">Scanning live radar...</p>
                <p className="text-[10px] text-indigo-300/50 mt-1">Querying OpenSky Network bounding box</p>
              </div>
            </div>
          ) : flights.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              <AnimatePresence>
                {flights.map((f, i) => {
                  const enrolled = isEnrolled(f.callsign);
                  const enrollingThis = enrollingIcao === f.icao24;
                  return (
                    <motion.div
                      key={f.icao24}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.025 }}
                      className={`rounded-xl border p-4 flex flex-col gap-3 transition-all ${
                        enrolled
                          ? 'bg-emerald-950/30 border-emerald-800/50'
                          : 'bg-slate-800/40 border-slate-700/50 hover:border-slate-600/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 mb-0.5">
                            <Plane className={`h-4 w-4 ${enrolled ? 'text-emerald-400' : 'text-indigo-400'}`} />
                            <span className="font-extrabold text-white font-mono text-base tracking-wider">
                              {f.callsign}
                            </span>
                          </div>
                          <span className="text-[9px] bg-slate-700/60 text-slate-400 px-1.5 py-0.5 rounded font-mono uppercase">
                            {f.icao24}
                          </span>
                        </div>
                        {f.originCountry && (
                          <span className="text-[9px] text-slate-500 font-mono text-right leading-tight max-w-[80px]">
                            {f.originCountry}
                          </span>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400">
                        <div>
                          <span className="text-slate-600 uppercase block text-[9px]">Altitude</span>
                          <span className="text-slate-300 font-bold">
                            {f.altitude ? `${Math.round(f.altitude).toLocaleString()}m` : 'Ground'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-600 uppercase block text-[9px]">Speed</span>
                          <span className="text-slate-300 font-bold">
                            {f.velocity ? `${Math.round(f.velocity * 1.944)} kts` : '0 kts'}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleEnroll(f)}
                        disabled={enrolled || enrollingThis || f.callsign === 'UNKNOWN'}
                        className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold font-mono transition-all ${
                          enrolled
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-600/30 cursor-default'
                            : 'bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500 disabled:opacity-50'
                        }`}
                      >
                        {enrollingThis ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : enrolled ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Plus className="h-4 w-4" />
                        )}
                        {enrolled ? 'Enrolled' : enrollingThis ? 'Enrolling...' : 'Add to Monitor'}
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          ) : selectedAirport ? (
            <div className="flex flex-col items-center justify-center h-52 text-slate-600 gap-3">
              <Radio className="h-10 w-10 opacity-30" />
              <p className="font-mono text-sm">No live airborne aircraft detected in 50km radius.</p>
              <p className="font-mono text-xs text-slate-700">Try a busier airport or a different time.</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-52 text-slate-700 gap-3">
              <Globe className="h-12 w-12 opacity-20" />
              <p className="font-mono text-sm">Select a country and airport to begin radar scan.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800/60 bg-slate-900/40 flex items-center justify-between text-[10px] font-mono text-slate-600">
          <span>OpenSky Network · Live bounding box · 50km radius</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors border border-slate-700"
          >
            Done
          </button>
        </div>
      </motion.div>
    </div>
  );
}
