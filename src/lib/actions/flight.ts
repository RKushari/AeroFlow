'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { transitionFlight } from '../flight-lifecycle';
import { FlightStatus } from '@prisma/client';
import { eventBus } from '../events';
import { revalidatePath } from 'next/cache';

export async function approveDispatch(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  const result = await db.$transaction(async (tx) => {
    // Enforce transition to Cleared (READY) which checks risk thresholds
    await transitionFlight(flightId, FlightStatus.READY, session.user.id, { tx });

    let plan = await tx.dispatchPlans.findUnique({ where: { flightId } });
    if (!plan) plan = await tx.dispatchPlans.create({ data: { flightId } });

    const approval = await tx.dispatchApprovals.create({ 
      data: { planId: plan.id, dispatcherId: session.user.id } 
    });
    
    eventBus.emit('dispatch_update', { type: 'DISPATCH_APPROVED', flightId, timestamp: new Date().toISOString() });
    
    return approval;
  });

  revalidatePath(`/dispatcher/flight/${flightId}`);
  revalidatePath('/dispatcher/dashboard');
  return result;
}

export async function overrideDispatch(flightId: string, justification: string) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);
  
  const result = await db.$transaction(async (tx) => {
    // Enforce transition to Cleared (READY) with override enabled to bypass risk check
    await transitionFlight(flightId, FlightStatus.READY, session.user.id, { isOverride: true, tx });
    
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

    eventBus.emit('dispatch_update', { 
      type: 'MANUAL_OVERRIDE', 
      flightId, 
      justification, 
      timestamp: new Date().toISOString() 
    });
    
    return override;
  });

  revalidatePath(`/dispatcher/flight/${flightId}`);
  revalidatePath('/dispatcher/dashboard');
  return result;
}

export async function approveDispatchFormAction(formData: FormData) {
  const flightId = formData.get('flightId') as string;
  if (flightId) {
    await approveDispatch(flightId);
  }
}

export async function overrideDispatchFormAction(formData: FormData) {
  const flightId = formData.get('flightId') as string;
  const justification = (formData.get('justification') as string) || 'Emergency Override';
  if (flightId) {
    await overrideDispatch(flightId, justification);
  }
}

