'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { Severity } from "@prisma/client";

// ============================================
// 1. EXISTING FUNCTION - KEEP THIS (with a small fix to revalidate the new page)
// ============================================
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
  revalidatePath('/crew/equipment'); // ADD THIS to refresh your new page
}

// ============================================
// 2. EXISTING SEED FUNCTION - FIXED TO INCLUDE "type"
// ============================================
export async function seedDummyEquipment() {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);
  
  const count = await db.groundEquipment.count();
  if (count === 0) {
    await db.groundEquipment.createMany({
      data: [
        { identifier: 'Fuel Truck A-12', type: 'OTHER', status: 'LOW' },
        { identifier: 'Tug B-04', type: 'TOWING', status: 'LOW' },
        { identifier: 'De-icer C-01', type: 'OTHER', status: 'MEDIUM' },
        { identifier: 'Belt Loader D-09', type: 'BAGGAGE_LOADER', status: 'LOW' },
      ]
    });
    revalidatePath('/crew/dashboard');
    revalidatePath('/crew/equipment');
  }
}

// ============================================
// 3. NEW CREATE FUNCTION (For manual entry)
// ============================================
export async function createEquipment(data: {
  identifier: string;
  type: string;
  status: Severity;
}) {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);
  
  const equipment = await db.groundEquipment.create({
    data: {
      identifier: data.identifier,
      type: data.type,
      status: data.status,
    },
  });
  
  revalidatePath('/crew/dashboard');
  revalidatePath('/crew/equipment');
  return equipment;
}

// ============================================
// 4. NEW DELETE FUNCTION (Required for decommissioned equipment)
// ============================================
export async function deleteEquipment(equipmentId: string) {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);
  
  await db.groundEquipment.delete({
    where: { id: equipmentId },
  });
  
  revalidatePath('/crew/dashboard');
  revalidatePath('/crew/equipment');
}

// ============================================
// 5. NEW UPDATE FUNCTION (Enhanced to edit all fields)
// ============================================
export async function updateEquipment(
  equipmentId: string,
  data: Partial<{
    identifier: string;
    type: string;
    status: Severity;
    flightId: string | null;
  }>
) {
  await requireRole(['GROUND_CREW_LEAD', 'OPERATIONS_DIRECTOR']);
  
  const updated = await db.groundEquipment.update({
    where: { id: equipmentId },
    data,
  });
  
  revalidatePath('/crew/dashboard');
  revalidatePath('/crew/equipment');
  return updated;
}