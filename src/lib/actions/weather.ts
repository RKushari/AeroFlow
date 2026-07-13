'use server';

import { db } from "../db";
import { requireRole } from "../auth";
import { fetchWeatherSeverity } from "../services/weather";
import { calculateRisk } from "../risk";
import { revalidatePath } from "next/cache";

// Simple in-memory cache for rate-limiting weather fetches (15 seconds)
const lastFetchCache = new Map<string, number>();

export async function refreshFlightWeather(flightId: string) {
  await requireRole(["FLIGHT_DISPATCHER", "OPERATIONS_DIRECTOR"]);

  const now = Date.now();
  const lastFetch = lastFetchCache.get(flightId);
  if (lastFetch && now - lastFetch < 15000) {
    const secondsLeft = Math.ceil((15000 - (now - lastFetch)) / 1000);
    throw new Error(`Rate limit exceeded: Please wait ${secondsLeft}s before refreshing again.`);
  }

  const flight = await db.flights.findUnique({
    where: { id: flightId },
    include: { route: true },
  });

  if (!flight) {
    throw new Error("Flight not found.");
  }

  // Fetch new weather details using our OpenWeatherMap service
  const { severityIndex, rawData } = await fetchWeatherSeverity(flight.route.destinationId);

  // Update in database and trigger recalculation within transaction
  const result = await db.$transaction(async (tx) => {
    const weatherRecord = await tx.weatherRecords.create({
      data: {
        flightId,
        severityIndex,
        rawData: rawData as any,
      },
    });

    // Downstream risk coefficient calculation is triggered
    await calculateRisk(flightId, tx);

    return weatherRecord;
  });

  // Update rate limit cache
  lastFetchCache.set(flightId, now);

  revalidatePath(`/dispatcher/flight/${flightId}`);
  revalidatePath(`/dispatcher/dashboard`);
  
  return { success: true, severityIndex: result.severityIndex };
}
