'use client';

export default function Loading() {
  return (
    <div className="fixed top-0 inset-x-0 z-50 pointer-events-none">
      {/* Top Animated Glowing Progress Line */}
      <div className="h-1 w-full bg-slate-900 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 animate-[pulse_0.6s_ease-in-out_infinite] w-full origin-left" />
      </div>

      {/* Top HUD Floating Spinner Badge */}
      <div className="absolute top-3 right-6 bg-slate-950/90 border border-cyan-500/50 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-mono font-bold text-cyan-300 shadow-lg shadow-cyan-950/40 flex items-center gap-2">
        <div className="w-3.5 h-3.5 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin" />
        <span>Loading Feature...</span>
      </div>
    </div>
  );
}
