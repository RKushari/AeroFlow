import { db } from "@/lib/db";
import { requireRole } from "@/lib/auth";
import { BroadcastBoard } from "@/components/director/broadcast-board";
import { mockBroadcasts } from "@/lib/mock-data";

export const dynamic = 'force-dynamic';

export default async function BroadcastsPage() {
  await requireRole(['OPERATIONS_DIRECTOR', 'FLIGHT_DISPATCHER', 'GROUND_CREW_LEAD']);

  let messages: any[] = [];

  try {
    messages = await db.broadcastMessages.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    if (messages.length === 0) {
      messages = mockBroadcasts as any;
    }
  } catch (err) {
    console.error("Broadcasts DB Error, falling back to mock broadcasts:", err);
    messages = mockBroadcasts as any;
  }

  return (
    <div className="py-4 font-mono">
      <BroadcastBoard initialMessages={messages as any} />
    </div>
  );
}
