'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { logAudit } from "@/lib/audit/ledger";
import { generateAiBriefing } from "@/lib/ai";
import { revalidatePath } from "next/cache";

export async function deleteBriefing(briefingId: string, flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  // Soft delete
  await db.safetyBriefings.update({
    where: { id: briefingId },
    data: { deletedAt: new Date() }
  });

  // Audit log for the deletion
  await logAudit(
    session.user.id,
    "DELETED_AI_BRIEFING",
    flightId,
    { briefingId },
    { deletedAt: new Date().toISOString() }
  );

  revalidatePath(`/dispatcher/flight/${flightId}`);
}

export async function regenerateBriefing(flightId: string) {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  // Call the existing logic which now creates a new history record
  await generateAiBriefing(flightId);
  revalidatePath(`/dispatcher/flight/${flightId}`);
}
