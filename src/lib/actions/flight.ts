'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { calculateRisk } from '../risk';
import { logAudit } from '../audit/ledger';
import { eventBus } from '../events';

export async function approveDispatch(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  return await db.$transaction(async (tx) => {
    const flight = await tx.flights.findUnique({ 
      where: { id: flightId }, 
      include: { checklists: { include: { items: true } }, incidents: true }
    });
    
    if (!flight) throw new Error('Flight not found');
    if (flight.status === 'READY') throw new Error('Flight is already approved');

    const incompleteMandatory = flight.checklists.flatMap(c => c.items).filter(i => i.isMandatory && !i.isComplete);
    if (incompleteMandatory.length > 0) throw new Error('Mandatory checklist items incomplete.');

    const { isCritical, blockingReason } = await calculateRisk(flightId, tx);
    
    if (isCritical) {
      await logAudit(session.user.id, 'DISPATCH_BLOCKED', flightId, null, { reason: blockingReason }, tx);
      throw new Error(`Dispatch blocked: ${blockingReason}`);
    }

    if (flight.incidents.some(i => i.severity === 'CRITICAL' && !i.resolved)) {
      throw new Error('Unresolved critical incident on flight.');
    }

    let plan = await tx.dispatchPlans.findUnique({ where: { flightId } });
    if (!plan) plan = await tx.dispatchPlans.create({ data: { flightId } });

    const approval = await tx.dispatchApprovals.create({ 
      data: { planId: plan.id, dispatcherId: session.user.id } 
    });
    
    const oldState = { ...flight };
    const updatedFlight = await tx.flights.update({ where: { id: flightId }, data: { status: 'READY' } });
    
    await logAudit(session.user.id, 'DISPATCH_APPROVED', flightId, oldState, updatedFlight, tx);
    eventBus.emit('dispatch_update', { type: 'DISPATCH_APPROVED', flightId, timestamp: new Date().toISOString() });
    
    return approval;
  });
}

export async function overrideDispatch(flightId: string, justification: string) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);
  
  return await db.$transaction(async (tx) => {
    const flight = await tx.flights.findUnique({ where: { id: flightId } });
    if (!flight) throw new Error('Flight not found');
    if (flight.status === 'READY') throw new Error('Flight is already approved');
    
    const override = await tx.manualOverrides.create({
      data: {
        flightId,
        userId: session.user.id,
        justification,
      }
    });

    let plan = await tx.dispatchPlans.findUnique({ where: { flightId } });
    if (!plan) plan = await tx.dispatchPlans.create({ data: { flightId } });

    await tx.dispatchApprovals.create({ 
      data: { planId: plan.id, dispatcherId: session.user.id } 
    });

    const oldState = { ...flight };
    const updatedFlight = await tx.flights.update({ where: { id: flightId }, data: { status: 'READY' } });

    await logAudit(session.user.id, 'MANUAL_OVERRIDE_EXECUTED', flightId, oldState, { ...updatedFlight, justification }, tx);
    eventBus.emit('dispatch_update', { type: 'MANUAL_OVERRIDE', flightId, justification, timestamp: new Date().toISOString() });
    
    return override;
  });
}
