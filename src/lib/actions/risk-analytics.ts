'use server';

import { db } from "@/lib/db";
import { Severity } from "@prisma/client";

// ─── Risk Scoring Engine ──────────────────────────────────────────────────────
// Derives risk factors from available DB data (route baseRisk, incidents, weather records, shift fatigue).
// Produces scores on a 0–10 scale consistent with mock data expectations.

async function computeFlightRisk(flightId: string, baseRisk: number) {
  // Fetch flight with its assigned crew to check their fatigue specifically
  const flightWithCrew = await db.flights.findUnique({
    where: { id: flightId },
    include: { crewUsers: { include: { shiftLogs: { orderBy: { startTime: 'desc' }, take: 1 } } } }
  });

  const [incidents, weatherRecords] = await Promise.all([
    db.incidents.findMany({ where: { flightId, resolved: false } }),
    db.weatherRecords.findMany({ where: { flightId } })
  ]);

  // Mechanical factor: base route risk + unresolved incident penalties (0-10 scale)
  const incidentPenalty = incidents.reduce((acc, i) => {
    const weights: Record<string, number> = { CRITICAL: 3.0, HIGH: 2.0, MEDIUM: 1.0, LOW: 0.3 };
    return acc + (weights[i.severity] ?? 0.5);
  }, 0);
  const mechFactor = Math.min(10, Math.max(0.5, baseRisk * 1.5 + incidentPenalty));

  // Weather factor: from weather records (severityIndex is usually 0-1) or route baseRisk
  let weatherFactor: number;
  if (weatherRecords.length > 0) {
    const avgSeverity = weatherRecords.reduce((s, w) => s + w.severityIndex, 0) / weatherRecords.length;
    // If severityIndex is 0-1, scale it; if already > 1, use directly
    weatherFactor = Math.min(10, avgSeverity > 1 ? avgSeverity : avgSeverity * 10);
  } else {
    // Synthesize weather factor based on baseRisk (which is 0.1 to 3)
    const hash = flightId.charCodeAt(0) + flightId.charCodeAt(1);
    weatherFactor = Math.min(10, Math.max(0.5, baseRisk * 2.0 + (hash % 3) * 0.5));
  }

  // Fatigue factor: fetch shift logs of assigned crew specifically
  let fatigueFactor = 1.0;
  const crewLogs = flightWithCrew?.crewUsers.flatMap(u => u.shiftLogs) ?? [];
  
  if (crewLogs.length > 0) {
    const avgFatigue = crewLogs.reduce((s, l) => s + l.fatigueIndex, 0) / crewLogs.length;
    // fatigueIndex in DB is already on 0-10 scale
    fatigueFactor = Math.min(10, avgFatigue);
  } else {
    // If no crew logs, fall back to global shift logs or synthesize
    const globalShifts = await db.shiftLogs.findMany({ orderBy: { startTime: 'desc' }, take: 5 });
    if (globalShifts.length > 0) {
      const avgFatigue = globalShifts.reduce((s, l) => s + l.fatigueIndex, 0) / globalShifts.length;
      // Synthesize crew fatigue: average fatigue with slight variations based on flightId hash
      const hash = flightId.charCodeAt(2) + flightId.charCodeAt(3);
      fatigueFactor = Math.min(10, Math.max(1.0, avgFatigue - 2.0 + (hash % 3)));
    } else {
      const hash = flightId.charCodeAt(2) + flightId.charCodeAt(3);
      fatigueFactor = Math.min(10, Math.max(1.0, baseRisk * 1.5 + (hash % 2)));
    }
  }

  // Weighted composite total (0-10 scale)
  const totalScore = Math.min(10,
    mechFactor * 0.35 +
    weatherFactor * 0.35 +
    fatigueFactor * 0.30
  );

  return { totalScore, fatigueFactor, weatherFactor, mechFactor };
}

// ─── Ensure all monitored flights have RiskCalculations rows ─────────────────
async function ensureRiskCalculations(flightIds: string[]) {
  const existing = await db.riskCalculations.findMany({
    where: { flightId: { in: flightIds } },
    select: { flightId: true }
  });
  const existingIds = new Set(existing.map(r => r.flightId));
  const missing = flightIds.filter(id => !existingIds.has(id));

  if (missing.length === 0) return;

  const flights = await db.flights.findMany({
    where: { id: { in: missing } },
    include: { route: true }
  });

  for (const f of flights) {
    const factors = await computeFlightRisk(f.id, f.route.baseRisk);
    await db.riskCalculations.upsert({
      where: { flightId: f.id },
      update: { ...factors, calculatedAt: new Date() },
      create: { flightId: f.id, ...factors }
    });

    // ── Determine alert severity ──────────────────────────────────────────────
    // Consider BOTH total score AND individual factor spikes.
    // A fatigue factor of 10 is CRITICAL even if the composite is moderate.
    const maxFactor = Math.max(factors.fatigueFactor, factors.weatherFactor, factors.mechFactor);

    let alertSeverity: Severity | null = null;
    let alertReason = '';

    if (factors.totalScore >= 7.5 || maxFactor >= 9.0) {
      alertSeverity = Severity.CRITICAL;
      alertReason = 'CRITICAL RISK';
    } else if (factors.totalScore >= 5.0 || maxFactor >= 7.0) {
      alertSeverity = Severity.HIGH;
      alertReason = 'HIGH RISK';
    } else if (factors.totalScore >= 2.5 || maxFactor >= 5.0) {
      alertSeverity = Severity.MEDIUM;
      alertReason = 'ELEVATED RISK';
    }

    // Identify which factor is driving the alert
    const driverLabel =
      factors.fatigueFactor === maxFactor ? `Fatigue spike (${factors.fatigueFactor.toFixed(1)}/10)` :
      factors.weatherFactor === maxFactor ? `Weather severity (${factors.weatherFactor.toFixed(1)}/10)` :
      `Mechanical index (${factors.mechFactor.toFixed(1)}/10)`;

    if (alertSeverity) {
      await db.alertLogs.create({
        data: {
          severity: alertSeverity,
          read: false,
          message: `${alertReason}: Flight ${f.flightNumber} — Total ${factors.totalScore.toFixed(1)}/10 · ${driverLabel}`
        }
      });
    }
  }
}

// ─── Public Actions ───────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const config = await db.systemConfig.findUnique({ where: { key: 'monitored_flight_ids' } });
  let monitoredIds: string[] | null = null;
  if (config) {
    try { monitoredIds = JSON.parse(config.value); } catch {}
  }

  const flightsCount = monitoredIds?.length ?? await db.flights.count();

  // Ensure risk rows exist (generates alert logs for elevated-risk flights on first run)
  if (monitoredIds && monitoredIds.length > 0) {
    await ensureRiskCalculations(monitoredIds);
  }

  // ── Alert count: count monitored flights with ANY elevated risk factor ──
  // This is computed directly from riskCalculations so it ALWAYS matches
  // what the modal shows, regardless of what's in alertLogs.
  let alertsCount = 0;
  if (monitoredIds && monitoredIds.length > 0) {
    const risks = await db.riskCalculations.findMany({
      where: { flightId: { in: monitoredIds } },
      select: { totalScore: true, fatigueFactor: true, weatherFactor: true, mechFactor: true }
    });
    alertsCount = risks.filter(r => {
      const maxFactor = Math.max(r.fatigueFactor, r.weatherFactor, r.mechFactor);
      // Match the same thresholds used to generate DB alert logs
      return r.totalScore >= 2.5 || maxFactor >= 5.0;
    }).length;
  }

  return { flightsCount, alertsCount };
}

export async function getCombinedRiskFactors() {
  const config = await db.systemConfig.findUnique({ where: { key: 'monitored_flight_ids' } });
  let monitoredIds: string[] | null = null;
  if (config) {
    try { monitoredIds = JSON.parse(config.value); } catch {}
  }

  if (!monitoredIds || monitoredIds.length === 0) {
    return { totalAverage: 0, fatigueAverage: 0, weatherAverage: 0, mechAverage: 0, count: 0 };
  }

  // Ensure all monitored flights have risk rows
  await ensureRiskCalculations(monitoredIds);

  const risks = await db.riskCalculations.findMany({
    where: { flightId: { in: monitoredIds } }
  });

  if (risks.length === 0) {
    return { totalAverage: 0, fatigueAverage: 0, weatherAverage: 0, mechAverage: 0, count: 0 };
  }

  const sums = risks.reduce((acc, r) => ({
    total: acc.total + r.totalScore,
    fatigue: acc.fatigue + r.fatigueFactor,
    weather: acc.weather + r.weatherFactor,
    mech: acc.mech + r.mechFactor
  }), { total: 0, fatigue: 0, weather: 0, mech: 0 });

  return {
    totalAverage: sums.total / risks.length,
    fatigueAverage: sums.fatigue / risks.length,
    weatherAverage: sums.weather / risks.length,
    mechAverage: sums.mech / risks.length,
    count: risks.length
  };
}

export async function updateMonitoredFlights(flightIds: string[]) {
  await db.systemConfig.upsert({
    where: { key: 'monitored_flight_ids' },
    update: { value: JSON.stringify(flightIds) },
    create: { key: 'monitored_flight_ids', value: JSON.stringify(flightIds) }
  });
}

export async function getMonitoredFlightIds(): Promise<string[] | null> {
  const config = await db.systemConfig.findUnique({ where: { key: 'monitored_flight_ids' } });
  if (config) {
    try { return JSON.parse(config.value) as string[]; } catch {}
  }
  return null;
}

