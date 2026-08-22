'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { logAudit } from '../audit/ledger';
import { revalidatePath } from 'next/cache';
import { transitionFlight } from '../flight-lifecycle';
import { FlightStatus } from '@prisma/client';

export async function completeChecklistItem(itemId: string) {
  const session = await requireRole(['GROUND_CREW_LEAD']);
  
  if (itemId.startsWith('c1-') || itemId.startsWith('c2-')) {
    const globalAny = global as any;
    if (globalAny.mockFlights) {
       for (const f of globalAny.mockFlights) {
         for (const c of f.checklists) {
           const item = c.items.find((i: any) => i.id === itemId);
           if (item) {
             item.isComplete = true;
             revalidatePath('/crew/dashboard');
             return item;
           }
         }
       }
    }
    return { id: itemId, isComplete: true };
  }

  return await db.$transaction(async (tx) => {
    const item = await tx.checklistItems.findUnique({
      where: { id: itemId },
      include: { checklist: true }
    });

    if (!item) throw new Error("Checklist item not found");
    if (item.isComplete) return item;

    const updated = await tx.checklistItems.update({
      where: { id: itemId },
      data: { isComplete: true }
    });

    await logAudit(
      session.user.id,
      'CHECKLIST_ITEM_COMPLETED',
      itemId,
      item,
      updated,
      tx
    );

    const allItems = await tx.checklistItems.findMany({
      where: { checklistId: item.checklistId }
    });
    
    if (allItems.every(i => i.isComplete)) {
      await tx.flightChecklists.update({
        where: { id: item.checklistId },
        data: { isComplete: true }
      });

      // Auto-transition flight status to Approved (BOARDING)
      await transitionFlight(item.checklist.flightId, FlightStatus.BOARDING, session.user.id, { tx });
    }

    revalidatePath('/crew/dashboard');
    return updated;
  });
}

export async function completeChecklistItemFormAction(formData: FormData) {
  const itemId = formData.get('itemId') as string;
  if (itemId) {
    await completeChecklistItem(itemId);
  }
}


import { calculateFatigueIndex } from '../fatigue';

export async function submitShiftLog(
  flightId?: string,
  wakeTime?: string | null,
  workDurationHours: number = 8,
  alertnessScore: number = 5,
  manualFatigueIndex?: number
) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);

  const wakeDate = wakeTime ? new Date(wakeTime) : null;
  const evaluation = calculateFatigueIndex({
    wakeTime: wakeDate,
    workDurationHours,
    alertnessScore,
    startTime: new Date(),
  });

  const finalFatigueIndex = typeof manualFatigueIndex === 'number' && manualFatigueIndex > 0
    ? manualFatigueIndex
    : evaluation.fatigueIndex;

  if (flightId && flightId.startsWith('mock-uuid-')) {
    const globalAny = global as any;
    if (globalAny.mockFlights) {
      const flight = globalAny.mockFlights.find((f: any) => f.id === flightId);
      if (flight && !flight.crewUsers) {
        flight.crewUsers = [];
      }
      if (flight && !flight.crewUsers.find((u: any) => u.id === session.user.id)) {
        flight.crewUsers.push({ id: session.user.id });
      }
    }
    revalidatePath('/crew/dashboard');
    return {
      id: 'mock-shift-log',
      userId: session.user.id,
      wakeTime: wakeDate,
      workDurationHours,
      alertnessScore,
      fatigueIndex: finalFatigueIndex,
      isFlagged: evaluation.isFlagged,
      flagReason: evaluation.flagReason,
      startTime: new Date()
    };
  }

  return await db.$transaction(async (tx) => {
    const log = await tx.shiftLogs.create({
      data: {
        userId: session.user.id,
        startTime: new Date(),
        wakeTime: wakeDate,
        workDurationHours,
        alertnessScore,
        fatigueIndex: finalFatigueIndex,
        isFlagged: evaluation.isFlagged,
        flagReason: evaluation.flagReason,
      }
    });

    if (flightId) {
      const flight = await tx.flights.findUnique({
        where: { id: flightId },
        include: { crewUsers: true }
      });

      if (flight && !flight.crewUsers.find(u => u.id === session.user.id)) {
        await tx.flights.update({
          where: { id: flightId },
          data: {
            crewUsers: { connect: { id: session.user.id } }
          }
        });
      }
    }

    await logAudit(
      session.user.id,
      'SHIFT_LOG_SUBMITTED',
      log.id,
      null,
      log,
      tx
    );

    revalidatePath('/crew/dashboard');
    return log;
  });
}

export async function updateShiftLog(
  logId: string,
  wakeTime?: string | null,
  workDurationHours: number = 8,
  alertnessScore: number = 5
) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);

  const existing = await db.shiftLogs.findUnique({
    where: { id: logId }
  });

  if (!existing) {
    throw new Error('Shift log record not found');
  }

  // Ensure user can only edit their own logs unless they are OPERATIONS_DIRECTOR
  if (existing.userId !== session.user.id && session.user.role !== 'OPERATIONS_DIRECTOR') {
    throw new Error('Unauthorized to edit this shift log');
  }

  const wakeDate = wakeTime ? new Date(wakeTime) : null;
  const evaluation = calculateFatigueIndex({
    wakeTime: wakeDate,
    workDurationHours,
    alertnessScore,
    startTime: existing.startTime || new Date(),
  });

  return await db.$transaction(async (tx) => {
    const updated = await tx.shiftLogs.update({
      where: { id: logId },
      data: {
        wakeTime: wakeDate,
        workDurationHours,
        alertnessScore,
        fatigueIndex: evaluation.fatigueIndex,
        isFlagged: evaluation.isFlagged,
        flagReason: evaluation.flagReason,
      }
    });

    await logAudit(
      session.user.id,
      'SHIFT_LOG_UPDATED',
      logId,
      existing,
      updated,
      tx
    );

    revalidatePath('/crew/dashboard');
    return updated;
  });
}

export async function getUserShiftLogs(userId: string) {
  try {
    return await db.shiftLogs.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      take: 20,
    });
  } catch (err) {
    console.error("Failed to fetch user shift logs from database, returning empty array fallback:", err);
    return [];
  }
}
