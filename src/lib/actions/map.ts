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

export async function addMonitoredAirport(code: string) {
  await requireRole(['OPERATIONS_DIRECTOR']);
  const config = await db.systemConfig.findUnique({ where: { key: 'monitored_airports' } });
  let codes = config ? JSON.parse(config.value) : ['JFK', 'LAX', 'ORD', 'MIA', 'SEA'];
  if (!codes.includes(code)) {
    codes.push(code);
    await db.systemConfig.upsert({
      where: { key: 'monitored_airports' },
      create: { key: 'monitored_airports', value: JSON.stringify(codes) },
      update: { value: JSON.stringify(codes) }
    });
  }
  revalidatePath('/director/risk-map');
}
