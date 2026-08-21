'use client';

import React, { useState, useTransition } from 'react';
import { 
  Radio, 
  Send, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  Edit3, 
  Trash2, 
  PowerOff, 
  Check, 
  X, 
  Layers, 
  Sparkles,
  Search,
  Filter,
  CheckCircle2
} from 'lucide-react';
import { MessagePriority } from '@prisma/client';
import { publishBroadcast, updateBroadcast, deactivateBroadcast, deleteBroadcast } from '@/lib/actions/broadcasts';
import { motion, AnimatePresence } from 'framer-motion';

export interface BroadcastItem {
  id: string;
  authorId: string;
  content: string;
  priority: MessagePriority;
  expiresAt: Date | string | null;
  createdAt: Date | string;
}

interface BroadcastBoardProps {
  initialMessages: BroadcastItem[];
}

const PRESETS = [
  {
    label: "Runway Closure",
    content: "URGENT: Runway 04L/22R closed for emergency surface inspection and snow clearing. Expect vectoring.",
    priority: MessagePriority.CRITICAL,
    expiresIn: 3
  },
  {
    label: "De-icing Congestion",
    content: "De-icing pads 1 & 2 operating at peak capacity. Pushback ground delays averaging +20-25 minutes.",
    priority: MessagePriority.HIGH,
    expiresIn: 4
  },
  {
    label: "Corridor Weather Reroute",
    content: "Severe convective cell clusters over waypoint DELTA. Request FL380 step-climb or 30NM lateral avoidance.",
    priority: MessagePriority.HIGH,
    expiresIn: 6
  },
  {
    label: "Ground Equipment Alert",
    content: "High-loader tug unit HL-04 taken offline for hydraulics servicing at Terminal 3. Dispatch alternate equipment.",
    priority: MessagePriority.MEDIUM,
    expiresIn: 8
  }
];

export function BroadcastBoard({ initialMessages }: BroadcastBoardProps) {
  const [isPending, startTransition] = useTransition();
  const [messages, setMessages] = useState<BroadcastItem[]>(initialMessages);
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<MessagePriority>(MessagePriority.HIGH);
  const [expiresInHours, setExpiresInHours] = useState<string>('4');
  const [filterTab, setFilterTab] = useState<'ALL' | 'ACTIVE' | 'CRITICAL' | 'EXPIRED'>('ACTIVE');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [editPriority, setEditPriority] = useState<MessagePriority>(MessagePriority.HIGH);
  const [editExpiresInHours, setEditExpiresInHours] = useState<string>('4');

  const isExpired = (expiresAt: Date | string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt).getTime() <= Date.now();
  };

  const handlePublish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    startTransition(async () => {
      let expiresAt: Date | undefined = undefined;
      const h = parseFloat(expiresInHours);
      if (!isNaN(h) && h > 0) {
        expiresAt = new Date(Date.now() + h * 3600 * 1000);
      }
      const newMsg = await publishBroadcast(content, priority, expiresAt);
      setMessages(prev => [newMsg, ...prev]);
      setContent('');
    });
  };

  const handleApplyPreset = (preset: typeof PRESETS[0]) => {
    setContent(preset.content);
    setPriority(preset.priority);
    setExpiresInHours(preset.expiresIn.toString());
  };

  const startEdit = (msg: BroadcastItem) => {
    setEditingId(msg.id);
    setEditContent(msg.content);
    setEditPriority(msg.priority);
    setEditExpiresInHours('4');
  };

  const handleSaveEdit = (id: string) => {
    startTransition(async () => {
      let expiresAt: Date | undefined = undefined;
      const h = parseFloat(editExpiresInHours);
      if (!isNaN(h) && h > 0) {
        expiresAt = new Date(Date.now() + h * 3600 * 1000);
      }
      const updated = await updateBroadcast(id, editContent, editPriority, expiresAt);
      setMessages(prev => prev.map(m => m.id === id ? updated : m));
      setEditingId(null);
    });
  };

  const handleDeactivate = (id: string) => {
    startTransition(async () => {
      const deactivated = await deactivateBroadcast(id);
      setMessages(prev => prev.map(m => m.id === id ? deactivated : m));
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to permanently delete this broadcast notice?')) return;
    startTransition(async () => {
      await deleteBroadcast(id);
      setMessages(prev => prev.filter(m => m.id !== id));
    });
  };

  // Filtered list
  const filteredMessages = messages.filter(m => {
    const expired = isExpired(m.expiresAt);
    if (filterTab === 'ACTIVE' && expired) return false;
    if (filterTab === 'EXPIRED' && !expired) return false;
    if (filterTab === 'CRITICAL' && m.priority !== MessagePriority.CRITICAL) return false;

    if (searchQuery.trim()) {
      return m.content.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const activeCount = messages.filter(m => !isExpired(m.expiresAt)).length;
  const criticalCount = messages.filter(m => !isExpired(m.expiresAt) && m.priority === MessagePriority.CRITICAL).length;

  return (
    <div className="flex flex-col gap-8 max-w-5xl mx-auto">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-red-600/10 text-red-600 dark:text-red-400 rounded-xl">
              <Radio className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                Global Message Broadcast Board
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Direct system-wide priority notification engine for Flight Dispatchers and Ground Crew Leads.
              </p>
            </div>
          </div>
        </div>

        {/* Live Counters */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 rounded-xl flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
              {activeCount} Active Notice{activeCount === 1 ? '' : 's'}
            </span>
          </div>

          {criticalCount > 0 && (
            <div className="px-3 py-1.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600 dark:text-red-400" />
              <span className="text-xs font-bold text-red-800 dark:text-red-300">
                {criticalCount} Critical
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Compose & Publish Card */}
      <section className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Send className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Compose Urgent Operational Notice
            </h2>
          </div>
          <span className="text-xs text-slate-400">Broadcasts live via Server-Sent Events (SSE)</span>
        </div>

        {/* Quick Presets */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Quick Operational Presets
          </div>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg transition-colors flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 cursor-pointer"
              >
                <span>{preset.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handlePublish} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Notice Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
              rows={3}
              placeholder="e.g., Runway 04L Closed for Emergency Snow Clearing. Ground holding in effect for all eastbound departures..."
              className="w-full p-3.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-900 dark:text-white leading-relaxed"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Enter clear, authoritative operational directives.</span>
              <span>{content.length} characters</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { value: MessagePriority.LOW, label: 'Low', color: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300' },
                  { value: MessagePriority.MEDIUM, label: 'Medium', color: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950 dark:text-blue-300' },
                  { value: MessagePriority.HIGH, label: 'High', color: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950 dark:text-amber-300' },
                  { value: MessagePriority.CRITICAL, label: 'Critical', color: 'bg-red-100 text-red-800 border-red-300 dark:bg-red-950 dark:text-red-300' }
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setPriority(item.value)}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                      priority === item.value
                        ? `${item.color} ring-2 ring-blue-500 shadow-xs`
                        : 'border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                Notice Expiration Window
              </label>
              <div className="flex items-center gap-2">
                <select
                  value={expiresInHours}
                  onChange={(e) => setExpiresInHours(e.target.value)}
                  className="flex-1 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white outline-none"
                >
                  <option value="1">1 Hour</option>
                  <option value="2">2 Hours</option>
                  <option value="4">4 Hours (Recommended)</option>
                  <option value="8">8 Hours (Full Shift)</option>
                  <option value="24">24 Hours</option>
                  <option value="0">Permanent (Manual Deactivation)</option>
                </select>
                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-400">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-2">
            <button
              type="submit"
              disabled={isPending || !content.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              <Radio className="w-4 h-4" />
              {isPending ? 'Broadcasting System-Wide...' : 'Publish Global Broadcast'}
            </button>
          </div>
        </form>
      </section>

      {/* Broadcast History & Manage Notices */}
      <section className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white">
              Broadcast History & Active Notice Manager
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Edit active advisories, deactivate expired warnings, and monitor delivery log.
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['ACTIVE', 'CRITICAL', 'ALL', 'EXPIRED'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterTab(tab)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterTab === tab
                    ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                {tab === 'ACTIVE' ? `Active (${activeCount})` : tab === 'CRITICAL' ? `Critical (${criticalCount})` : tab}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notice content by keywords..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          />
        </div>

        {/* Notices Feed */}
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filteredMessages.map((msg) => {
              const expired = isExpired(msg.expiresAt);
              const isEditing = editingId === msg.id;

              return (
                <motion.div
                  key={msg.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className={`p-4.5 rounded-2xl border transition-all ${
                    expired
                      ? 'bg-slate-50/60 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800/60 opacity-70'
                      : msg.priority === 'CRITICAL'
                        ? 'bg-red-50/50 dark:bg-red-950/20 border-red-200 dark:border-red-900/60 shadow-xs'
                        : msg.priority === 'HIGH'
                          ? 'bg-amber-50/40 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  {isEditing ? (
                    /* Inline Editor */
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1.5">
                          <Edit3 className="w-3.5 h-3.5" />
                          Editing Active Notice
                        </span>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="text-slate-400 hover:text-slate-600 p-1"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        rows={2}
                        className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white font-sans"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <select
                            value={editPriority}
                            onChange={(e) => setEditPriority(e.target.value as MessagePriority)}
                            className="p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border rounded-lg"
                          >
                            <option value={MessagePriority.LOW}>Low</option>
                            <option value={MessagePriority.MEDIUM}>Medium</option>
                            <option value={MessagePriority.HIGH}>High</option>
                            <option value={MessagePriority.CRITICAL}>Critical</option>
                          </select>

                          <select
                            value={editExpiresInHours}
                            onChange={(e) => setEditExpiresInHours(e.target.value)}
                            className="p-1.5 text-xs bg-slate-50 dark:bg-slate-950 border rounded-lg"
                          >
                            <option value="1">+1h Extension</option>
                            <option value="4">+4h Extension</option>
                            <option value="8">+8h Extension</option>
                            <option value="0">Permanent</option>
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="px-3 py-1 text-xs border rounded-lg font-medium"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(msg.id)}
                            disabled={isPending}
                            className="px-3.5 py-1 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Save & Broadcast
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Display View */
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            msg.priority === 'CRITICAL' ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border border-red-200 dark:border-red-800' :
                            msg.priority === 'HIGH' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border border-amber-200 dark:border-amber-800' :
                            msg.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 border border-blue-200 dark:border-blue-800' :
                            'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'
                          }`}>
                            {msg.priority} Priority
                          </span>

                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                            expired 
                              ? 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400' 
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {expired ? 'Expired / Inactive' : 'Active On Air'}
                          </span>
                        </div>

                        {/* Delivery Timestamp */}
                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <Clock className="w-3 h-3" />
                          <span suppressHydrationWarning>Published: {new Date(msg.createdAt).toLocaleString()}</span>
                          {msg.expiresAt && !expired && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              · Expires in {Math.max(1, Math.round((new Date(msg.expiresAt).getTime() - Date.now()) / (3600 * 1000)))}h
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Content text */}
                      <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                        {msg.content}
                      </p>

                      {/* Action Bar */}
                      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[11px]">
                        <span className="text-slate-400">
                          Author: <strong className="text-slate-600 dark:text-slate-300">{msg.authorId.slice(0, 8)}...</strong>
                        </span>

                        <div className="flex items-center gap-2">
                          {!expired && (
                            <>
                              <button
                                type="button"
                                onClick={() => startEdit(msg)}
                                className="px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <Edit3 className="w-3 h-3" />
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeactivate(msg.id)}
                                className="px-2 py-1 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                              >
                                <PowerOff className="w-3 h-3" />
                                Deactivate
                              </button>
                            </>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDelete(msg.id)}
                            className="px-2 py-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {filteredMessages.length === 0 && (
            <div className="p-8 text-center bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
              No broadcast notices found matching your criteria.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
