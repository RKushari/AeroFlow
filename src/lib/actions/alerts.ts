'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function markAlertsRead() {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  const updated = await db.alertLogs.updateMany({
    where: { read: false },
    data: { read: true }
  });

  if (updated.count === 0) {
    const { mockAlerts } = await import("@/lib/mock-data");
    mockAlerts.forEach(a => a.read = true);
  }

  revalidatePath('/dispatcher/alerts');
  revalidatePath('/dispatcher/dashboard');
  revalidatePath('/');
}

export async function markAlertRead(alertId: string) {
  await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);

  try {
    await db.alertLogs.update({
      where: { id: alertId },
      data: { read: true }
    });
  } catch (err) {
    // Fallback to mock data mutation if not found in db
    const { mockAlerts } = await import("@/lib/mock-data");
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
      alert.read = true;
    }
  }

  revalidatePath('/dispatcher/alerts');
  revalidatePath('/dispatcher/dashboard');
  revalidatePath('/');
}
