'use server';

import { db } from './db';
import { requireRole } from './auth';
import { AiBriefingSchema } from './validations';

export async function generateAiBriefing(flightId: string) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  
  const flight = await db.flights.findUnique({
    where: { id: flightId },
    include: { risk: true, incidents: true, weather: { take: 1, orderBy: { id: 'desc' } } }
  });

  if (!flight) throw new Error('Flight not found');

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY environment variable");

  const promptContext = `
    Flight: ${flight.flightNumber}
    Risk Score: ${flight.risk?.totalScore ?? 'N/A'}
    Weather Severity: ${flight.weather[0]?.severityIndex ?? 'N/A'}
    Incidents: ${flight.incidents.length} active incidents.
    Please generate a safety briefing for ground crews emphasizing checklist completion.
  `;

  let draftContent = "[AI GENERATION FAILED]";
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: "You are an aviation safety AI." }, { role: "user", content: promptContext }],
        temperature: 0.3
      }),
      signal: controller.signal
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`LLM API Error: ${await response.text()}`);
    }

    const responseData = await response.json();
    const rawContent = responseData.choices?.[0]?.message?.content;
    
    if (rawContent) {
      draftContent = `[AI GENERATED DRAFT - PENDING APPROVAL]\n\n${rawContent}`;
    }
  } catch (error) {
    clearTimeout(timeout);
    console.error("AI Generation Error:", error);
    draftContent = "[AI GENERATION FAILED] Network or API error occurred. Please write manually.";
  }

  const briefing = await db.safetyBriefings.upsert({
    where: { flightId },
    create: {
      flightId,
      draftContent,
    },
    update: {
      draftContent,
    }
  });

  return briefing;
}

export async function approveBriefing(data: any) {
  const session = await requireRole(['FLIGHT_DISPATCHER', 'OPERATIONS_DIRECTOR']);
  const parsed = AiBriefingSchema.parse(data);

  return await db.safetyBriefings.update({
    where: { flightId: parsed.flightId },
    data: {
      finalContent: parsed.finalContent,
      isApproved: true,
    }
  });
}
