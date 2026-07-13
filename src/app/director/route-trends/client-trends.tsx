'use client';

import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { saveFilter } from '@/lib/actions/filters';

export function RouteTrendsClient({ chartData, availableRoutes, savedFilters }: { chartData: any[], availableRoutes: string[], savedFilters: any[] }) {
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>(availableRoutes);
  const [filterName, setFilterName] = useState('');

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

  const COLORS = ['#ef4444', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4'];

  return (
    <div className="flex flex-col gap-6">
      {/* Filters and Controls */}
      <div className="bg-white p-6 border rounded-xl shadow-sm flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <h3 className="font-bold mb-3">Filter by Route</h3>
          <div className="flex flex-wrap gap-2">
            {availableRoutes.map(route => (
              <button 
                key={route}
                onClick={() => toggleRoute(route)}
                className={`px-3 py-1 rounded-full text-sm font-medium border transition-colors ${
                  selectedRoutes.includes(route) ? 'bg-blue-100 border-blue-200 text-blue-800' : 'bg-slate-50 border-slate-200 text-slate-500'
                }`}
              >
                {route}
              </button>
            ))}
          </div>
        </div>
        
        <div className="w-full md:w-64 border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-6">
          <h3 className="font-bold mb-3">Saved Filters</h3>
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input 
                type="text" 
                value={filterName}
                onChange={e => setFilterName(e.target.value)}
                placeholder="Save current..." 
                className="flex-1 px-2 py-1 text-sm border rounded" 
              />
              <button onClick={handleSaveFilter} className="px-3 py-1 bg-slate-800 text-white text-sm rounded hover:bg-slate-900">
                Save
              </button>
            </div>
            {savedFilters.length > 0 && (
              <select onChange={(e) => loadFilter(JSON.parse(e.target.value))} className="w-full p-2 border text-sm rounded mt-2">
                <option value="">Load a filter...</option>
                {savedFilters.map((f, i) => (
                  <option key={i} value={JSON.stringify(f.query)}>{f.name}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 border rounded-xl shadow-sm h-[500px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis domain={[0, 10]} label={{ value: 'Risk Score', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Legend />
              {selectedRoutes.map((route, i) => (
                <Line 
                  key={route}
                  type="monotone" 
                  dataKey={route} 
                  stroke={COLORS[i % COLORS.length]} 
                  strokeWidth={2}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">
            Insufficient data to render chart.
          </div>
        )}
      </div>
    </div>
  );
}
