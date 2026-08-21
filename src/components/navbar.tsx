'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import ProfileDropdown from '@/components/profile-dropdown';
import { ThemeToggle } from '@/components/theme-toggle';
import { LayoutDashboard, Users, AlertTriangle, Shield, Plane } from 'lucide-react';

interface TopNavProps {
  session: any;
}

export function TopNav({ session }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const handleWarmup = (href: string) => {
    try {
      router.prefetch(href);
    } catch (e) {
      // ignore
    }
  };

  const navItems = [
    { href: '/incidents', label: 'Hazard Reporter', icon: AlertTriangle, isHazard: true },
  ];

  return (
    <header className="glass-header px-4 py-3 sticky top-0 z-50 flex items-center justify-between transition-colors duration-300 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="flex items-center gap-6">
        <Link 
          href="/" 
          prefetch={true}
          onMouseEnter={() => handleWarmup('/')}
          className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent flex items-center gap-2 font-mono"
        >
          <Plane className="w-5 h-5 text-cyan-400" />
          <span>AeroFlow</span>
        </Link>

        {pathname !== '/' && (
          <nav className="hidden md:flex items-center gap-2 text-xs font-mono font-bold">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('/')[1] ? `/${item.href.split('/')[1]}` : item.href));

              if (item.isHazard) {
                const showHazard = pathname.startsWith('/crew') || pathname.startsWith('/dispatcher');
                if (!showHazard) return null;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    onMouseEnter={() => handleWarmup(item.href)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all ${
                      isActive
                        ? 'bg-red-600 text-white border-red-500 shadow-md shadow-red-950'
                        : 'text-red-400 hover:text-red-300 bg-red-950/40 border-red-800/50 hover:bg-red-900/40'
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 animate-ping" />
                    <Icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  prefetch={true}
                  onMouseEnter={() => handleWarmup(item.href)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border transition-all ${
                    isActive
                      ? item.activeBg
                      : 'text-slate-300 border-transparent hover:bg-slate-900/80 ' + item.color
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        )}
      </div>

      <div className="flex items-center gap-3">
        <ProfileDropdown session={session} />
        <ThemeToggle />
      </div>
    </header>
  );
}
