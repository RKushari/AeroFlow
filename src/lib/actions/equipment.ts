'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Severity } from "@prisma/client";

export async function logEquipmentMaintenance(equipmentId: string, notes: string, status: Severity) {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);

  await db.equipmentMaintenanceLogs.create({
    data: {
      equipmentId,
      notes
    }
  });

  await db.groundEquipment.update({
    where: { id: equipmentId },
    data: { status }
  });

  revalidatePath('/crew/dashboard');
}

export async function seedDummyEquipment() {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);
  
  const count = await db.groundEquipment.count();
  if (count === 0) {
    await db.groundEquipment.createMany({
      data: [
        { identifier: 'Fuel Truck A-12', status: 'LOW' },
        { identifier: 'Tug B-04', status: 'LOW' },
        { identifier: 'De-icer C-01', status: 'MEDIUM' },
        { identifier: 'Belt Loader D-09', status: 'LOW' },
      ]
    });
    revalidatePath('/crew/dashboard');
  }
}
