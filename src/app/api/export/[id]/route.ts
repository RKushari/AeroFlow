import { NextRequest, NextResponse } from 'next/server';
import { generateFlightDossier } from '@/lib/pdf-service';
import { getSession } from '@/lib/auth';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR'].includes(session.user.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;

  try {
    const record = await db.pdfExports.findUnique({ where: { id } });
    if (!record) {
      return NextResponse.json({ error: 'Export record not found' }, { status: 404 });
    }

    const pdfBytes = await generateFlightDossier(record.flightId);

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="flight-${record.flightId}-dossier.pdf"`,
      },
    });
  } catch (error: any) {
    console.error('PDF Re-download Error:', error);
    return NextResponse.json({ error: 'Failed to generate PDF' }, { status: 500 });
  }
}
