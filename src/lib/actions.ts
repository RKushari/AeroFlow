'use server';

import { db } from './db';
import { requireRole } from './auth';
import { calculateRisk } from './risk';
import { DispatchApprovalSchema, ManualOverrideSchema, IncidentReportSchema, ChecklistItemUpdateSchema, ShiftLogSchema, AiBriefingSchema } from './validations';
import { Prisma } from '@prisma/client';
import { eventBus } from './events';

async function logAudit(userId: string, action: string, resourceId: string, oldState: any, newState: any, tx: Prisma.TransactionClient = db) {
  await tx.auditLedger.create({
    data: {
      userId,
      action,
      resourceId,
      oldState,
      newState,
    }
  });
}

export async function approveDispatch(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  const parsed = DispatchApprovalSchema.parse({ flightId });

  return await db.$transaction(async (tx) => {
    const { isCritical, blockingReason } = await calculateRisk(parsed.flightId, tx);

    if (isCritical) {
      await logAudit(session.user.id, 'DISPATCH_BLOCKED', parsed.flightId, null, { reason: blockingReason }, tx);
      throw new Error(`Dispatch blocked: ${blockingReason}`);
    }

    const plan = await tx.dispatchPlans.findUnique({ where: { flightId: parsed.flightId } });
    if (!plan) throw new Error('Dispatch plan not found');

    const approval = await tx.dispatchApprovals.create({
      data: {
        planId: plan.id,
        dispatcherId: session.user.id,
      }
    });

    await tx.flights.update({
      where: { id: parsed.flightId },
      data: { status: 'READY' }
    });

    await logAudit(session.user.id, 'DISPATCH_APPROVED', parsed.flightId, { status: 'SCHEDULED' }, { status: 'READY' }, tx);
    
    return approval;
  });
}

export async function executeManualOverride(data: any) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = ManualOverrideSchema.parse(data);

  return await db.$transaction(async (tx) => {
    const override = await tx.manualOverrides.create({
      data: {
        flightId: parsed.flightId,
        userId: session.user.id,
        justification: parsed.justification,
      }
    });

    await tx.flights.update({
      where: { id: parsed.flightId },
      data: { status: 'READY' }
    });

    await logAudit(session.user.id, 'MANUAL_OVERRIDE_EXECUTED', parsed.flightId, null, { justification: parsed.justification }, tx);
    return override;
  });
}

// Stubs for Phase 2 and 4 logic to ensure the blueprint is fully represented
export async function updateChecklistItem(data: any) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = ChecklistItemUpdateSchema.parse(data);

  return await db.$transaction(async (tx) => {
    const item = await tx.checklistItems.update({
      where: { id: parsed.itemId },
      data: { isComplete: parsed.isComplete }
    });
    
    // Recalculate risk automatically upon state mutation
    const checklist = await tx.flightChecklists.findUnique({ where: { id: item.checklistId }});
    if (checklist) {
      await calculateRisk(checklist.flightId, tx);
    }
    
    return item;
  });
}

export async function reportIncident(data: any) {
  const session = await requireRole(['GROUND_CREW_LEAD', 'FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = IncidentReportSchema.parse(data);

  return await db.$transaction(async (tx) => {
    const incident = await tx.incidents.create({
      data: {
        flightId: parsed.flightId,
        reporterId: session.user.id,
        severity: parsed.severity,
      }
    });
    await calculateRisk(parsed.flightId, tx);

    eventBus.emit('alert_broadcast', {
      type: 'INCIDENT_REPORTED',
      flightId: parsed.flightId,
      severity: parsed.severity,
      timestamp: new Date().toISOString()
    });

    return incident;
  });
}
