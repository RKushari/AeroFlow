'use server';

import { db } from '../db';
import { requireRole } from '../auth';
import { revalidatePath } from 'next/cache';

export async function deletePdfExport(exportId: string, flightId: string) {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  await db.pdfExports.delete({
    where: { id: exportId }
  });

  revalidatePath(`/dispatcher/flight/${flightId}`);
  return { success: true };
}
