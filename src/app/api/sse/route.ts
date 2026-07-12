import { NextResponse } from "next/server";
import { eventBus } from "@/lib/events";

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection ping
      controller.enqueue(`data: ${JSON.stringify({ type: 'CONNECTED', timestamp: new Date().toISOString() })}\n\n`);

      const listener = (data: any) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`);
      };

      eventBus.on('dispatch_update', listener);
      eventBus.on('alert_broadcast', listener);

      // Keepalive ping to prevent connection timeout
      const keepAlive = setInterval(() => {
        controller.enqueue(`data: ${JSON.stringify({ type: 'PING', timestamp: new Date().toISOString() })}\n\n`);
      }, 30000);

      // Cleanup
      req.signal.addEventListener('abort', () => {
        clearInterval(keepAlive);
        eventBus.off('dispatch_update', listener);
        eventBus.off('alert_broadcast', listener);
      });
    }
  });

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
