import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { db } from './db';
import { FlightStatus } from '@prisma/client';

export async function generateFlightDossier(flightId: string) {
  const flight = await db.flights.findUnique({
    where: { id: flightId },
    include: {
      route: true,
      risk: true,
      weather: { orderBy: { id: 'desc' }, take: 1 },
      briefings: { where: { deletedAt: null, isApproved: true }, orderBy: { id: 'desc' }, take: 1 },
      checklists: { include: { items: true } },
      crewUsers: true,
      dispatchPlan: {
        include: { approval: { include: { dispatcher: true } } }
      }
    }
  });

  if (!flight) throw new Error('Flight not found');

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  let page = doc.addPage([600, 800]);
  let y = 750;
  const lineHeight = 18;
  const sectionGap = 10;

  const drawLine = (text: string, size = 12, color = rgb(0, 0, 0)) => {
    if (y < 50) {
      page = doc.addPage([600, 800]);
      y = 750;
    }
    page.drawText(text, { x: 50, y, size, font, color });
    y -= lineHeight;
  };

  const sanitize = (text: string) =>
    text.replace(/[^\x20-\x7E]/g, '?');

  // Title
  drawLine('AeroFlow Safety Dossier', 22);
  y -= sectionGap;

  // Flight Info
  drawLine(`Flight Number: ${flight.flightNumber}`, 14);
  drawLine(`Route: ${flight.route.originId} -> ${flight.route.destinationId}`, 14);
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
  if (flight.weather.length > 0) {
    drawLine('--- Weather ---', 13, rgb(0, 0, 0.8));
    drawLine(`Severity Index: ${flight.weather[0].severityIndex.toFixed(2)}`);
    y -= sectionGap;
  }

  // Crew
  if (flight.crewUsers.length > 0) {
    drawLine('--- Assigned Crew ---', 13, rgb(0, 0.5, 0));
    flight.crewUsers.forEach(u => {
      drawLine(`- ${sanitize(u.name)} (${u.role})`);
    });
    y -= sectionGap;
  }

  // Checklists
  if (flight.checklists.length > 0) {
    drawLine('--- Pre-Flight Checklists ---', 13, rgb(0.5, 0, 0.5));
    flight.checklists.forEach(cl => {
      cl.items.forEach(item => {
        const status = item.isComplete ? '[x]' : '[ ]';
        const mandatory = item.isMandatory ? ' [MANDATORY]' : '';
        drawLine(`  ${status} ${sanitize(item.task)}${mandatory}`);
      });
    });
    y -= sectionGap;
  }

  // Safety Briefing
  if (flight.briefings.length > 0) {
    drawLine('--- Approved Safety Briefing ---', 13, rgb(0, 0, 0.6));
    const briefingText = flight.briefings[0].finalContent || flight.briefings[0].draftContent || '';
    const words = sanitize(briefingText).split(' ');
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

  // Dispatch Approval
  if (flight.dispatchPlan?.approval) {
    drawLine('--- Dispatch Approval ---', 13, rgb(0, 0, 0.6));
    drawLine(`Dispatcher: ${sanitize(flight.dispatchPlan.approval.dispatcher.name)}`);
    drawLine(`Token: ${flight.dispatchPlan.approval.id}`);
    drawLine(`Approved At: ${flight.dispatchPlan.approval.approvedAt.toISOString()}`);
    y -= sectionGap;
  }

  // Dispatch Sign-off
  if (flight.status === FlightStatus.DEPARTED && flight.dispatchPlan?.approval) {
    drawLine('--- Departure Sign-off ---', 13, rgb(0, 0.5, 0));
    drawLine(`Dispatcher: ${sanitize(flight.dispatchPlan.approval.dispatcher.name)}`);
    drawLine(`Token: ${flight.dispatchPlan.approval.id}`);
    drawLine(`Approved At: ${flight.dispatchPlan.approval.approvedAt.toISOString()}`);
  }

  const pdfBytes = await doc.save();
  return pdfBytes;
}
