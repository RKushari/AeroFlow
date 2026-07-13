'use server';

import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { eventBus } from "@/lib/events";
import { MessagePriority } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function publishBroadcast(content: string, priority: MessagePriority, expiresAt?: Date) {
  const session = await requireRole(['OPERATIONS_DIRECTOR']);

  const message = await db.broadcastMessages.create({
    data: {
      authorId: session.user.id,
      content,
      priority,
      expiresAt
    }
  });

  // Emit to SSE
  eventBus.emit('alert_broadcast', {
    type: 'BROADCAST',
    message: content,
    priority,
    timestamp: message.createdAt.toISOString()
  });

  revalidatePath('/director/broadcasts');
  return message;
}
