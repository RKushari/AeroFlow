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
        briefings: { where: { deletedAt: null }, orderBy: { id: 'desc' }, take: 1 },
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
  let currentPage = doc.addPage([600, 800]);
  let y = 750;
  const lineHeight = 16;
  const sectionGap = 12;

  const drawLine = (rawText: string, size = 11, color = rgb(0, 0, 0)) => {
    const text = sanitizeWinAnsi(rawText);
    if (!text) return;

    if (y < 50) {
      currentPage = doc.addPage([600, 800]);
      y = 750;
    }

    currentPage.drawText(text, { x: 50, y, size, color });
    y -= lineHeight;
  };

  const drawParagraph = (rawParagraph: string, size = 10, color = rgb(0.15, 0.15, 0.15)) => {
    if (!rawParagraph) return;
    const lines = rawParagraph.split('\n');

    lines.forEach(rawLineStr => {
      const lineStr = sanitizeWinAnsi(rawLineStr);
      if (!lineStr) {
        y -= 4; // Spacing for empty lines / paragraph breaks
        return;
      }

      const words = lineStr.split(' ');
      let currentLine = '';

      words.forEach(word => {
        if ((currentLine + ' ' + word).length > 72) {
          drawLine(currentLine.trim(), size, color);
          currentLine = word;
        } else {
          currentLine = currentLine ? `${currentLine} ${word}` : word;
        }
      });

      if (currentLine.trim()) {
        drawLine(currentLine.trim(), size, color);
      }
    });
  };

  // Document Header Title
  drawLine('AeroFlow Safety Dossier', 22, rgb(0.05, 0.15, 0.35));
  y -= sectionGap;

  // Flight Info Section
  drawLine(`Flight Number: ${flight.flightNumber}`, 13, rgb(0, 0, 0));
  drawLine(`Route: ${flight.route?.originId || 'N/A'} -> ${flight.route?.destinationId || 'N/A'} (Base Risk: ${flight.route?.baseRisk ?? 'N/A'})`, 12);
  drawLine(`Status: ${flight.status}`, 12);
  y -= sectionGap;

  // Composite Risk Assessment
  if (flight.risk) {
    drawLine('--- Risk Matrix Assessment ---', 13, rgb(0.75, 0.1, 0.1));
    drawLine(`Total Score: ${flight.risk.totalScore.toFixed(2)} / 10.0`);
    drawLine(`Fatigue Factor (30%): ${flight.risk.fatigueFactor.toFixed(2)}`);
    drawLine(`Weather Factor (40%): ${flight.risk.weatherFactor.toFixed(2)}`);
    drawLine(`Mechanical Factor (30%): ${flight.risk.mechFactor.toFixed(2)}`);
    y -= sectionGap;
  }

  // Live Weather Telemetry
  if (flight.weather && flight.weather.length > 0) {
    drawLine('--- Weather Telemetry ---', 13, rgb(0.1, 0.3, 0.75));
    drawLine(`Severity Index: ${flight.weather[0].severityIndex.toFixed(2)} / 10.0`);
    y -= sectionGap;
  }

  // Assigned Crew
  if (flight.crewUsers && flight.crewUsers.length > 0) {
    drawLine('--- Assigned Crew Members ---', 13, rgb(0.1, 0.5, 0.2));
    flight.crewUsers.forEach((u: any) => {
      drawLine(`* ${u.name} (${u.role})`);
    });
    y -= sectionGap;
  }

  // Pre-Flight Checklists
  if (flight.checklists && flight.checklists.length > 0) {
    drawLine('--- Pre-Flight Checklists ---', 13, rgb(0.4, 0.1, 0.5));
    flight.checklists.forEach((cl: any) => {
      cl.items?.forEach((item: any) => {
        const status = item.isComplete ? '[X]' : '[ ]';
        const mandatory = item.isMandatory ? ' [MANDATORY]' : '';
        drawLine(`  ${status} ${item.task}${mandatory}`, 10);
      });
    });
    y -= sectionGap;
  }

  // Safety Briefing Section
  if (flight.briefings && flight.briefings.length > 0) {
    const activeBriefing = flight.briefings[0];
    const briefingTitle = activeBriefing.isApproved ? '--- Approved Safety Briefing ---' : '--- AI Safety Briefing (Draft) ---';
    drawLine(briefingTitle, 13, activeBriefing.isApproved ? rgb(0.1, 0.5, 0.2) : rgb(0.75, 0.45, 0.0));
    
    const briefingText = activeBriefing.finalContent || activeBriefing.draftContent;
    drawParagraph(briefingText, 10, rgb(0.15, 0.15, 0.15));
    y -= sectionGap;
  }

  // Departure Sign-off Token
  if (flight.status === FlightStatus.DEPARTED && flight.dispatchPlan?.approval) {
    drawLine('--- Departure Sign-off ---', 13, rgb(0.1, 0.5, 0.2));
    drawLine(`Token: ${flight.dispatchPlan.approval.id}`, 11);
    drawLine(`Approved At: ${flight.dispatchPlan.approval.approvedAt.toISOString()}`, 11);
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
