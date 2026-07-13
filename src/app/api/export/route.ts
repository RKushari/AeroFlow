import { NextRequest, NextResponse } from 'next/server';
import { generateFlightDossier } from '@/lib/pdf-service';
import { getSession, requireRole } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (!['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const flightId = searchParams.get('flightId');

  if (!flightId) {
    return NextResponse.json({ error: 'Missing flightId parameter' }, { status: 400 });
  }

  try {
    const pdfBytes = await generateFlightDossier(flightId);

    // Audit log
    await db.pdfExports.create({
      data: {
        flightId,
        fileUrl: `/api/export?flightId=${flightId}`, // Store API path as reference
      }
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flight-${flightId}-dossier.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Export Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
