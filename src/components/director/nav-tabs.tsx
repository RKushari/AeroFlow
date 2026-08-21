'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  FileText, 
  ShieldCheck, 
  BarChart3, 
  Radio, 
  MapPin, 
  TrendingUp 
} from 'lucide-react';

const TABS = [
  { href: '/director/ledger', label: 'Compliance Ledger', icon: FileText },
  { href: '/director/admin', label: 'Admin Panel', icon: ShieldCheck },
  { href: '/director/analytics', label: 'KPI Analytics', icon: BarChart3 },
  { href: '/director/broadcasts', label: 'Broadcasts', icon: Radio },
  { href: '/director/risk-map', label: 'Risk Map', icon: MapPin },
  { href: '/director/route-trends', label: 'Route Trends', icon: TrendingUp },
];

export function DirectorNavTabs() {
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 border-b border-slate-800 pb-2 overflow-x-auto font-mono text-xs">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = pathname === tab.href || (tab.href !== '/director' && pathname.startsWith(tab.href));

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl font-bold transition-all whitespace-nowrap cursor-pointer ${
              isActive
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/40 shadow-xs'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
            }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? 'text-blue-400' : 'text-slate-500'}`} />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </div>
  );
}
