"use client";

import { useState } from "react";
import Link from "next/link";
import { PlaneTakeoff, Wrench, ShieldAlert, Activity, Users, CloudLightning, ArrowRight, Radio, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { getCombinedRiskFactors } from "@/lib/actions/risk-analytics";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring", stiffness: 80, damping: 15 } as const
  }
};

const cardHover = {
  scale: 1.02,
  transition: { type: "spring", stiffness: 300, damping: 20 } as const
};

export function CommandCenterClient({ stats }: { stats: { flightsCount: number, alertsCount: number } }) {
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [riskData, setRiskData] = useState<any>(null);
  const [loadingRisk, setLoadingRisk] = useState(false);

  const handleRiskClick = async () => {
    setLoadingRisk(true);
    setShowRiskModal(true);
    try {
      const data = await getCombinedRiskFactors();
      setRiskData(data);
    } catch (err) {
      console.error(err);
    }
    setLoadingRisk(false);
  };

  return (
    <>
    <motion.div
      className="flex flex-col gap-10 min-h-[85vh] py-8"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
    >
      {/* ── Hero Section ── */}
      <motion.div variants={itemVariants} className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/10 pb-10">
        <div className="space-y-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/15 text-emerald-300 text-sm font-medium border border-emerald-500/30"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
            </span>
            All Systems Operational
          </motion.div>

          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-white leading-tight">
            AeroFlow{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-300 to-teal-400">
              Command Center
            </span>
          </h1>
          <p className="text-white/60 max-w-xl text-lg leading-relaxed">
            Enterprise-grade aviation safety platform. Monitor dispatch operations, ground crew readiness, and algorithmic risk assessments in real-time.
          </p>
        </div>

        {/* ── Quick Stats ── */}
        <div className="flex gap-4">
          <Link href="/flights">
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="stat-card rounded-xl p-5 min-w-[140px] cursor-pointer"
            >
              <span className="text-sm text-white/50 block mb-1 uppercase tracking-wider font-medium">Active Flights</span>
              <span className="text-3xl font-bold text-white flex items-center gap-2">
                {stats.flightsCount} <Activity className="text-emerald-400 h-5 w-5" />
              </span>
            </motion.div>
          </Link>
          <motion.div
            whileHover={{ scale: 1.05 }}
            onClick={handleRiskClick}
            className="stat-card rounded-xl p-5 min-w-[140px] cursor-pointer"
          >
            <span className="text-sm text-white/50 block mb-1 uppercase tracking-wider font-medium">Risk Alerts</span>
            <span className="text-3xl font-bold text-white flex items-center gap-2">
              {stats.alertsCount} <ShieldAlert className="text-amber-400 h-5 w-5" />
            </span>
          </motion.div>
        </div>
      </motion.div>

      {/* ── Navigation Cards ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
        {/* Flight Dispatch */}
        <motion.div variants={itemVariants} whileHover={cardHover}>
          <Link
            href="/dispatcher/dashboard"
            className="glass-card group block h-full rounded-2xl overflow-hidden"
          >
            <div className="p-8 h-full flex flex-col">
              <div className="p-3.5 rounded-xl bg-blue-500/15 text-blue-400 w-fit mb-6 ring-1 ring-blue-500/25 group-hover:bg-blue-500/25 group-hover:ring-blue-400/40 transition-all">
                <PlaneTakeoff size={26} />
              </div>
              <h3 className="font-bold text-2xl mb-2 text-white group-hover:text-blue-300 transition-colors">
                Flight Dispatch
              </h3>
              <p className="text-white/50 mb-8 flex-grow leading-relaxed group-hover:text-white/70 transition-colors">
                Review flight dossiers, monitor aggregated risk scores, and approve or reject dispatch plans.
              </p>
              <div className="flex items-center text-blue-400 font-semibold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                Launch Workspace <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Ground Crew */}
        <motion.div variants={itemVariants} whileHover={cardHover}>
          <Link
            href="/crew/dashboard"
            className="glass-card group block h-full rounded-2xl overflow-hidden"
          >
            <div className="p-8 h-full flex flex-col">
              <div className="p-3.5 rounded-xl bg-amber-500/15 text-amber-400 w-fit mb-6 ring-1 ring-amber-500/25 group-hover:bg-amber-500/25 group-hover:ring-amber-400/40 transition-all">
                <Wrench size={26} />
              </div>
              <h3 className="font-bold text-2xl mb-2 text-white group-hover:text-amber-300 transition-colors">
                Ground Crew
              </h3>
              <p className="text-white/50 mb-8 flex-grow leading-relaxed group-hover:text-white/70 transition-colors">
                Complete mandatory pre-flight checklists, report maintenance incidents, and log shift fatigue.
              </p>
              <div className="flex items-center text-amber-400 font-semibold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                Open Terminal <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>

        {/* Director */}
        <motion.div variants={itemVariants} whileHover={cardHover}>
          <Link
            href="/director/ledger"
            className="glass-card group block h-full rounded-2xl overflow-hidden"
          >
            <div className="p-8 h-full flex flex-col">
              <div className="p-3.5 rounded-xl bg-purple-500/15 text-purple-400 w-fit mb-6 ring-1 ring-purple-500/25 group-hover:bg-purple-500/25 group-hover:ring-purple-400/40 transition-all">
                <ShieldAlert size={26} />
              </div>
              <h3 className="font-bold text-2xl mb-2 text-white group-hover:text-purple-300 transition-colors">
                Director Audit
              </h3>
              <p className="text-white/50 mb-8 flex-grow leading-relaxed group-hover:text-white/70 transition-colors">
                Access the immutable compliance ledger, override blocked dispatch, and review system analytics.
              </p>
              <div className="flex items-center text-purple-400 font-semibold text-sm uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                Access Console <ArrowRight className="ml-2 h-4 w-4" />
              </div>
            </div>
          </Link>
        </motion.div>
      </div>

      {/* ── Bottom Info Strip ── */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-4">
        <div className="info-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-2.5 bg-white/10 rounded-lg">
            <Users className="text-white/70 h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Role-Based Access</h4>
            <p className="text-xs text-white/45 leading-relaxed">Strict RBAC enforcement across all server actions and API routes.</p>
          </div>
        </div>
        <div className="info-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-2.5 bg-white/10 rounded-lg">
            <CloudLightning className="text-white/70 h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Live Telemetry</h4>
            <p className="text-xs text-white/45 leading-relaxed">Real-time SSE streams and automated background weather polling.</p>
          </div>
        </div>
        <div className="info-card rounded-xl p-5 flex items-start gap-4">
          <div className="p-2.5 bg-white/10 rounded-lg">
            <Radio className="text-white/70 h-5 w-5" />
          </div>
          <div>
            <h4 className="font-semibold text-white text-sm mb-1">Immutable Audit</h4>
            <p className="text-xs text-white/45 leading-relaxed">Every mutation logged with user, IP, timestamp, and state delta.</p>
          </div>
        </div>
      </motion.div>
    </motion.div>

    <AnimatePresence>
      {showRiskModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-slate-900 border border-slate-700 p-8 rounded-2xl w-full max-w-lg shadow-2xl relative"
          >
            <button
              onClick={() => setShowRiskModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldAlert className="text-amber-400" /> Combined Risk Factors
            </h2>
            
            {loadingRisk ? (
              <div className="text-slate-400 text-center py-8">Aggregating real-time fleet risk factors...</div>
            ) : riskData ? (
              <div className="space-y-6">
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="text-sm text-slate-400 mb-1">Fleet Average Total Risk</div>
                  <div className="text-4xl font-black text-amber-400">{riskData.totalAverage.toFixed(2)}</div>
                  <div className="text-xs text-slate-500 mt-2">Across {riskData.count} active tracked flights</div>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Fatigue</div>
                    <div className="text-xl font-bold text-white">{riskData.fatigueAverage.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Weather</div>
                    <div className="text-xl font-bold text-white">{riskData.weatherAverage.toFixed(2)}</div>
                  </div>
                  <div className="p-3 bg-slate-800/50 rounded-lg text-center">
                    <div className="text-xs text-slate-400 mb-1 uppercase tracking-wider">Mechanical</div>
                    <div className="text-xl font-bold text-white">{riskData.mechAverage.toFixed(2)}</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-red-400 text-center py-8">Failed to load risk factors.</div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
    </>
  );
}
