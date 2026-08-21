'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  AreaChart, Area, BarChart, Bar, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { saveFilter } from '@/lib/actions/filters';
import { BookmarkPlus, Route, TrendingUp, AlertTriangle, Activity, CloudRain, Plane, ShieldCheck, HeartPulse } from 'lucide-react';

export function RouteTrendsClient({ chartData, availableRoutes, savedFilters, liveRouteHealth }: { chartData: any[], availableRoutes: string[], savedFilters: any[], liveRouteHealth: any[] }) {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(availableRoutes.slice(0, 3));
  const [filterName, setFilterName] = useState('');
  const [liveCongestion, setLiveCongestion] = useState<number>(0);
  const [isFetchingLive, setIsFetchingLive] = useState(true);

  useEffect(() => {
    // Fetch live congestion data from our cached OpenSky API route
    const fetchCongestion = async () => {
      try {
        const res = await fetch('/api/opensky/live');
        if (!res.ok) throw new Error('Network response was not ok');
        const json = await res.json();
        // Use total active flights in NA as a base congestion metric (normalized to a 0-10 scale)
        const totalFlights = json.data?.length || 0;
        const congestionScore = Math.min((totalFlights / 500) * 10, 10);
        setLiveCongestion(congestionScore);
      } catch (e) {
        console.error('Failed to fetch live congestion:', e);
        setLiveCongestion(3.5); // Fallback
      } finally {
        setIsFetchingLive(false);
      }
    };
    fetchCongestion();
  }, []);

  const toggleRoute = (route: string) => {
    setSelectedRoutes(prev => 
      prev.includes(route) ? prev.filter(r => r !== route) : [...prev, route]
    );
  };

  const handleSaveFilter = async () => {
    if (!filterName) return;
    await saveFilter(filterName, { selectedRoutes });
    setFilterName('');
  };

  const loadFilter = (query: any) => {
    if (query.selectedRoutes) {
      setSelectedRoutes(query.selectedRoutes);
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f43f5e', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/95 backdrop-blur-md border border-slate-700/50 p-4 rounded-xl shadow-2xl">
          <p className="text-white font-bold mb-3 border-b border-slate-700 pb-2">{label}</p>
          <div className="space-y-3">
            {payload.map((entry: any, index: number) => {
              const routeData = entry.payload[entry.dataKey];
              if (!routeData) return null;
              return (
                <div key={index} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
                    <span className="font-bold text-slate-200">{entry.name}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-4 pl-5 text-xs">
                    <div className="flex flex-col">
                      <span className="text-slate-400">Avg Risk</span>
                      <span className="font-mono text-white">{routeData.averageRisk}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400">Max Risk</span>
                      <span className="font-mono text-red-400">{routeData.maxRisk}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-slate-400">Flights</span>
                      <span className="font-mono text-blue-400">{routeData.flightVolume}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }
    return null;
  };

  const latestMonthData = useMemo(() => {
    if (chartData.length === 0) return [];
    const lastData = chartData[chartData.length - 1];
    return selectedRoutes.map(route => {
      const rd = lastData[route];
      return {
        name: route,
        averageRisk: rd ? rd.averageRisk : 0,
        maxRisk: rd ? rd.maxRisk : 0,
        volume: rd ? rd.flightVolume : 0,
      };
    }).sort((a, b) => b.averageRisk - a.averageRisk);
  }, [chartData, selectedRoutes]);

  const highestRiskRoute = latestMonthData.length > 0 ? latestMonthData[0] : null;
  const highestVolumeRoute = latestMonthData.length > 0 ? [...latestMonthData].sort((a, b) => b.volume - a.volume)[0] : null;

  // Process live route health for the table
  const healthData = useMemo(() => {
    if (!liveRouteHealth) return [];
    return liveRouteHealth.map(rh => {
      // Add congestion factor to the composite score
      const finalComposite = parseFloat(((rh.compositeScore * 0.8) + (liveCongestion * 0.2)).toFixed(2));
      return {
        ...rh,
        finalComposite,
        status: finalComposite > 7 ? 'Critical' : finalComposite > 4 ? 'Warning' : 'Healthy'
      };
    }).sort((a, b) => b.finalComposite - a.finalComposite);
  }, [liveRouteHealth, liveCongestion]);

  return (
    <div className="flex flex-col gap-6">
      
      {/* Top Controls & Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Route Selector */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
              <Route className="w-5 h-5 text-blue-500" /> Monitored Routes
            </h3>
            
            {savedFilters.length > 0 && (
              <select 
                onChange={(e) => loadFilter(JSON.parse(e.target.value))} 
                className="text-xs bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-2 py-1 outline-none"
              >
                <option value="">Load Preset...</option>
                {savedFilters.map((f, i) => (
                  <option key={i} value={JSON.stringify(f.query)}>{f.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
            {availableRoutes.map(route => {
              const isSelected = selectedRoutes.includes(route);
              return (
                <button 
                  key={route}
                  onClick={() => toggleRoute(route)}
                  className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all border ${
                    isSelected 
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400 shadow-sm' 
                      : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {route}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2 mt-auto pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <input 
              type="text" 
              value={filterName}
              onChange={e => setFilterName(e.target.value)}
              placeholder="Save current selection as..." 
              className="flex-1 px-3 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg outline-none text-slate-800 dark:text-slate-200" 
            />
            <button 
              onClick={handleSaveFilter} 
              disabled={!filterName || selectedRoutes.length === 0}
              className="px-3 py-1.5 bg-slate-800 dark:bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-slate-900 dark:hover:bg-blue-500 transition-colors flex items-center gap-1 disabled:opacity-50"
            >
              <BookmarkPlus className="w-3.5 h-3.5" /> Save
            </button>
          </div>
        </div>

        {/* Quick Stat Cards */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <AlertTriangle className="w-24 h-24 text-red-500" />
          </div>
          <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            Highest Risk (Latest)
          </h4>
          <div className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {highestRiskRoute ? highestRiskRoute.name : 'N/A'}
          </div>
          {highestRiskRoute && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-red-500 font-bold bg-red-50 dark:bg-red-500/10 px-2 py-0.5 rounded border border-red-200 dark:border-red-500/20">
                Avg: {highestRiskRoute.averageRisk}
              </span>
              <span className="text-slate-500 font-mono">Max: {highestRiskRoute.maxRisk}</span>
            </div>
          )}
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Activity className="w-24 h-24 text-emerald-500" />
          </div>
          <h4 className="text-xs uppercase font-bold text-slate-500 dark:text-slate-400 mb-1 flex items-center gap-1">
            Highest Volume (Latest)
          </h4>
          <div className="text-2xl font-black text-slate-800 dark:text-white mb-2">
            {highestVolumeRoute ? highestVolumeRoute.name : 'N/A'}
          </div>
          {highestVolumeRoute && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-500/20">
                Flights: {highestVolumeRoute.volume}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Main Charts Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Historical Area Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-5 md:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-6">
            <TrendingUp className="w-5 h-5 text-blue-500" /> Historical Route Volatility
          </h3>
          
          {chartData.length > 0 && selectedRoutes.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  {selectedRoutes.map((route, i) => (
                    <linearGradient key={`color-${route}`} id={`color-${route}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={COLORS[i % COLORS.length]} stopOpacity={0}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.4} />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} domain={[0, 'dataMax + 2']} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                
                {selectedRoutes.map((route, i) => (
                  <Area 
                    key={route}
                    type="monotone" 
                    dataKey={(data) => data[route] ? data[route].averageRisk : null}
                    name={route}
                    stroke={COLORS[i % COLORS.length]} 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill={`url(#color-${route})`}
                    activeDot={{ r: 6, strokeWidth: 0 }}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              {selectedRoutes.length === 0 ? "Select at least one route to view trends." : "Insufficient data to render chart."}
            </div>
          )}
        </div>

        {/* Comparative Bar Chart */}
        <div className="bg-white dark:bg-slate-900 p-5 md:p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm flex flex-col h-[450px]">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 mb-6">
            <Activity className="w-5 h-5 text-amber-500" /> Latest Risk Comparison
          </h3>
          
          {latestMonthData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={latestMonthData} layout="vertical" margin={{ top: 0, right: 30, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#334155" opacity={0.2} />
                <XAxis type="number" domain={[0, 10]} hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: '#334155', opacity: 0.1 }}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '8px', color: '#fff' }}
                  itemStyle={{ fontSize: '12px' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px', fontSize: '12px' }} />
                <Bar dataKey="averageRisk" name="Avg Risk" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                <Bar dataKey="maxRisk" name="Max Risk" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={12} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
              No recent data.
            </div>
          )}
        </div>
      </div>

      {/* Route Health Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-5 md:p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center">
          <h3 className="font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
            <HeartPulse className="w-5 h-5 text-rose-500" /> Route Health Matrix
          </h3>
          {isFetchingLive && (
            <div className="flex items-center gap-2 text-xs font-medium text-blue-500 animate-pulse">
              <span className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></span> Syncing Live Telemetry...
            </div>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 uppercase text-xs font-bold">
              <tr>
                <th className="px-6 py-4">Route</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Composite Score</th>
                <th className="px-6 py-4"><div className="flex items-center gap-1"><CloudRain className="w-4 h-4"/> Live Weather</div></th>
                <th className="px-6 py-4"><div className="flex items-center gap-1"><Plane className="w-4 h-4"/> Congestion</div></th>
                <th className="px-6 py-4"><div className="flex items-center gap-1"><ShieldCheck className="w-4 h-4"/> Hist. Avg</div></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {healthData.map((rh) => (
                <tr key={rh.route} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold text-slate-800 dark:text-slate-200">{rh.route}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold border ${
                      rh.status === 'Critical' ? 'bg-red-50 text-red-600 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' :
                      rh.status === 'Warning' ? 'bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20' :
                      'bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20'
                    }`}>
                      {rh.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${rh.finalComposite > 7 ? 'bg-red-500' : rh.finalComposite > 4 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                          style={{ width: `${Math.min((rh.finalComposite / 10) * 100, 100)}%` }} 
                        />
                      </div>
                      <span className="font-mono text-slate-600 dark:text-slate-300 w-8">{rh.finalComposite.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{rh.avgWeatherRisk}</td>
                  <td className="px-6 py-4">
                    {liveCongestion > 6 ? (
                      <span className="text-red-500 font-bold flex items-center gap-1">High <AlertTriangle className="w-3 h-3"/></span>
                    ) : (
                      <span className="text-emerald-500 font-bold">Normal</span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-mono text-slate-600 dark:text-slate-300">{rh.avgHistoricalRisk}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
