'use client';

import React, { useState, useTransition } from 'react';
import { 
  Sparkles, 
  Fuel, 
  Plane, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Trash2, 
  Copy, 
  Check, 
  History, 
  Edit3, 
  Eye, 
  RotateCcw,
  ShieldCheck,
  FileText
} from 'lucide-react';
import { regenerateBriefing, commitAndApproveBriefing, deleteBriefing } from '@/lib/actions/briefing';

interface BriefingRecord {
  id: string;
  flightId: string;
  draftContent: string;
  finalContent: string | null;
  isApproved: boolean;
  deletedAt: Date | string | null;
}

interface BriefingEditorProps {
  flightId: string;
  flightNumber: string;
  briefings: BriefingRecord[];
  riskScore: number;
  weatherSeverity: number;
}

export function BriefingEditor({
  flightId,
  flightNumber,
  briefings,
  riskScore,
  weatherSeverity
}: BriefingEditorProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedBriefingIndex, setSelectedBriefingIndex] = useState<number>(0);
  const [viewMode, setViewMode] = useState<'preview' | 'edit'>('preview');
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const activeBriefing = briefings[selectedBriefingIndex] || briefings[0];
  const [content, setContent] = useState<string>(
    activeBriefing ? (activeBriefing.finalContent || activeBriefing.draftContent) : ''
  );

  // Sync content when selecting different briefing from history
  React.useEffect(() => {
    if (activeBriefing) {
      setContent(activeBriefing.finalContent || activeBriefing.draftContent);
    }
  }, [selectedBriefingIndex, activeBriefing]);

  const handleGenerate = () => {
    startTransition(async () => {
      await regenerateBriefing(flightId);
      setSelectedBriefingIndex(0);
      setViewMode('preview');
    });
  };

  const handleCommit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content || content.length < 30) return;
    startTransition(async () => {
      await commitAndApproveBriefing(flightId, content, activeBriefing?.id);
      setViewMode('preview');
    });
  };

  const handleDelete = (briefingId: string) => {
    if (!confirm('Are you sure you want to delete this briefing draft?')) return;
    startTransition(async () => {
      await deleteBriefing(briefingId, flightId);
      if (selectedBriefingIndex > 0) {
        setSelectedBriefingIndex(0);
      }
    });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Quick summary calculation for executive pills
  const fuelBufferKg = Math.round(1000 + (weatherSeverity * 1800) + (riskScore * 200));
  const fuelBufferMins = Math.round(15 + weatherSeverity * 20 + riskScore * 3);
  const flightLevel = weatherSeverity > 6 ? 'FL380 (Step Climb)' : weatherSeverity > 3 ? 'FL360' : 'FL340';
  const pushbackBufferMins = Math.round(Math.max(5, riskScore * 2.5));

  return (
    <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col gap-6 transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-900/50">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                AI Flight Safety Scriptor
              </h2>
              {activeBriefing?.isApproved ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Approved Briefing
                </span>
              ) : activeBriefing ? (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  AI Draft (Pending Sign-off)
                </span>
              ) : null}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Incident mitigation, fuel contingency, altitude profiles & delay advisories
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {briefings.length > 1 && (
            <button
              type="button"
              onClick={() => setShowHistory(!showHistory)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1.5 ${
                showHistory 
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white' 
                  : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              History ({briefings.length})
            </button>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
          >
            {isPending ? (
              <>
                <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                Analyzing Flight & Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                {briefings.length > 0 ? 'Regenerate Draft' : 'Generate AI Briefing'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Structured Key Recommendations Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Fuel className="w-3.5 h-3.5 text-amber-500" />
            <span>Fuel Contingency</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            +{fuelBufferKg.toLocaleString()} kg
          </div>
          <span className="text-[10px] text-slate-400">+{fuelBufferMins} min holding reserve</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Plane className="w-3.5 h-3.5 text-blue-500" />
            <span>Recommended Altitude</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
            {flightLevel}
          </div>
          <span className="text-[10px] text-slate-400">Turbulence / CAT avoidance</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <Clock className="w-3.5 h-3.5 text-purple-500" />
            <span>Pushback Buffer</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            +{pushbackBufferMins} mins
          </div>
          <span className="text-[10px] text-slate-400">Ground sequencing window</span>
        </div>

        <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 flex flex-col gap-1">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Risk Index</span>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white">
            {riskScore.toFixed(2)} / 10.0
          </div>
          <span className="text-[10px] text-slate-400">
            {riskScore >= 7.5 ? 'Critical lock threshold' : 'Cleared operating band'}
          </span>
        </div>
      </div>

      {/* History Drawer if toggled */}
      {showHistory && briefings.length > 0 && (
        <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-3 border border-slate-200 dark:border-slate-800">
          <div className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Version History Archive</span>
            <span className="text-[11px] font-normal lowercase">{briefings.length} total versions</span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
            {briefings.map((b, idx) => (
              <div 
                key={b.id}
                onClick={() => setSelectedBriefingIndex(idx)}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between cursor-pointer transition-all ${
                  selectedBriefingIndex === idx
                    ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-300 dark:border-blue-800 text-blue-900 dark:text-blue-200 font-medium'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <FileText className="w-3.5 h-3.5 flex-shrink-0 text-slate-400" />
                  <span className="truncate">
                    Version #{briefings.length - idx} {b.isApproved ? '· Approved' : '· Draft'}
                  </span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[10px] text-slate-400">
                    {b.isApproved ? 'Signed' : 'Draft'}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(b.id);
                    }}
                    className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 dark:hover:bg-red-950/50 rounded transition-colors"
                    title="Delete Draft"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Content & Editor */}
      {briefings.length > 0 ? (
        <div className="flex flex-col gap-4">
          {/* Mode Tabs & Copy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'preview'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Formatted Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('edit')}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all flex items-center gap-1.5 ${
                  viewMode === 'edit'
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit / Delta Mode
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-800 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Text
                </>
              )}
            </button>
          </div>

          {/* Form & Content */}
          <form onSubmit={handleCommit} className="flex flex-col gap-3">
            {viewMode === 'edit' ? (
              <div className="flex flex-col gap-1.5">
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full h-80 p-4 text-xs sm:text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none leading-relaxed text-slate-900 dark:text-slate-100 resize-y"
                  placeholder="Enter or refine safety briefing content..."
                />
                <span className="text-[11px] text-slate-400 self-end">
                  {content.length} characters · Markdown supported
                </span>
              </div>
            ) : (
              <div className="w-full min-h-80 max-h-[500px] overflow-y-auto p-5 bg-slate-50/70 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800/80 rounded-xl text-xs sm:text-sm leading-relaxed text-slate-800 dark:text-slate-200 space-y-3 font-sans">
                {content.split('\n\n').map((block, i) => {
                  if (block.startsWith('### ')) {
                    return (
                      <h3 key={i} className="text-sm font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-1 pt-2 first:pt-0">
                        {block.replace('### ', '')}
                      </h3>
                    );
                  } else if (block.startsWith('[AI GENERATED DRAFT')) {
                    return (
                      <div key={i} className="p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-amber-800 dark:text-amber-300 text-xs font-semibold">
                        {block}
                      </div>
                    );
                  } else if (block.startsWith('* ') || block.startsWith('- ')) {
                    return (
                      <ul key={i} className="space-y-1.5 pl-4 list-disc text-slate-700 dark:text-slate-300">
                        {block.split('\n').map((line, j) => {
                          const clean = line.replace(/^[\*\-]\s+/, '');
                          // Parse simple bold markdown
                          const parts = clean.split(/(\*\*.*?\*\*)/g);
                          return (
                            <li key={j}>
                              {parts.map((p, k) => {
                                if (p.startsWith('**') && p.endsWith('**')) {
                                  return <strong key={k} className="text-slate-900 dark:text-white">{p.slice(2, -2)}</strong>;
                                }
                                return p;
                              })}
                            </li>
                          );
                        })}
                      </ul>
                    );
                  } else if (block.trim() === '---') {
                    return <hr key={i} className="border-slate-200 dark:border-slate-800 my-2" />;
                  } else {
                    return <p key={i} className="text-slate-700 dark:text-slate-300">{block}</p>;
                  }
                })}
              </div>
            )}

            {/* Commit / Sign-off Button Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-500" />
                <span>Committing saves the official text to the Flight Safety Dossier & PDF Export.</span>
              </div>
              <button
                type="submit"
                disabled={isPending || !content || content.length < 30}
                className="w-full sm:w-auto px-5 py-2 bg-slate-900 hover:bg-black dark:bg-blue-600 dark:hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-400 dark:text-white" />
                {activeBriefing?.isApproved ? 'Update & Re-commit Briefing' : 'Commit & Sign Official Briefing'}
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Empty State */
        <div className="p-8 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-3 text-center">
          <div className="p-3 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-full">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              No Safety Briefing Generated
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
              Click the button below to analyze flight #{flightNumber}&apos;s live weather, crew fatigue index, and active incidents to draft an incident mitigation briefing.
            </p>
          </div>
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isPending}
            className="mt-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
          >
            {isPending ? <RotateCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate AI Safety Briefing
          </button>
        </div>
      )}
    </section>
  );
}
