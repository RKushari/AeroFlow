'use client';

import React, { useState } from 'react';
import { Plane, Maximize2, Minimize2, Shield, Wrench, Info, Eye, Activity } from 'lucide-react';

export function FlightSimulator3D() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activeTab, setActiveTab] = useState<'3D' | 'SPECS' | 'INSPECTION'>('3D');

  return (
    <div className={`relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl transition-all ${isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-[580px]'}`}>
      
      {/* Top HUD Header Bar */}
      <div className="absolute top-0 inset-x-0 p-4 bg-slate-950/85 backdrop-blur-md border-b border-slate-800/80 z-20 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600/20 text-blue-400 rounded-xl border border-blue-500/30">
            <Plane className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm font-mono text-white tracking-wide">BOEING 737-800 3D INSPECTION DECK</h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span> 3D RENDER ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">CFM56-7B Powered Twin-Jet Engine Airframe</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl font-mono text-xs">
            <button
              onClick={() => setActiveTab('3D')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${activeTab === '3D' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              3D Orbit Model
            </button>
            <button
              onClick={() => setActiveTab('SPECS')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${activeTab === 'SPECS' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Airframe Specs
            </button>
            <button
              onClick={() => setActiveTab('INSPECTION')}
              className={`px-3 py-1 rounded-lg transition-colors font-bold ${activeTab === 'INSPECTION' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Ground Checklist
            </button>
          </div>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen View"}
          >
            {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Main Container Content */}
      <div className="w-full h-full pt-16 relative bg-slate-950">
        
        {/* 3D Sketchfab Interactive Model */}
        {activeTab === '3D' && (
          <div className="w-full h-full relative">
            <iframe 
              title="Boeing 737-800" 
              className="w-full h-full border-0"
              allowFullScreen 
              allow="autoplay; fullscreen; xr-spatial-tracking" 
              src="https://sketchfab.com/models/7a548b5ba64340f78f7c58d23781ffe9/embed?ui_theme=dark&autostart=1" 
            />

            {/* Bottom Overlay Hint */}
            <div className="absolute bottom-4 left-4 p-3 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl text-[11px] font-mono text-slate-300 pointer-events-none z-10 hidden md:flex items-center gap-3">
              <span className="flex items-center gap-1 text-blue-400 font-bold">
                <Eye className="h-3.5 w-3.5" /> 360° Interactive Orbit:
              </span>
              <span>Left-Click Drag to Rotate &nbsp;|&nbsp; Scroll to Zoom &nbsp;|&nbsp; Right-Click to Pan</span>
            </div>
          </div>
        )}

        {/* Airframe Specs Overlay */}
        {activeTab === 'SPECS' && (
          <div className="p-8 h-full overflow-y-auto font-mono space-y-6 text-slate-200 bg-slate-950/90 backdrop-blur-md">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
              <Shield className="h-6 w-6 text-blue-400" />
              <div>
                <h4 className="text-lg font-bold text-white">Boeing 737-800 Technical Specifications</h4>
                <p className="text-xs text-slate-400">Commercial Narrow-Body Twin-Engine Jet Airliner</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">LENGTH</div>
                <div className="text-lg font-bold text-emerald-400">39.5 meters (129 ft 6 in)</div>
                <div className="text-[10px] text-slate-500">Fuselage length nose-to-tail</div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">WINGSPAN</div>
                <div className="text-lg font-bold text-blue-400">35.8 meters (117 ft 5 in)</div>
                <div className="text-[10px] text-slate-500">Includes blended winglets</div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">MAX TAKEOFF WEIGHT</div>
                <div className="text-lg font-bold text-amber-400">79,010 kg (174,200 lbs)</div>
                <div className="text-[10px] text-slate-500">Maximum structural MTOW</div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">POWERPLANT</div>
                <div className="text-base font-bold text-white">2x CFM International CFM56-7B</div>
                <div className="text-[10px] text-slate-500">27,300 lbf max thrust rating</div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">CRUISE SPEED</div>
                <div className="text-base font-bold text-white">Mach 0.785 (453 knots / 838 km/h)</div>
                <div className="text-[10px] text-slate-500">Optimum flight level cruising velocity</div>
              </div>

              <div className="bg-slate-900/90 p-4 rounded-xl border border-slate-800 space-y-2">
                <div className="text-slate-400">SERVICE CEILING</div>
                <div className="text-base font-bold text-white">41,000 feet (12,500 m)</div>
                <div className="text-[10px] text-slate-500">Maximum operational altitude</div>
              </div>
            </div>
          </div>
        )}

        {/* Ground Inspection Overlay */}
        {activeTab === 'INSPECTION' && (
          <div className="p-8 h-full overflow-y-auto font-mono space-y-4 text-slate-200 bg-slate-950/90 backdrop-blur-md">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <Wrench className="h-6 w-6 text-amber-400" />
              <div>
                <h4 className="text-lg font-bold text-white">3D Airframe Walkaround Inspection Routing</h4>
                <p className="text-xs text-slate-400">Mandatory Ground Crew Visual Safety Audit Points</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/30">1</span>
                <div>
                  <div className="font-bold text-white">Nose Cone & Pitot-Static Tubes</div>
                  <div className="text-slate-400 mt-0.5">Inspect radome for bird strikes, verify pitot covers are removed and static ports are clean.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/30">2</span>
                <div>
                  <div className="font-bold text-white">CFM56 Engine Fan Blades & Cowlings</div>
                  <div className="text-slate-400 mt-0.5">Inspect spinner and fan blades for nicks/FOD damage, check oil access doors and reverse thrust latches.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/30">3</span>
                <div>
                  <div className="font-bold text-white">Main Landing Gear & Hydraulic Lines</div>
                  <div className="text-slate-400 mt-0.5">Verify tire tread depth, brake wear pin indicators, and inspect strut seals for fluid leaks.</div>
                </div>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-blue-600/20 text-blue-400 flex items-center justify-center font-bold shrink-0 border border-blue-500/30">4</span>
                <div>
                  <div className="font-bold text-white">Empennage & APU Intake</div>
                  <div className="text-slate-400 mt-0.5">Check rudder and elevator hinge pins, verify tailcone APU exhaust vent free of obstructions.</div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
