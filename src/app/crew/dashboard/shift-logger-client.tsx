'use client';

import { useState, useEffect, useTransition } from 'react';
import { calculateFatigueIndex, FatigueEvaluationResult } from '@/lib/fatigue';
import { submitShiftLog, updateShiftLog } from '@/lib/actions/crew';
import { Activity, AlertTriangle, CheckCircle2, Clock, Edit3, ShieldAlert, UserCheck, X } from 'lucide-react';

interface ShiftLogItem {
  id: string;
  userId: string;
  startTime: Date | string;
  endTime?: Date | string | null;
  wakeTime?: Date | string | null;
  workDurationHours: number;
  alertnessScore: number;
  fatigueIndex: number;
  isFlagged: boolean;
  flagReason?: string | null;
  createdAt?: Date | string;
}

interface ShiftLoggerClientProps {
  initialLogs: ShiftLogItem[];
  flightId?: string;
  flightNumber?: string;
}

export function ShiftLoggerClient({ initialLogs, flightId, flightNumber }: ShiftLoggerClientProps) {
  const [isPending, startTransition] = useTransition();

  // Form State
  const [wakeTime, setWakeTime] = useState<string>(() => {
    const d = new Date();
    d.setHours(d.getHours() - 7); // Default 7 hours ago
    return d.toISOString().slice(0, 16);
  });
  const [workDuration, setWorkDuration] = useState<number>(8);
  const [alertness, setAlertness] = useState<number>(7);
  const [evalResult, setEvalResult] = useState<FatigueEvaluationResult>(() =>
    calculateFatigueIndex({
      wakeTime: new Date(Date.now() - 7 * 3600 * 1000),
      workDurationHours: 8,
      alertnessScore: 7,
    })
  );

  // Edit Modal State
  const [editingLog, setEditingLog] = useState<ShiftLogItem | null>(null);
  const [editWakeTime, setEditWakeTime] = useState<string>('');
  const [editWorkDuration, setEditWorkDuration] = useState<number>(8);
  const [editAlertness, setEditAlertness] = useState<number>(7);
  const [editEvalResult, setEditEvalResult] = useState<FatigueEvaluationResult | null>(null);

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Recalculate dynamic evaluation on input change
  useEffect(() => {
    const wakeDate = wakeTime ? new Date(wakeTime) : null;
    const res = calculateFatigueIndex({
      wakeTime: wakeDate,
      workDurationHours: Number(workDuration) || 0,
      alertnessScore: Number(alertness) || 5,
    });
    setEvalResult(res);
  }, [wakeTime, workDuration, alertness]);

  // Recalculate edit modal evaluation
  useEffect(() => {
    if (!editingLog) return;
    const wakeDate = editWakeTime ? new Date(editWakeTime) : null;
    const res = calculateFatigueIndex({
      wakeTime: wakeDate,
      workDurationHours: Number(editWorkDuration) || 0,
      alertnessScore: Number(editAlertness) || 5,
      startTime: new Date(editingLog.startTime),
    });
    setEditEvalResult(res);
  }, [editWakeTime, editWorkDuration, editAlertness, editingLog]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        await submitShiftLog(
          flightId,
          wakeTime ? new Date(wakeTime).toISOString() : null,
          Number(workDuration),
          Number(alertness),
          evalResult.fatigueIndex
        );
        setMessage({ type: 'success', text: 'Shift log submitted successfully!' });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Failed to submit shift log.' });
      }
    });
  };

  const handleOpenEdit = (log: ShiftLogItem) => {
    setEditingLog(log);
    const wt = log.wakeTime ? new Date(log.wakeTime).toISOString().slice(0, 16) : '';
    setEditWakeTime(wt);
    setEditWorkDuration(log.workDurationHours || 8);
    setEditAlertness(log.alertnessScore || 7);
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;
    setMessage(null);

    startTransition(async () => {
      try {
        await updateShiftLog(
          editingLog.id,
          editWakeTime ? new Date(editWakeTime).toISOString() : null,
          Number(editWorkDuration),
          Number(editAlertness)
        );
        setEditingLog(null);
        setMessage({ type: 'success', text: 'Shift log entry updated successfully!' });
      } catch (err: any) {
        setMessage({ type: 'error', text: err.message || 'Failed to update shift log.' });
      }
    });
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Logger & Evaluator Form Card */}
      <div className="p-6 bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl shadow-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white font-mono flex items-center gap-2">
                CREW FATIGUE EVALUATION & SHIFT LOGGER
              </h2>
              <p className="text-xs text-slate-400 font-mono">
                {flightNumber ? `Flight ${flightNumber} Dispatch Logging` : 'Ground Operations Safety & Readiness Tracker'}
              </p>
            </div>
          </div>
          <span className="px-3 py-1 text-xs font-bold font-mono rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            AUTO-EVAL ENGINE
          </span>
        </div>

        {message && (
          <div className={`p-4 rounded-xl text-xs font-mono border flex items-center justify-between ${
            message.type === 'success' ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300' : 'bg-red-950/60 border-red-800 text-red-300'
          }`}>
            <span className="flex items-center gap-2">
              {message.type === 'success' ? <CheckCircle2 className="h-4 w-4 text-emerald-400" /> : <AlertTriangle className="h-4 w-4 text-red-400" />}
              {message.text}
            </span>
            <button onClick={() => setMessage(null)} className="text-slate-400 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Inputs Section */}
          <div className="lg:col-span-2 space-y-4 font-mono">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                1. Daily Wake-Up Time
              </label>
              <input
                type="datetime-local"
                value={wakeTime}
                onChange={(e) => setWakeTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Calculates wakefulness duration prior to shift.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>2. Continuous Work Duration (Hours)</span>
                <span className="text-blue-400 font-bold">{workDuration} hrs</span>
              </div>
              <input
                type="number"
                step="0.5"
                min="0.5"
                max="24"
                value={workDuration}
                onChange={(e) => setWorkDuration(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Includes continuous duty & pre-flight preparation hours.</p>
            </div>

            <div>
              <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
                <span>3. Self-Reported Alertness Score (1-10)</span>
                <span className={`font-bold ${alertness <= 3 ? 'text-red-400' : alertness <= 6 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {alertness} / 10 ({alertness <= 3 ? 'Exhausted' : alertness <= 6 ? 'Moderate' : 'Fully Alert'})
                </span>
              </div>
              <input
                type="range"
                min="1"
                max="10"
                value={alertness}
                onChange={(e) => setAlertness(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-blue-500 border border-slate-800"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono mt-1">
                <span>1 (Severe Fatigue)</span>
                <span>5 (Neutral)</span>
                <span>10 (Optimal Vigilance)</span>
              </div>
            </div>
          </div>

          {/* Dynamic Evaluation Scorecard */}
          <div className="p-5 bg-slate-950/80 border border-slate-800 rounded-xl flex flex-col justify-between space-y-4 font-mono">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wider mb-2 font-bold flex items-center justify-between">
                <span>Calculated Fatigue Index</span>
                <span className="text-[10px] text-slate-500">SCALE 1.0 - 10.0</span>
              </div>

              <div className="flex items-baseline gap-2">
                <span className={`text-4xl font-extrabold font-mono ${
                  evalResult.fatigueIndex >= 7.0 ? 'text-red-400' :
                  evalResult.fatigueIndex >= 5.0 ? 'text-amber-400' : 'text-emerald-400'
                }`}>
                  {evalResult.fatigueIndex.toFixed(1)}
                </span>
                <span className="text-xs text-slate-400 font-mono">/ 10.0</span>
              </div>

              {/* Status Badge */}
              <div className="mt-3">
                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase inline-flex items-center gap-1.5 border ${
                  evalResult.severity === 'CRITICAL' ? 'bg-red-950/80 text-red-300 border-red-800' :
                  evalResult.severity === 'HIGH' ? 'bg-orange-950/80 text-orange-300 border-orange-800' :
                  evalResult.severity === 'ELEVATED' ? 'bg-amber-950/80 text-amber-300 border-amber-800' :
                  'bg-emerald-950/80 text-emerald-300 border-emerald-800'
                }`}>
                  {evalResult.severity === 'NORMAL' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {evalResult.severity !== 'NORMAL' && <AlertTriangle className="h-3.5 w-3.5" />}
                  {evalResult.severity} FATIGUE LEVEL
                </span>
              </div>

              {/* Hours Awake summary */}
              <div className="mt-3 text-[11px] text-slate-400 flex justify-between border-t border-slate-800/80 pt-2">
                <span>Estimated Time Awake:</span>
                <span className="text-white font-bold">{evalResult.hoursAwake} hrs</span>
              </div>
            </div>

            {/* Safety Boundary Flag Warning Banner */}
            {evalResult.isFlagged ? (
              <div className="p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-red-300 text-[11px] space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <ShieldAlert className="h-4 w-4" /> SAFETY BOUNDARY BREACHED
                </div>
                <p className="leading-tight text-red-200/90">{evalResult.flagReason}</p>
              </div>
            ) : (
              <div className="p-3 bg-emerald-950/40 border border-emerald-800/50 rounded-xl text-emerald-300 text-[11px] flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-emerald-400" />
                <span>Within safe operational limits. Ready for dispatch duty.</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className={`w-full py-2.5 rounded-xl font-bold text-xs font-mono transition-all shadow-lg flex items-center justify-center gap-2 ${
                evalResult.isFlagged
                  ? 'bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 text-white shadow-red-900/40'
                  : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white shadow-blue-900/40'
              }`}
            >
              {isPending ? 'Logging Shift...' : evalResult.isFlagged ? 'Submit Flagged Shift Log' : 'Clock In & Log Shift'}
            </button>
          </div>
        </form>
      </div>

      {/* Review & Edit Previous Logs Section */}
      <div className="p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl shadow-xl space-y-4 font-mono">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-400" /> RECENT SHIFT LOGS & SAFETY HISTORY
          </h3>
          <span className="text-xs text-slate-400">{initialLogs.length} Records</span>
        </div>

        {initialLogs.length === 0 ? (
          <div className="p-6 text-center text-slate-500 text-xs">
            No previous shift logs found. Submit a shift log above to start recording duty readiness.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 text-[11px] uppercase tracking-wider">
                  <th className="py-2.5 px-3">Date / Start Time</th>
                  <th className="py-2.5 px-3">Wake Time</th>
                  <th className="py-2.5 px-3">Work Duration</th>
                  <th className="py-2.5 px-3">Alertness</th>
                  <th className="py-2.5 px-3">Fatigue Index</th>
                  <th className="py-2.5 px-3">Safety Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {initialLogs.map((log) => {
                  const startTimeStr = new Date(log.startTime).toLocaleString([], {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  const wakeStr = log.wakeTime
                    ? new Date(log.wakeTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : 'N/A';

                  return (
                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-3 font-semibold">{startTimeStr}</td>
                      <td className="py-3 px-3 text-slate-400">{wakeStr}</td>
                      <td className="py-3 px-3">{log.workDurationHours} hrs</td>
                      <td className="py-3 px-3">{log.alertnessScore} / 10</td>
                      <td className="py-3 px-3 font-bold font-mono">
                        <span className={
                          log.fatigueIndex >= 7.0 ? 'text-red-400' :
                          log.fatigueIndex >= 5.0 ? 'text-amber-400' : 'text-emerald-400'
                        }>
                          {log.fatigueIndex.toFixed(1)}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {log.isFlagged ? (
                          <span className="px-2 py-0.5 rounded-full bg-red-950 text-red-300 border border-red-800 text-[10px] font-bold flex items-center gap-1 w-fit" title={log.flagReason || ''}>
                            <AlertTriangle className="h-3 w-3 text-red-400" /> FLAGGED BREACH
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 text-[10px] font-bold flex items-center gap-1 w-fit">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" /> PASSED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => handleOpenEdit(log)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 ml-auto"
                        >
                          <Edit3 className="h-3 w-3 text-blue-400" /> Review / Edit
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Shift Log Modal */}
      {editingLog && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-5 font-mono">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-blue-400" /> REVIEW & EDIT SHIFT LOG ENTRY
              </h3>
              <button onClick={() => setEditingLog(null)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Daily Wake Time</label>
                <input
                  type="datetime-local"
                  value={editWakeTime}
                  onChange={(e) => setEditWakeTime(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Work Duration (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0.5"
                  max="24"
                  value={editWorkDuration}
                  onChange={(e) => setEditWorkDuration(parseFloat(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Alertness Score (1-10): <span className="text-blue-400">{editAlertness}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={editAlertness}
                  onChange={(e) => setEditAlertness(parseInt(e.target.value, 10))}
                  className="w-full accent-blue-500"
                />
              </div>

              {editEvalResult && (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">Recalculated Fatigue Index:</span>
                    <div className="font-bold text-lg text-white font-mono">
                      {editEvalResult.fatigueIndex.toFixed(1)} / 10.0
                    </div>
                  </div>
                  {editEvalResult.isFlagged ? (
                    <span className="px-2.5 py-1 bg-red-950 text-red-300 border border-red-800 rounded-full font-bold text-[10px]">
                      FLAGGED BREACH
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 bg-emerald-950 text-emerald-300 border border-emerald-800 rounded-full font-bold text-[10px]">
                      NORMAL
                    </span>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-900/40"
                >
                  {isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
