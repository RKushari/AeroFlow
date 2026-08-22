'use client';

import React, { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createFlightPlan, lookupAirport, type AirportLookupResult } from "@/lib/actions/flight-creation";
import { ArrowLeft, Loader2, Plane, Calendar, ShieldCheck, HelpCircle, MapPin, AlertTriangle } from "lucide-react";
import Link from "next/link";

export default function NewFlightPlan() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    flightNumber: "",
    originIata: "",
    destinationIata: "",
    aircraftReg: "",
    departureTime: "",
  });

  const [originInfo, setOriginInfo] = useState<AirportLookupResult | null>(null);
  const [originUnknown, setOriginUnknown] = useState(false);
  const [destinationInfo, setDestinationInfo] = useState<AirportLookupResult | null>(null);
  const [destinationUnknown, setDestinationUnknown] = useState(false);
  const [lookingUp, setLookingUp] = useState<"origin" | "destination" | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const upper = value.toUpperCase();
    setForm({ ...form, [name]: upper });

    if (name === "originIata") {
      setOriginInfo(null);
      setOriginUnknown(false);
      if (upper.length === 3) {
        setLookingUp("origin");
        lookupAirport(upper).then((result) => {
          setOriginInfo(result);
          setOriginUnknown(!result);
          setLookingUp(null);
        });
      }
    }

    if (name === "destinationIata") {
      setDestinationInfo(null);
      setDestinationUnknown(false);
      if (upper.length === 3) {
        setLookingUp("destination");
        lookupAirport(upper).then((result) => {
          setDestinationInfo(result);
          setDestinationUnknown(!result);
          setLookingUp(null);
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (form.originIata.length !== 3 || form.destinationIata.length !== 3) {
      setError("Airport codes must be exactly 3-character IATA codes (e.g. JFK).");
      return;
    }

    startTransition(async () => {
      try {
        const res = await createFlightPlan(form);
        if (res.success) {
          router.push(`/dispatcher/flight/${res.flightId}`);
          router.refresh();
        }
      } catch (err: any) {
        setError(err.message || "An unexpected error occurred during flight registration.");
      }
    });
  };

  return (
    <div className="max-w-xl mx-auto space-y-6 py-4">
      {/* Back Button */}
      <Link
        href="/dispatcher/dashboard"
        className="inline-flex items-center gap-2 text-sm text-white/50 hover:text-white transition-colors"
      >
        <ArrowLeft size={16} /> Back to Dashboard
      </Link>

      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Declare New Active Flight</h1>
        <p className="text-white/60 text-sm">
          Initialize a new active flight path. Relational airfields and checklist gates will be generated automatically.
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 rounded-xl border bg-red-500/15 text-red-300 border-red-500/30 text-sm font-medium">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="glass-card rounded-2xl border border-white/10 p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Flight Number */}
          <div className="space-y-2 col-span-1 md:col-span-2">
            <label className="text-sm font-semibold text-white/80 block">Flight Number</label>
            <div className="relative">
              <Plane className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
              <input
                type="text"
                name="flightNumber"
                required
                value={form.flightNumber}
                onChange={handleChange}
                placeholder="e.g. AA123"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                disabled={isPending}
              />
            </div>
          </div>

          {/* Origin IATA */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">Origin Airport (IATA)</label>
            <input
              type="text"
              name="originIata"
              required
              maxLength={3}
              value={form.originIata}
              onChange={handleChange}
              placeholder="e.g. JFK"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              disabled={isPending}
            />
            {lookingUp === "origin" && (
              <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Looking up...
              </p>
            )}
            {originInfo && (
              <div className="flex items-start gap-2 mt-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-300">{originInfo.name}</span>
                  <span className="text-emerald-400/70"> — {originInfo.city}, {originInfo.country}</span>
                  <span className="text-white/40 ml-1">(ICAO: {originInfo.icao})</span>
                </div>
              </div>
            )}
            {originUnknown && form.originIata.length === 3 && !lookingUp && (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">Unknown IATA code — not found in global airport database</span>
              </div>
            )}
          </div>

          {/* Destination IATA */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">Destination Airport (IATA)</label>
            <input
              type="text"
              name="destinationIata"
              required
              maxLength={3}
              value={form.destinationIata}
              onChange={handleChange}
              placeholder="e.g. LAX"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              disabled={isPending}
            />
            {lookingUp === "destination" && (
              <p className="text-xs text-white/40 flex items-center gap-1 mt-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Looking up...
              </p>
            )}
            {destinationInfo && (
              <div className="flex items-start gap-2 mt-1 p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <span className="font-semibold text-emerald-300">{destinationInfo.name}</span>
                  <span className="text-emerald-400/70"> — {destinationInfo.city}, {destinationInfo.country}</span>
                  <span className="text-white/40 ml-1">(ICAO: {destinationInfo.icao})</span>
                </div>
              </div>
            )}
            {destinationUnknown && form.destinationIata.length === 3 && !lookingUp && (
              <div className="flex items-center gap-2 mt-1 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-xs text-amber-300">Unknown IATA code — not found in global airport database</span>
              </div>
            )}
          </div>

          {/* Aircraft Registration */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">Aircraft Registration</label>
            <input
              type="text"
              name="aircraftReg"
              required
              value={form.aircraftReg}
              onChange={handleChange}
              placeholder="e.g. N789AA"
              className="w-full px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/40 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              disabled={isPending}
            />
          </div>

          {/* Scheduled Departure Time */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-white/80 block">Scheduled Departure</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40 h-4 w-4" />
              <input
                type="datetime-local"
                name="departureTime"
                required
                value={form.departureTime}
                onChange={handleChange}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                disabled={isPending}
              />
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="flex gap-3 p-4 rounded-xl bg-white/5 border border-white/5 text-xs text-white/60">
          <ShieldCheck className="text-blue-400 h-5 w-5 shrink-0" />
          <p className="leading-relaxed">
            Relational airport data (IATA) and tail number registration will be validated against active registers (Aviation Edge API) during creation.
          </p>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
          disabled={isPending}
        >
          {isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-white" />
              Verifying & Creating...
            </>
          ) : (
            "Register Flight Plan"
          )}
        </button>
      </form>
    </div>
  );
}
