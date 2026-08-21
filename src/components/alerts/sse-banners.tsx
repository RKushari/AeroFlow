'use client';

import React, { useEffect, useState } from "react";
import { AlertTriangle, Info, X, ShieldAlert, BellRing } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

interface BannerAlert {
  id: string;
  type: string;
  message: string;
  severity: "critical" | "info" | "warning";
  timestamp: string;
}

export function SSEBanners() {
  const [alerts, setAlerts] = useState<BannerAlert[]>([]);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: NodeJS.Timeout;

    function connect() {
      setStatus("connecting");
      // Connect to SSE stream
      eventSource = new EventSource("/api/sse");

      eventSource.onopen = () => {
        setStatus("connected");
      };

      eventSource.onerror = () => {
        setStatus("disconnected");
        eventSource?.close();
        // Retry connection in 5 seconds
        reconnectTimeout = setTimeout(connect, 5000);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === "PING" || data.type === "CONNECTED") {
            return;
          }

          let newAlert: BannerAlert | null = null;

          if (data.type === "RISK_THRESHOLD_FAILURE") {
            newAlert = {
              id: `${data.flightId}-${Date.now()}`,
              type: data.type,
              message: `CRITICAL SAFETY ALERT: Flight ${data.flightId} has failed risk threshold constraints (Score: ${(data.score * 10).toFixed(1)}/10, Max Allowed: ${(data.threshold * 10).toFixed(1)}/10).`,
              severity: "critical",
              timestamp: data.timestamp,
            };
          } else if (data.type === "INCIDENT_REPORTED") {
            const flightInfo = data.flightId ? ` (Flight ${data.flightId})` : '';
            const typeInfo = data.incidentType ? ` [${data.incidentType.replace(/_/g, " ")}]` : '';
            const desc = data.description ? `: ${data.description}` : '';
            newAlert = {
              id: `inc-${data.incidentId || Date.now()}`,
              type: "HIGH PRIORITY GROUND INCIDENT",
              message: `HAZARD ALERT${typeInfo}${flightInfo}${desc}`,
              severity: data.severity === "CRITICAL" || data.severity === "HIGH" ? "critical" : "warning",
              timestamp: data.timestamp,
            };
          } else if (data.type === "INCIDENT_RESOLVED") {
            const flightInfo = data.flightId ? ` (Flight ${data.flightId})` : '';
            newAlert = {
              id: `inc-res-${data.incidentId || Date.now()}`,
              type: "INCIDENT RESOLVED",
              message: `Ground Incident Resolved${flightInfo} by ${data.resolverName || 'Supervisor'}. Notes: ${data.resolutionNotes}`,
              severity: "info",
              timestamp: data.timestamp,
            };
          } else if (data.type === "DISPATCH_APPROVED") {
            newAlert = {
              id: `${data.flightId}-${Date.now()}`,
              type: data.type,
              message: `FLIGHT CLEARED: Flight ${data.flightId} has been cleared for boarding.`,
              severity: "info",
              timestamp: data.timestamp,
            };
          } else if (data.type === "BROADCAST") {
            newAlert = {
              id: `broadcast-${Date.now()}`,
              type: data.type,
              message: data.message,
              severity: data.priority === "CRITICAL" || data.priority === "HIGH" ? "critical" : data.priority === "MEDIUM" ? "warning" : "info",
              timestamp: data.timestamp,
            };
          }

          if (newAlert) {
            setAlerts((prev) => [newAlert!, ...prev].slice(0, 5)); // Keep last 5 alerts
          }
        } catch (err) {
          console.error("Failed to parse SSE payload:", err);
        }
      };
    }

    connect();

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  const removeAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="fixed top-20 right-6 z-50 flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {/* Connection Indicator in dev mode/small bar */}
      {status !== "connected" && (
        <div className="self-end px-3 py-1 text-xs rounded-full bg-slate-800 border border-white/10 text-white/50 flex items-center gap-2">
          <span className={`h-1.5 w-1.5 rounded-full ${status === "connecting" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
          {status === "connecting" ? "SSE Connecting..." : "SSE Disconnected (retrying)"}
        </div>
      )}

      <AnimatePresence>
        {alerts.map((alert) => (
          <motion.div
            key={alert.id}
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={`p-4 rounded-xl border shadow-lg flex gap-3 pointer-events-auto backdrop-blur-md relative overflow-hidden ${
              alert.severity === "critical"
                ? "bg-red-950/80 border-red-500/35 text-red-100"
                : alert.severity === "warning"
                ? "bg-amber-950/80 border-amber-500/35 text-amber-100"
                : "bg-blue-950/80 border-blue-500/35 text-blue-100"
            }`}
          >
            {/* Severity Icon */}
            <div className="shrink-0 pt-0.5">
              {alert.severity === "critical" ? (
                <ShieldAlert className="h-5 w-5 text-red-400" />
              ) : alert.severity === "warning" ? (
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              ) : (
                <BellRing className="h-5 w-5 text-blue-400" />
              )}
            </div>

            {/* Message Content */}
            <div className="flex-1 space-y-1 pr-6">
              <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                {alert.type.replace(/_/g, " ")}
              </p>
              <p className="text-sm font-medium leading-relaxed">{alert.message}</p>
              <p className="text-[10px] opacity-40">{new Date(alert.timestamp).toLocaleTimeString()}</p>
            </div>

            {/* Dismiss Button */}
            <button
              onClick={() => removeAlert(alert.id)}
              className="absolute top-3 right-3 text-white/40 hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
