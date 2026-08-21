import { db } from '../db';
import { Prisma } from '@prisma/client';
import { headers } from 'next/headers';

export async function logAudit(
  userId: string, 
  action: string, 
  resourceId: string, 
  oldState: any, 
  newState: any, 
  tx: Prisma.TransactionClient = db
) {
  const headerStore = await headers();
  // Attempt to capture IP from common proxy headers, fallback to a mock for now
  const ipAddress = headerStore.get('x-forwarded-for') || headerStore.get('x-real-ip') || '127.0.0.1';

  await tx.auditLedger.create({ 
    data: { 
      userId, 
      action, 
      resourceId,
      ipAddress,
      oldState: typeof oldState === 'object' && oldState !== null ? JSON.stringify(oldState) : oldState || null, 
      newState: typeof newState === 'object' && newState !== null ? JSON.stringify(newState) : newState || null 
    } 
  });
}
