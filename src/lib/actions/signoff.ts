'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { transitionFlight } from "@/lib/flight-lifecycle";
import { FlightStatus } from "@prisma/client";
import crypto from "crypto";
import { DispatchApprovalSchema } from "@/lib/validations";

export async function signoffDeparture(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = DispatchApprovalSchema.parse({ flightId });

  // Token generation must use a cryptographically secure random source
  const signoffToken = crypto.randomUUID();

  // 1. Get the DispatchPlan for this flight (create if it doesn't exist to attach approval)
  let plan = await db.dispatchPlans.findUnique({
    where: { flightId: parsed.flightId }
  });

  if (!plan) {
    plan = await db.dispatchPlans.create({
      data: { flightId: parsed.flightId }
    });
  }

  // 2. Create the DispatchApprovals record with the token (we can use the id as token, or planId, but let's just make the ID a secure UUID, which it is by default, but let's be explicit)
  await db.dispatchApprovals.create({
    data: {
      id: signoffToken,
      planId: plan.id,
      dispatcherId: session.user.id,
    }
  });

  // 3. Transition the flight to DEPARTED
  // (The transition function validates that we are in READY state and that the approval exists)
  await transitionFlight(parsed.flightId, FlightStatus.DEPARTED, session.user.id);
}
