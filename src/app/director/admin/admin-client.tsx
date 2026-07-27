'use client';

import React, { useState, useTransition } from "react";
import { Role } from "@prisma/client";
import { updateUserRole, updateSystemConfig } from "@/lib/actions/admin";
import { Search, ShieldAlert, Wrench, PlaneTakeoff, Shield, Save, Loader2, ArrowRight } from "lucide-react";

interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
}

interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceId: string;
  timestamp: Date;
  oldState: any;
  newState: any;
}

interface AdminClientProps {
  initialUsers: User[];
  initialThreshold: number;
  recentLogs: AuditLog[];
  callerId: string;
}

export default function AdminClient({
  initialUsers,
  initialThreshold,
  recentLogs,
  callerId,
}: AdminClientProps) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [searchTerm, setSearchTerm] = useState("");
  const [threshold, setThreshold] = useState(initialThreshold.toString());
  const [logs, setLogs] = useState<AuditLog[]>(recentLogs);
  
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  
  // Self-demotion confirmation modal state
  const [demotionConfirm, setDemotionConfirm] = useState<{
    show: boolean;
    userId: string;
    newRole: Role;
  } | null>(null);

  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRoleChange = async (userId: string, newRole: Role, confirm: boolean = false) => {
    // If attempting to demote self
    if (userId === callerId && newRole !== Role.OPERATIONS_DIRECTOR) {
      if (!confirm) {
        setDemotionConfirm({ show: true, userId, newRole });
        return;
      }
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const res = await updateUserRole(userId, newRole, confirm);
        if (!res.success) {
          if (res.error === "self_demotion_confirmation_required") {
            setDemotionConfirm({ show: true, userId, newRole });
          } else {
            setMessage({ text: res.message || "Failed to update role", type: "error" });
          }
        } else {
          setMessage({ text: "User role updated successfully", type: "success" });
          setUsers((prev) =>
            prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
          );
          setDemotionConfirm(null);
        }
      } catch (err: any) {
        setMessage({ text: err.message || "An unexpected error occurred", type: "error" });
      }
    });
  };

  const handleThresholdSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(threshold);
    if (isNaN(parsed) || parsed < 0 || parsed > 1) {
      setMessage({ text: "Risk threshold must be a number between 0.0 and 1.0", type: "error" });
      return;
    }

    setMessage(null);
    startTransition(async () => {
      try {
        const res = await updateSystemConfig("RISK_THRESHOLD", threshold);
        if (res.success) {
          setMessage({ text: `Risk threshold updated to ${parsed.toFixed(2)}`, type: "success" });
        } else {
          setMessage({ text: "Failed to update threshold", type: "error" });
        }
      } catch (err: any) {
        setMessage({ text: err.message || "An unexpected error occurred", type: "error" });
      }
    });
  };

  const getRoleBadge = (role: Role) => {
    switch (role) {
      case Role.OPERATIONS_DIRECTOR:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 text-purple-300 text-xs font-semibold border border-purple-500/30">
            <Shield size={12} /> Director
          </span>
        );
      case Role.FLIGHT_DISPATCHER:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 text-xs font-semibold border border-blue-500/30">
            <PlaneTakeoff size={12} /> Dispatcher
          </span>
        );
      case Role.GROUND_CREW_LEAD:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 text-xs font-semibold border border-amber-500/30">
            <Wrench size={12} /> Ground Crew
          </span>
        );
    }
  };

  return (
    <div className="space-y-8">
      {/* Notifications/Feedback */}
      {message && (
        <div
          className={`p-4 rounded-xl border text-sm font-medium transition-all ${
            message.type === "success"
              ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
              : "bg-red-500/15 text-red-300 border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Confirmation Modal */}
      {demotionConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card max-w-md w-full rounded-2xl border border-white/10 p-6 space-y-6 shadow-2xl bg-slate-900/90 text-white">
            <div className="flex items-center gap-3 text-amber-400">
              <ShieldAlert size={28} />
              <h3 className="text-xl font-bold">Confirm Self-Demotion</h3>
            </div>
            <p className="text-white/70 text-sm leading-relaxed">
              You are about to change your own role. Demoting yourself will remove your access to this Admin Panel immediately.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDemotionConfirm(null)}
                className="px-4 py-2 rounded-lg text-sm bg-white/10 hover:bg-white/20 transition-colors font-semibold"
                disabled={isPending}
              >
                Cancel
              </button>
              <button
                onClick={() =>
                  handleRoleChange(demotionConfirm.userId, demotionConfirm.newRole, true)
                }
                className="px-4 py-2 rounded-lg text-sm bg-red-600 hover:bg-red-500 transition-colors font-semibold flex items-center gap-2"
                disabled={isPending}
              >
                {isPending && <Loader2 className="animate-spin h-4 w-4" />}
                Yes, Demote Me
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* User Management Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xl font-bold text-white">User Accounts</h2>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/80">
                <thead className="bg-white/5 text-white font-semibold border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4">Name & Email</th>
                    <th className="px-6 py-4">Current Role</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-white">{user.name}</div>
                        <div className="text-xs text-white/50">{user.email}</div>
                      </td>
                      <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                      <td className="px-6 py-4 text-right">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as Role)}
                          className="bg-slate-900 border border-white/10 text-white rounded px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                          disabled={isPending}
                        >
                          <option className="bg-slate-900 text-white" value={Role.GROUND_CREW_LEAD}>Ground Crew Lead</option>
                          <option className="bg-slate-900 text-white" value={Role.FLIGHT_DISPATCHER}>Flight Dispatcher</option>
                          <option className="bg-slate-900 text-white" value={Role.OPERATIONS_DIRECTOR}>Operations Director</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-white/40">
                        No users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Global Configuration Section */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white">System Configurations</h2>

          <div className="glass-card rounded-xl border border-white/10 p-6 space-y-6">
            <form onSubmit={handleThresholdSave} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-white/80 block">
                  Safety Risk Score Threshold
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    value={threshold}
                    onChange={(e) => setThreshold(e.target.value)}
                    className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    placeholder="e.g. 0.75"
                    required
                    disabled={isPending}
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg text-sm transition-colors flex items-center gap-2"
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
                    Save
                  </button>
                </div>
                <p className="text-xs text-white/40 leading-normal pt-1">
                  Alert banners and flight locks trigger when a flight's risk coefficient meets or exceeds this value. Currently: {(parseFloat(threshold) * 10).toFixed(1)}/10.
                </p>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Lightweight Platform Activity / Logins & Role Changes */}
      <div className="space-y-6 pt-4">
        <h2 className="text-xl font-bold text-white">Recent Admin & System Activity</h2>
        
        <div className="bg-slate-900/40 border border-white/10 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white/80">
              <thead className="bg-white/5 text-white font-semibold border-b border-white/10">
                <tr>
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Action</th>
                  <th className="px-6 py-4">Target Resource</th>
                  <th className="px-6 py-4">Activity Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {logs.map((log) => {
                  let desc = "";
                  if (log.action === "SIGN_IN") {
                    desc = `User successfully authenticated onto platform.`;
                  } else if (log.action === "UPDATE_USER_ROLE") {
                    desc = `Changed role from ${log.oldState?.role ?? "N/A"} to ${log.newState?.role ?? "N/A"}.`;
                  } else if (log.action === "UPDATE_SYSTEM_CONFIG") {
                    desc = `Updated threshold value from ${log.oldState?.value ?? "default"} to ${log.newState?.value ?? "N/A"}.`;
                  }

                  return (
                    <tr key={log.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4 text-xs whitespace-nowrap text-white/50">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          log.action === "SIGN_IN" 
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" 
                            : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-white/60">
                        {log.resourceId}
                      </td>
                      <td className="px-6 py-4 text-xs text-white/70">
                        {desc}
                      </td>
                    </tr>
                  );
                })}
                {logs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-white/40">
                      No admin or login activity recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
