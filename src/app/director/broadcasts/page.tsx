import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BroadcastBoard } from "@/components/director/broadcast-board";
import { mockBroadcasts } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  await requireRole(['OPERATIONS_DIRECTOR']);

  let messages = await db.broadcastMessages.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50
  });

  if (messages.length === 0) {
    messages = mockBroadcasts as any;
  }

  return (
    <div className="py-6">
      <BroadcastBoard initialMessages={messages as any} />
    </div>
  );
}
