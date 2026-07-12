'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { logAudit } from '../audit/ledger';
import { revalidatePath } from 'next/cache';

export async function completeChecklistItem(itemId: string) {
  const session = await requireRole(['GROUND_CREW_LEAD']);
  
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
    }

    revalidatePath('/crew/dashboard');
    return updated;
  });
}

export async function submitShiftLog(flightId: string, fatigueIndex: number) {
  const session = await requireRole(['GROUND_CREW_LEAD']);

  return await db.$transaction(async (tx) => {
    const log = await tx.shiftLogs.create({
      data: {
        userId: session.user.id,
        startTime: new Date(),
        fatigueIndex,
      }
    });

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
