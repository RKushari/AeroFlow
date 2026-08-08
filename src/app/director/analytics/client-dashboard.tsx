'use client';

import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { StaggerContainer, StaggerItem } from "@/components/animations/stagger-container";
import { normalizeDashboardLayout } from "./layout-utils";

export function AnalyticsDashboard({ 
  userId, 
  incidentData, 
  riskData, 
  fatigueData, 
  checklistData,
  initialLayout
}: { 
  userId: string;
  incidentData: any[];
  riskData: any[];
  fatigueData: any[];
  checklistData: any[];
  initialLayout: any;
}) {
  const [layout, setLayout] = useState<string[]>(() => normalizeDashboardLayout(initialLayout));

  useEffect(() => {
    setLayout((currentLayout) => normalizeDashboardLayout(currentLayout.length > 0 ? currentLayout : initialLayout));
  }, [initialLayout]);

  const saveLayout = async (newLayout: string[]) => {
    setLayout(newLayout);
    // Simple fire and forget to save preferences
    fetch('/api/preferences', {
      method: 'POST',
      body: JSON.stringify({ layout: newLayout }),
      headers: { 'Content-Type': 'application/json' }
    });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const newLayout = [...layout];
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < newLayout.length) {
      [newLayout[index], newLayout[newIndex]] = [newLayout[newIndex], newLayout[index]];
      saveLayout(newLayout);
    }
  };

  const COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6'];

  const renderWidget = (id: string) => {
    switch(id) {
      case 'incidents':
        return (
          <div className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-xl shadow-sm h-96 flex flex-col">
            <h2 className="font-bold mb-4 text-slate-900 dark:text-white">Incident Trends by Month</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="CRITICAL" stackId="a" fill="#ef4444" />
                <Bar dataKey="HIGH" stackId="a" fill="#f97316" />
                <Bar dataKey="MEDIUM" stackId="a" fill="#eab308" />
                <Bar dataKey="LOW" stackId="a" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        );
      case 'risk':
        return (
          <div className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-xl shadow-sm h-96 flex flex-col">
            <h2 className="font-bold mb-4 text-slate-900 dark:text-white">Average Departure Risk Score</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={riskData}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 10]} />
                <Tooltip />
                <Line type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'fatigue':
        return (
          <div className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-xl shadow-sm h-96 flex flex-col">
            <h2 className="font-bold mb-4 text-slate-900 dark:text-white">Fleet-Wide Fatigue Index</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={fatigueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 1]} />
                <Tooltip />
                <Bar dataKey="fatigue" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        );
      case 'checklists':
        return (
          <div className="bg-white dark:bg-slate-900 p-4 border dark:border-slate-800 rounded-xl shadow-sm h-96 flex flex-col">
            <h2 className="font-bold mb-4 text-slate-900 dark:text-white">Checklist Completion Rates (%)</h2>
            <div className="flex-1 min-h-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={checklistData}>
                  <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Bar dataKey="rate" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        );
      default: return null;
    }
  };

  return (
    <StaggerContainer className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {layout.map((id: string, idx: number) => (
        <StaggerItem key={id} className="relative group">
          {renderWidget(id)}
          <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="p-1 bg-slate-100 rounded text-xs disabled:opacity-50">←</button>
            <button onClick={() => moveItem(idx, 1)} disabled={idx === layout.length - 1} className="p-1 bg-slate-100 rounded text-xs disabled:opacity-50">→</button>
          </div>
        </StaggerItem>
      ))}
    </StaggerContainer>
  );
}
