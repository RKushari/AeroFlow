import { db } from './db';
import { Prisma, Severity } from '@prisma/client';
import { getRiskThreshold } from './config';
import { eventBus } from './events';

const WEIGHTS = { w1: 0.3, w2: 0.4, w3: 0.3 };

function severityToRiskFactor(s: Severity): number {
  switch (s) {
    case 'LOW': return 0.1;
    case 'MEDIUM': return 0.4;
    case 'HIGH': return 0.7;
    case 'CRITICAL': return 1.0;
  }
}

export async function calculateRisk(flightId: string, tx: Prisma.TransactionClient = db) {
  const flight = await tx.flights.findUnique({
    where: { id: flightId },
    include: {
      checklists: { include: { items: true } },
      weather: { orderBy: { id: 'desc' }, take: 1 },
      incidents: { where: { resolved: false } },
      crewUsers: { include: { shiftLogs: { orderBy: { startTime: 'desc' }, take: 1 } } }
    }
  });

  if (!flight) throw new Error('Flight not found');

  // 1. Fatigue (Fs)
  // Average fatigue index of assigned crew. Default to 0 if none.
  const crewUsers = flight.crewUsers || [];
  const shiftLogs = crewUsers.map((u: any) => u.shiftLogs?.[0]).filter(Boolean);
  const Fs = shiftLogs.length > 0 
    ? shiftLogs.reduce((acc: number, log: any) => acc + log.fatigueIndex, 0) / shiftLogs.length 
    : 0.0;

  // 2. Weather (Wi)
  // Severity index from latest weather record. Default to 0 if none.
  const Wi = flight.weather[0]?.severityIndex ?? 0.0;

  // 3. Mechanical/Checklist (Md)
  // Max severity of unresolved equipment issues, OR checklist penalty if incomplete.
  // Checklist penalty: 1.0 if mandatory items incomplete, 0 otherwise.
  const incompleteMandatory = flight.checklists
    .flatMap(c => c.items)
    .filter(i => i.isMandatory && !i.isComplete);

  const checklistPenalty = incompleteMandatory.length > 0 ? 1.0 : 0.0;

  // Equipment status query
  const equipment = await tx.groundEquipment.findMany();
  let maxEqRisk = 0;
  for (const eq of equipment) {
    const r = severityToRiskFactor(eq.status);
    if (r > maxEqRisk) maxEqRisk = r;
  }

  const Md = Math.max(maxEqRisk, checklistPenalty);

  // Aggregated Score
  const totalScore = (WEIGHTS.w1 * Fs) + (WEIGHTS.w2 * Wi) + (WEIGHTS.w3 * Md);

  // Persist
  const calc = await tx.riskCalculations.upsert({
    where: { flightId },
    create: {
      flightId,
      totalScore,
      fatigueFactor: Fs,
      weatherFactor: Wi,
      mechFactor: Md,
    },
    update: {
      totalScore,
      fatigueFactor: Fs,
      weatherFactor: Wi,
      mechFactor: Md,
      calculatedAt: new Date(),
    }
  });

  // Check critical gates
  let isCritical = false;
  let blockingReason = '';
  
  const threshold = await getRiskThreshold();
  
  if (totalScore >= threshold) {
    isCritical = true;
    blockingReason = 'Critical overall risk score.';
    eventBus.emit('alert_broadcast', {
      type: 'RISK_THRESHOLD_FAILURE',
      flightId,
      score: totalScore,
      threshold,
      timestamp: new Date().toISOString()
    });
  } else if (flight.incidents.some(i => i.severity === 'CRITICAL')) {
    isCritical = true;
    blockingReason = 'Unresolved critical incident on flight.';
  } else if (Wi >= threshold) {
    isCritical = true;
    blockingReason = 'Critical weather severity.';
  } else if (incompleteMandatory.length > 0) {
    isCritical = true;
    blockingReason = 'Mandatory checklist items incomplete.';
  }

  return { calc, isCritical, blockingReason };
}
