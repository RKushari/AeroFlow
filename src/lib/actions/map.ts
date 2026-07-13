'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function flagZone(coordinates: string, reason: string) {
  await requireRole(['OPERATIONS_DIRECTOR']);

  const zone = await db.flaggedZones.create({
    data: {
      coordinates,
      reason
    }
  });

  revalidatePath('/director/risk-map');
  return zone;
}
