'use client';

import React, { useState } from 'react';
import { flagZone } from '@/lib/actions/map';

export function RiskMapClient({ airports, initialFlagged }: { airports: any[], initialFlagged: any[] }) {
  const [selectedAirport, setSelectedAirport] = useState<any>(null);
  const [flagged, setFlagged] = useState(initialFlagged);

  const getRiskColor = (risk: number) => {
    if (risk >= 7.5) return 'fill-red-500';
    if (risk >= 5.0) return 'fill-amber-500';
    return 'fill-emerald-500';
  };

  const handleFlagZone = async (airport: any) => {
    const reason = prompt(`Reason for flagging ${airport.name} zone?`);
    if (reason) {
      const newZone = await flagZone(airport.code, reason);
      setFlagged([...flagged, newZone]);
    }
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      <div className="flex-1 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
        <svg viewBox="0 0 100 100" className="w-full h-auto bg-slate-50 dark:bg-slate-800 rounded border border-slate-200 dark:border-slate-700" style={{ maxHeight: '600px' }}>
          {/* Mock US outline for context */}
          <path d="M 10,20 Q 50,0 90,20 T 95,70 Q 50,90 10,70 Z" className="fill-slate-200 dark:fill-slate-700 stroke-slate-300 dark:stroke-slate-600" />
          
          {airports.map((airport) => (
            <g key={airport.code} 
               onClick={() => setSelectedAirport(airport)}
               className="cursor-pointer hover:opacity-80 transition-opacity"
            >
              <circle cx={airport.cx} cy={airport.cy} r="3" className={`${getRiskColor(airport.risk)} animate-pulse shadow`} />
              <text x={airport.cx} y={airport.cy - 4} fontSize="3" textAnchor="middle" className="font-bold fill-slate-700 dark:fill-slate-200">
                {airport.code}
              </text>
            </g>
          ))}
        </svg>
      </div>

      <div className="w-full md:w-80 flex flex-col gap-4">
        {selectedAirport ? (
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h2 className="text-xl font-bold mb-1 text-slate-900 dark:text-white">{selectedAirport.name} ({selectedAirport.code})</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">Current Risk Profile</p>
            
            <div className="space-y-4">
              <div>
                <span className="block text-xs uppercase text-slate-500 dark:text-slate-400 font-bold">Total Risk Score</span>
                <span className={`text-2xl font-bold ${selectedAirport.risk >= 7.5 ? 'text-red-500' : 'text-slate-800 dark:text-slate-200'}`}>
                  {selectedAirport.risk.toFixed(2)} / 10
                </span>
              </div>
              
              <button 
                onClick={() => handleFlagZone(selectedAirport)}
                className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg transition-colors"
              >
                Flag as High-Risk Zone
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm flex items-center justify-center h-48 text-slate-400 dark:text-slate-500 text-sm">
            Select an airport to view details.
          </div>
        )}

        {flagged.length > 0 && (
          <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm">
            <h3 className="font-bold mb-4 text-slate-900 dark:text-white">Flagged Zones</h3>
            <ul className="space-y-3">
              {flagged.map((zone, idx) => (
                <li key={idx} className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 rounded-lg">
                  <span className="font-bold text-red-700 dark:text-red-400 text-sm block">{zone.coordinates}</span>
                  <span className="text-xs text-red-600 dark:text-red-500">{zone.reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
