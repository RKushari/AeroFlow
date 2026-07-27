'use client';

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { registerUser } from "@/lib/actions/auth";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    
    startTransition(async () => {
      try {
        await registerUser(formData);
        router.push("/api/auth/signin?registered=true");
      } catch (err: any) {
        setError(err.message || "Registration failed.");
      }
    });
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 glass-card rounded-2xl border border-white/10">
      <h1 className="text-3xl font-bold text-white mb-2">Create Account</h1>
      <p className="text-white/60 text-sm mb-6">Register for access to AeroFlow.</p>
      
      {error && (
        <div className="p-3 mb-4 rounded border bg-red-500/15 text-red-300 border-red-500/30 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-sm font-semibold text-white/80 block mb-1">Full Name</label>
          <input 
            type="text" 
            name="name" 
            required 
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50" 
          />
        </div>
        
        <div>
          <label className="text-sm font-semibold text-white/80 block mb-1">Email</label>
          <input 
            type="email" 
            name="email" 
            required 
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50" 
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-white/80 block mb-1">Phone Number</label>
          <input 
            type="tel" 
            name="phone" 
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50" 
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-white/80 block mb-1">Password</label>
          <input 
            type="password" 
            name="password" 
            required 
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 focus:outline-none focus:ring-1 focus:ring-blue-500/50" 
          />
        </div>

        <div>
          <label className="text-sm font-semibold text-white/80 block mb-1">Role</label>
          <select 
            name="role" 
            required 
            disabled={isPending}
            className="w-full px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50 [&>option]:bg-slate-900"
          >
            <option className="bg-slate-900 text-white" value="FLIGHT_DISPATCHER">Flight Dispatcher</option>
            <option className="bg-slate-900 text-white" value="GROUND_CREW_LEAD">Ground Crew Lead</option>
            {/* OPERATIONS_DIRECTOR omitted per requirements */}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isPending}
          className="w-full py-3 mt-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors flex justify-center gap-2"
        >
          {isPending ? <><Loader2 className="animate-spin h-5 w-5"/> Registering...</> : 'Register'}
        </button>
      </form>
      
      <p className="mt-6 text-center text-sm text-white/60">
        Already have an account? <Link href="/api/auth/signin" className="text-blue-400 hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
