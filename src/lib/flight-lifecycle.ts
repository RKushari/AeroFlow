import { db } from "./db";
import { FlightStatus, Prisma } from "@prisma/client";
import { calculateRisk } from "./risk";
import { getRiskThreshold } from "./config";
import { logAudit } from "./audit/ledger";

/**
 * Validates and executes a transition on the flight lifecycle state machine:
 * SCHEDULED (Pending) -> BOARDING (Approved) -> READY (Cleared) -> DEPARTED (Departed)
 */
export async function transitionFlight(
  flightId: string,
  targetStatus: FlightStatus,
  userId: string,
  options?: { isOverride?: boolean; tx?: Prisma.TransactionClient }
) {
  const tx = options?.tx || db;

  // Fetch flight with checklists, risk calculation, and incidents
  const flight = await tx.flights.findUnique({
    where: { id: flightId },
    include: {
      checklists: { include: { items: true } },
      risk: true,
      incidents: { where: { resolved: false } },
    },
  });

  if (!flight) {
    throw new Error("Flight not found.");
  }

  const currentStatus = flight.status;

  if (currentStatus === targetStatus) {
    return flight;
  }

  // 1. Enforce strict state transitions
  if (targetStatus === FlightStatus.BOARDING) {
    // Transition: SCHEDULED (Pending) -> BOARDING (Approved)
    if (currentStatus !== FlightStatus.SCHEDULED) {
      throw new Error(`Invalid transition: Cannot move to Approved (BOARDING) from ${currentStatus}.`);
    }

    // Validation: Requires 100% checklist completion
    const incompleteMandatory = flight.checklists
      .flatMap((c) => c.items)
      .filter((i) => i.isMandatory && !i.isComplete);

    if (incompleteMandatory.length > 0) {
      throw new Error(`Transition blocked: Mandatory checklist items are incomplete.`);
    }
  } 
  else if (targetStatus === FlightStatus.READY) {
    // Transition: BOARDING (Approved) -> READY (Cleared)
    if (currentStatus !== FlightStatus.BOARDING) {
      throw new Error(`Invalid transition: Cannot move to Cleared (READY) from ${currentStatus}.`);
    }

    // Validation: Requires risk score to be below the dynamic threshold
    const { isCritical, blockingReason } = await calculateRisk(flightId, tx);
    
    if (isCritical && !options?.isOverride) {
      throw new Error(`Transition blocked: ${blockingReason || "Risk score exceeds safety threshold."}`);
    }
  } 
  else if (targetStatus === FlightStatus.DEPARTED) {
    // Transition: READY (Cleared) -> DEPARTED (Departed)
    if (currentStatus !== FlightStatus.READY) {
      throw new Error(`Invalid transition: Cannot move to Departed (DEPARTED) from ${currentStatus}.`);
    }
    
    // Explicit sign-off is required (handled via DispatchApprovals check)
    const approval = await tx.dispatchApprovals.findFirst({
      where: {
        plan: {
          flightId: flightId,
        },
      },
    });

    if (!approval) {
      throw new Error("Transition blocked: Dispatcher sign-off signature is missing.");
    }
  } 
  else if (targetStatus === FlightStatus.CANCELLED) {
    // Any state can transition to CANCELLED
  } 
  else if (targetStatus === FlightStatus.HOLD) {
    // Any state except DEPARTED/CANCELLED can be put on HOLD
    if (currentStatus === FlightStatus.DEPARTED || currentStatus === FlightStatus.CANCELLED) {
      throw new Error(`Invalid transition: Cannot hold a ${currentStatus} flight.`);
    }
  } 
  else {
    throw new Error(`Transition logic undefined for target status: ${targetStatus}`);
  }

  // 2. Perform database update
  const updatedFlight = await tx.flights.update({
    where: { id: flightId },
    data: { status: targetStatus },
  });

  // 3. Log to audit ledger
  await logAudit(
    userId,
    `LIFECYCLE_TRANSITION_${currentStatus}_TO_${targetStatus}`,
    flightId,
    { status: currentStatus },
    { status: targetStatus },
    tx
  );

  return updatedFlight;
}
