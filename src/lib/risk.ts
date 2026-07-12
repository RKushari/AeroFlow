import { db } from './db';
import { Prisma, Severity } from '@prisma/client';

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
      crewUsers: {
        include: {
          shiftLogs: { orderBy: { startTime: 'desc' }, take: 1 }
        }
      }
    },
  });

  if (!flight) throw new Error('Flight not found');

  // Fs: Fatigue
  const allCrewLogs = flight.crewUsers.flatMap(u => u.shiftLogs);
  const Fs = allCrewLogs.length > 0
    ? allCrewLogs.reduce((acc, log) => acc + log.fatigueIndex, 0) / allCrewLogs.length
    : 0;

  // Wi: Weather
  const Wi = flight.weather.length > 0 ? flight.weather[0].severityIndex : 0;

  // Md: Mechanical (Equipment + Checklists)
  const equipment = await tx.groundEquipment.findMany();
  let maxEqRisk = 0;
  for (const eq of equipment) {
    const r = severityToRiskFactor(eq.status);
    if (r > maxEqRisk) maxEqRisk = r;
  }
  
  const incompleteMandatory = flight.checklists.flatMap(c => c.items).filter(i => i.isMandatory && !i.isComplete);
  const checklistPenalty = incompleteMandatory.length > 0 ? 0.9 : 0;
  
  const Md = Math.max(maxEqRisk, checklistPenalty);

  // Rc = w1 * Fs + w2 * Wi + w3 * Md
  const totalScore = (WEIGHTS.w1 * Fs) + (WEIGHTS.w2 * Wi) + (WEIGHTS.w3 * Md);

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
  
  if (totalScore >= 0.75) {
    isCritical = true;
    blockingReason = 'Critical overall risk score.';
  } else if (flight.incidents.some(i => i.severity === 'CRITICAL')) {
    isCritical = true;
    blockingReason = 'Unresolved critical incident on flight.';
  } else if (Wi >= 0.75) {
    isCritical = true;
    blockingReason = 'Critical weather severity.';
  } else if (incompleteMandatory.length > 0) {
    isCritical = true;
    blockingReason = 'Mandatory checklist items incomplete.';
  }

  return { calc, isCritical, blockingReason };
}
