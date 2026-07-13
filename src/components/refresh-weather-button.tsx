'use client';

import React, { useState, useTransition } from "react";
import { refreshFlightWeather } from "@/lib/actions/weather";
import { CloudRain, Loader2 } from "lucide-react";

interface RefreshWeatherButtonProps {
  flightId: string;
}

export function RefreshWeatherButton({ flightId }: RefreshWeatherButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleRefresh = () => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      try {
        const res = await refreshFlightWeather(flightId);
        if (res.success) {
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        }
      } catch (err: any) {
        setError(err.message || "Failed to update weather.");
        setTimeout(() => setError(null), 5000);
      }
    });
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        onClick={handleRefresh}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-55"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin text-white" />
        ) : (
          <CloudRain className="h-4 w-4 text-sky-400" />
        )}
        {isPending ? "Refreshing..." : success ? "Refreshed!" : "Refresh Weather"}
      </button>
      {error && <span className="text-xs text-red-400 font-medium">{error}</span>}
    </div>
  );
}
