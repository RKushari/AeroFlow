import { NextRequest, NextResponse } from 'next/server';
import { generateFlightDossier } from '@/lib/pdf-service';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    console.log('[PDF Export] Session:', session ? { id: session.user.id, role: session.user.role } : null);

    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    if (!['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const flightId = searchParams.get('flightId');
    console.log('[PDF Export] flightId:', flightId);

    if (!flightId) {
      return NextResponse.json({ error: 'Missing flightId parameter' }, { status: 400 });
    }

    const pdfBytes = await generateFlightDossier(flightId);
    console.log('[PDF Export] PDF generated, size:', pdfBytes.length);

    try {
      await db.pdfExports.create({
        data: {
          flightId,
          userId: session.user.id,
          fileUrl: `/api/export?flightId=${flightId}`,
        }
      });
    } catch (logErr: any) {
      console.warn('[PDF Export] Audit log failed (non-blocking):', logErr?.message);
    }

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flight-${flightId}-dossier.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('[PDF Export] Full error:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF', detail: error?.message, stack: error?.stack?.split('\n').slice(0, 5) },
      { status: 500 }
    );
  }
}
