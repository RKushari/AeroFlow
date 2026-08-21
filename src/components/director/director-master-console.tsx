'use client';

import React, { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  ShieldCheck, 
  BarChart3, 
  Radio, 
  MapPin, 
  TrendingUp,
  Zap
} from 'lucide-react';
import { LedgerTable } from '@/app/director/ledger/ledger-client';
import AdminClient from '@/app/director/admin/admin-client';
import { AnalyticsWrapper } from '@/app/director/analytics/analytics-wrapper';
import { BroadcastBoard } from '@/components/director/broadcast-board';
import { RiskMapClient } from '@/app/director/risk-map/client-map';
import { RouteTrendsClient } from '@/app/director/route-trends/client-trends';

export type DirectorTabId = 'ledger' | 'admin' | 'analytics' | 'broadcasts' | 'risk-map' | 'route-trends';

interface DirectorMasterConsoleProps {
  initialTab?: DirectorTabId;
  callerId: string;
  auditLogs: any[];
  users: any[];
  threshold: number;
  recentLogs: any[];
  kpiData: {
    incidentData: any[];
    riskData: any[];
    fatigueData: any[];
    checklistData: any[];
    initialLayout: any;
  };
  broadcasts: any[];
  airports: any[];
  flagged: any[];
  chartData: any[];
  availableRoutes: any[];
  savedFilters: any[];
}

const TABS = [
  { id: 'ledger' as DirectorTabId, href: '/director/ledger', label: 'Compliance Ledger', icon: FileText },
  { id: 'admin' as DirectorTabId, href: '/director/admin', label: 'Admin Panel', icon: ShieldCheck },
  { id: 'analytics' as DirectorTabId, href: '/director/analytics', label: 'KPI Analytics', icon: BarChart3 },
  { id: 'broadcasts' as DirectorTabId, href: '/director/broadcasts', label: 'Broadcasts', icon: Radio },
  { id: 'risk-map' as DirectorTabId, href: '/director/risk-map', label: 'Risk Map', icon: MapPin },
  { id: 'route-trends' as DirectorTabId, href: '/director/route-trends', label: 'Route Trends', icon: TrendingUp },
];

export function DirectorMasterConsole({
  initialTab = 'ledger',
  callerId,
  auditLogs,
  users,
  threshold,
  recentLogs,
  kpiData,
  broadcasts,
  airports,
  flagged,
  chartData,
  availableRoutes,
  savedFilters
}: DirectorMasterConsoleProps) {
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState<DirectorTabId>(() => {
    if (pathname.includes('/admin')) return 'admin';
    if (pathname.includes('/analytics')) return 'analytics';
    if (pathname.includes('/broadcasts')) return 'broadcasts';
    if (pathname.includes('/risk-map')) return 'risk-map';
    if (pathname.includes('/route-trends')) return 'route-trends';
    return initialTab;
  });

  useEffect(() => {
    if (pathname.includes('/admin')) setActiveTab('admin');
    else if (pathname.includes('/analytics')) setActiveTab('analytics');
    else if (pathname.includes('/broadcasts')) setActiveTab('broadcasts');
    else if (pathname.includes('/risk-map')) setActiveTab('risk-map');
    else if (pathname.includes('/route-trends')) setActiveTab('route-trends');
    else if (pathname.includes('/ledger')) setActiveTab('ledger');
  }, [pathname]);

  const handleTabSwitch = (tab: typeof TABS[number]) => {
    setActiveTab(tab.id);
    if (typeof window !== 'undefined') {
      window.history.pushState(null, '', tab.href);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* HUD Header Sub-navigation with INSTANT 0ms Switching */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto font-mono text-xs">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleTabSwitch(tab)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-900/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-950/60 border border-emerald-800/80 rounded-xl text-[11px] font-mono text-emerald-400">
          <Zap className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>INSTANT 0ms CONSOLE SWITCHING ACTIVE</span>
        </div>
      </div>

      {/* INSTANT TAB PANELS (Zero-latency state switching) */}
      <div className="w-full">
        {/* Compliance Ledger */}
        <div className={activeTab === 'ledger' ? 'block' : 'hidden'}>
          <div className="flex flex-col gap-6">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold font-mono">Compliance Ledger Explorer</h1>
            </div>
            <LedgerTable auditLogs={auditLogs} />
          </div>
        </div>

        {/* System Admin Panel */}
        <div className={activeTab === 'admin' ? 'block' : 'hidden'}>
          <div className="space-y-6 font-mono">
            <div className="flex justify-between items-center">
              <h1 className="text-2xl font-bold text-white">System Admin Control Panel</h1>
            </div>
            <AdminClient
              initialUsers={users}
              initialThreshold={threshold}
              recentLogs={recentLogs}
              callerId={callerId}
            />
          </div>
        </div>

        {/* Executive KPI Analytics */}
        <div className={activeTab === 'analytics' ? 'block' : 'hidden'}>
          <div className="p-2 md:p-4 font-mono">
            <h1 className="text-2xl md:text-3xl font-bold mb-6 text-white">Executive Safety KPI Analytics</h1>
            <AnalyticsWrapper
              userId={callerId}
              incidentData={kpiData.incidentData}
              riskData={kpiData.riskData}
              fatigueData={kpiData.fatigueData}
              checklistData={kpiData.checklistData}
              initialLayout={kpiData.initialLayout}
            />
          </div>
        </div>

        {/* Global Broadcasts */}
        <div className={activeTab === 'broadcasts' ? 'block' : 'hidden'}>
          <div className="py-2 font-mono">
            <BroadcastBoard initialMessages={broadcasts} />
          </div>
        </div>

        {/* Weather Risk Map */}
        <div className={activeTab === 'risk-map' ? 'block' : 'hidden'}>
          <div className="p-2 md:p-4 max-w-6xl mx-auto font-mono">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Weather Risk Map</h1>
            <p className="text-slate-400 text-sm mb-6">Real-time geographic risk visualization and zone flagging.</p>
            <RiskMapClient airports={airports} initialFlagged={flagged} />
          </div>
        </div>

        {/* Flight Route Trends */}
        <div className={activeTab === 'route-trends' ? 'block' : 'hidden'}>
          <div className="p-2 md:p-4 max-w-6xl mx-auto font-mono">
            <h1 className="text-2xl md:text-3xl font-bold mb-2 text-white">Flight Route Risk Trends</h1>
            <p className="text-slate-400 text-sm mb-6">Monthly average risk trends analyzed by departure route.</p>
            <RouteTrendsClient
              chartData={chartData}
              availableRoutes={availableRoutes}
              savedFilters={savedFilters}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
