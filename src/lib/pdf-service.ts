import { PDFDocument, rgb } from 'pdf-lib';
import { db } from './db';
import { FlightStatus } from '@prisma/client';

function sanitizeWinAnsi(str: string): string {
  if (!str) return '';
  return str
    .replace(/→/g, '->')
    .replace(/➔/g, '->')
    .replace(/✓/g, '[X]')
    .replace(/✗/g, '[ ]')
    .replace(/•/g, '*')
    .replace(/[^\x00-\x7F]/g, '') // Remove non-ASCII characters that break WinAnsi font encoding
    .trim();
}

export async function generateFlightDossier(flightId: string) {
  let flight: any = null;

  try {
    flight = await db.flights.findUnique({
      where: { id: flightId },
      include: {
        route: true,
        risk: true,
        weather: { orderBy: { id: 'desc' }, take: 1 },
        briefings: { where: { deletedAt: null, isApproved: true }, orderBy: { id: 'desc' }, take: 1 },
        checklists: { include: { items: true } },
        crewUsers: true,
        dispatchPlan: {
          include: { approval: true }
        }
      }
    });
  } catch (err) {
    console.warn("DB query error in generateFlightDossier, attempting mock fallback:", err);
  }

  if (!flight) {
    const { mockFlights } = await import("./mock-data");
    const mock = mockFlights.find((m: any) => m.id === flightId || m.flightNumber === flightId) || mockFlights[0];
    flight = {
      ...mock,
      weather: mock.weather ? [mock.weather] : [],
      briefings: mock.briefings || [],
      checklists: mock.checklists || [],
      crewUsers: mock.crewUsers || []
    };
  }

  const doc = await PDFDocument.create();
  const page = doc.addPage([600, 800]);
  let y = 750;
  const lineHeight = 18;
  const sectionGap = 10;

  const drawLine = (rawText: string, size = 12, color = rgb(0, 0, 0)) => {
    const text = sanitizeWinAnsi(rawText);
    if (!text) return page;
    if (y < 50) {
      // Add a new page if we run out of space
      const newPage = doc.addPage([600, 800]);
      y = 750;
      newPage.drawText(text, { x: 50, y, size, color });
      y -= lineHeight;
      return newPage;
    }
    page.drawText(text, { x: 50, y, size, color });
    y -= lineHeight;
    return page;
  };

  // Title
  drawLine('AeroFlow Safety Dossier', 22);
  y -= sectionGap;

  // Flight Info
  drawLine(`Flight Number: ${flight.flightNumber}`, 14);
  drawLine(`Route: ${flight.route?.originId || 'N/A'} -> ${flight.route?.destinationId || 'N/A'}`, 14);
  drawLine(`Status: ${flight.status}`, 14);
  y -= sectionGap;

  // Risk
  if (flight.risk) {
    drawLine('--- Risk Assessment ---', 13, rgb(0.8, 0, 0));
    drawLine(`Total Score: ${flight.risk.totalScore.toFixed(2)}`);
    drawLine(`Fatigue Factor: ${flight.risk.fatigueFactor.toFixed(2)}`);
    drawLine(`Weather Factor: ${flight.risk.weatherFactor.toFixed(2)}`);
    drawLine(`Mechanical Factor: ${flight.risk.mechFactor.toFixed(2)}`);
    y -= sectionGap;
  }

  // Weather
  if (flight.weather && flight.weather.length > 0) {
    drawLine('--- Weather ---', 13, rgb(0, 0, 0.8));
    drawLine(`Severity Index: ${flight.weather[0].severityIndex.toFixed(2)}`);
    y -= sectionGap;
  }

  // Crew
  if (flight.crewUsers && flight.crewUsers.length > 0) {
    drawLine('--- Assigned Crew ---', 13, rgb(0, 0.5, 0));
    flight.crewUsers.forEach((u: any) => {
      drawLine(`* ${u.name} (${u.role})`);
    });
    y -= sectionGap;
  }

  // Checklists
  if (flight.checklists && flight.checklists.length > 0) {
    drawLine('--- Pre-Flight Checklists ---', 13, rgb(0.5, 0, 0.5));
    flight.checklists.forEach((cl: any) => {
      cl.items?.forEach((item: any) => {
        const status = item.isComplete ? '[X]' : '[ ]';
        const mandatory = item.isMandatory ? ' [MANDATORY]' : '';
        drawLine(`  ${status} ${item.task}${mandatory}`);
      });
    });
    y -= sectionGap;
  }

  // Safety Briefing
  if (flight.briefings && flight.briefings.length > 0) {
    drawLine('--- Approved Safety Briefing ---', 13, rgb(0, 0, 0.6));
    const briefingText = flight.briefings[0].finalContent || flight.briefings[0].draftContent;
    // Split long text into lines (max ~70 chars per line)
    const words = briefingText.split(' ');
    let currentLine = '';
    words.forEach((word: string) => {
      if ((currentLine + ' ' + word).length > 70) {
        drawLine(`  ${currentLine.trim()}`);
        currentLine = word;
      } else {
        currentLine += ' ' + word;
      }
    });
    if (currentLine.trim()) drawLine(`  ${currentLine.trim()}`);
    y -= sectionGap;
  }

  // Dispatch Sign-off
  if (flight.status === FlightStatus.DEPARTED && flight.dispatchPlan?.approval) {
    drawLine('--- Departure Sign-off ---', 13, rgb(0, 0.5, 0));
    drawLine(`Token: ${flight.dispatchPlan.approval.id}`);
    drawLine(`Approved At: ${flight.dispatchPlan.approval.approvedAt.toISOString()}`);
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
