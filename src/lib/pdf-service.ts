import { PDFDocument, rgb } from 'pdf-lib';
import { db } from './db';
import { FlightStatus } from '@prisma/client';

export async function generateFlightDossier(flightId: string) {
  const flight = await db.flights.findUnique({
    where: { id: flightId },
    include: {
      risk: true,
      weather: { orderBy: { id: 'desc' }, take: 1 },
      dispatchPlan: {
        include: { approval: true }
      }
    }
  });

  if (!flight) throw new Error('Flight not found');

  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);

  page.drawText(`AeroFlow Safety Dossier`, { x: 50, y: 750, size: 24, color: rgb(0, 0, 0) });
  page.drawText(`Flight Number: ${flight.flightNumber}`, { x: 50, y: 700, size: 14 });
  page.drawText(`Status: ${flight.status}`, { x: 50, y: 680, size: 14 });

  if (flight.risk) {
    page.drawText(`Risk Score: ${flight.risk.totalScore.toFixed(2)}`, { x: 50, y: 640, size: 14 });
  }

  if (flight.weather.length > 0) {
    page.drawText(`Weather Severity: ${flight.weather[0].severityIndex}`, { x: 50, y: 620, size: 14 });
  }

  if (flight.status === FlightStatus.DEPARTED && flight.dispatchPlan?.approval) {
    page.drawText(`Departure Sign-off Token:`, { x: 50, y: 580, size: 14, color: rgb(0, 0.5, 0) });
    page.drawText(`${flight.dispatchPlan.approval.id}`, { x: 50, y: 560, size: 12 });
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
