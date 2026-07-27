'use client';

import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

export function LedgerTable({ auditLogs }: { auditLogs: any[] }) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const filtered = auditLogs.filter(log => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      log.action.toLowerCase().includes(q) ||
      log.resourceId.toLowerCase().includes(q) ||
      log.userId.toLowerCase().includes(q)
    );
  });

  return (
    <>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Search by Action, Resource ID, or User ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-4 py-2 border rounded-lg text-sm w-80"
        />
        {search && (
          <button onClick={() => setSearch('')} className="px-4 py-2 bg-slate-200 text-slate-700 rounded-lg text-sm font-medium">
            Clear
          </button>
        )}
        <span className="self-center text-xs text-slate-400">{filtered.length} results</span>
      </div>
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold border-b dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">User ID</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Resource ID</th>
                <th className="px-6 py-4">Deltas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filtered.map((log) => (
                <React.Fragment key={log.id}>
                  <tr className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{log.userId}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded text-xs font-bold uppercase">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs">{log.resourceId}</td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="text-blue-600 hover:underline font-medium text-xs"
                      >
                        {expandedId === log.id ? 'Hide' : 'View JSON Diffs'}
                      </button>
                    </td>
                  </tr>
                  <AnimatePresence>
                  {expandedId === log.id && (
                    <tr>
                      <td colSpan={5} className="p-0 bg-slate-50 dark:bg-slate-900">
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="grid grid-cols-2 gap-4 p-6">
                            <div>
                              <span className="text-xs font-bold text-red-600 dark:text-red-400 uppercase block mb-1">Old State</span>
                              <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded overflow-x-auto max-h-48 border border-red-100 dark:border-red-900/50">
                                {JSON.stringify(log.oldState, null, 2) || 'null'}
                              </pre>
                            </div>
                            <div>
                              <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase block mb-1">New State</span>
                              <pre className="text-xs bg-green-50 dark:bg-green-900/20 p-3 rounded overflow-x-auto max-h-48 border border-green-100 dark:border-green-900/50">
                                {JSON.stringify(log.newState, null, 2) || 'null'}
                              </pre>
                            </div>
                          </div>
                        </motion.div>
                      </td>
                    </tr>
                  )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-500">
                    No compliance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
