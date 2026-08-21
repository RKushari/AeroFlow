'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { eventBus } from "@/lib/events";
import { logAudit } from "@/lib/audit/ledger";
import { MessagePriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function publishBroadcast(content: string, priority: MessagePriority, expiresAt?: Date) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);

  const message = await db.broadcastMessages.create({
    data: {
      authorId: session.user.id,
      content,
      priority,
      expiresAt: expiresAt ?? null
    }
  });

  // Emit to real-time SSE stream
  eventBus.emit('alert_broadcast', {
    type: 'BROADCAST',
    id: message.id,
    message: content,
    priority,
    timestamp: message.createdAt.toISOString()
  });

  // Log to immutable audit ledger
  await logAudit(
    session.user.id,
    'PUBLISHED_BROADCAST',
    message.id,
    null,
    { content, priority, expiresAt: expiresAt?.toISOString() }
  );

  revalidatePath('/director/broadcasts');
  return message;
}

export async function updateBroadcast(
  id: string, 
  content: string, 
  priority: MessagePriority, 
  expiresAt?: Date | null
) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);

  const oldMessage = await db.broadcastMessages.findUnique({ where: { id } });
  if (!oldMessage) throw new Error("Broadcast message not found.");

  const updatedMessage = await db.broadcastMessages.update({
    where: { id },
    data: {
      content,
      priority,
      expiresAt: expiresAt !== undefined ? expiresAt : oldMessage.expiresAt
    }
  });

  // Re-emit updated broadcast over SSE
  eventBus.emit('alert_broadcast', {
    type: 'BROADCAST',
    id: updatedMessage.id,
    message: `[UPDATED] ${content}`,
    priority,
    timestamp: new Date().toISOString()
  });

  await logAudit(
    session.user.id,
    'UPDATED_BROADCAST',
    id,
    { content: oldMessage.content, priority: oldMessage.priority, expiresAt: oldMessage.expiresAt },
    { content: updatedMessage.content, priority: updatedMessage.priority, expiresAt: updatedMessage.expiresAt }
  );

  revalidatePath('/director/broadcasts');
  return updatedMessage;
}

export async function deactivateBroadcast(id: string) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);

  const oldMessage = await db.broadcastMessages.findUnique({ where: { id } });
  if (!oldMessage) throw new Error("Broadcast message not found.");

  // Deactivate by setting expiration to current timestamp
  const deactivated = await db.broadcastMessages.update({
    where: { id },
    data: {
      expiresAt: new Date()
    }
  });

  await logAudit(
    session.user.id,
    'DEACTIVATED_BROADCAST',
    id,
    { activeUntil: oldMessage.expiresAt },
    { deactivatedAt: new Date().toISOString() }
  );

  revalidatePath('/director/broadcasts');
  return deactivated;
}

export async function deleteBroadcast(id: string) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);

  const oldMessage = await db.broadcastMessages.findUnique({ where: { id } });
  if (!oldMessage) throw new Error("Broadcast message not found.");

  await db.broadcastMessages.delete({ where: { id } });

  await logAudit(
    session.user.id,
    'DELETED_BROADCAST',
    id,
    { content: oldMessage.content, priority: oldMessage.priority },
    { deletedAt: new Date().toISOString() }
  );

  revalidatePath('/director/broadcasts');
  return { success: true };
}
