'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { transitionFlight } from "@/lib/flight-lifecycle";
import { FlightStatus } from "@prisma/client";
import { DispatchApprovalSchema } from "@/lib/validations";
import { revalidatePath } from "next/cache";

export async function signoffDeparture(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = DispatchApprovalSchema.parse({ flightId });

  // The DispatchApprovals record already exists from the "Approve Dispatch" step.
  // transitionFlight validates that the approval exists before allowing DEPARTED.
  await transitionFlight(parsed.flightId, FlightStatus.DEPARTED, session.user.id);

  revalidatePath(`/dispatcher/flight/${parsed.flightId}`);
  revalidatePath('/dispatcher/dashboard');
  revalidatePath('/');
}
