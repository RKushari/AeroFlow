'use server';

import { db } from "../db";
import { openSky } from "../services/opensky";
import { FlightStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function syncLiveToInternal() {
  try {
    // 1. Fetch live flights from OpenSky
    const states = await openSky.getStates();
    
    // Filter airborne flights with valid callsigns and coordinates
    const validFlights = states.filter(s => 
      !s.onGround && 
      s.callsign && 
      s.callsign.trim().length > 0 &&
      s.latitude !== null && 
      s.longitude !== null
    );

    if (validFlights.length === 0) {
      return { success: false, error: 'No valid flights found.' };
    }

    // 2. Select up to 10 random flights
    const shuffled = validFlights.sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 10);

    let syncedCount = 0;

    for (const flight of selected) {
      const callsign = flight.callsign!.trim();
      
      // Check if flight already exists
      const existing = await db.flights.findFirst({
        where: { flightNumber: callsign }
      });

      if (!existing) {
        // Create dummy origin and destination profiles if needed
        const originId = 'UNK';
        const destinationId = 'UNK';

        // Upsert route
        let route = await db.routeProfiles.findFirst({
          where: { originId, destinationId }
        });

        if (!route) {
          route = await db.routeProfiles.create({
            data: {
              originId,
              destinationId,
              baseRisk: 0.1
            }
          });
        }

        // Create the flight
        const newFlight = await db.flights.create({
          data: {
            flightNumber: callsign,
            status: FlightStatus.DEPARTED, // Represents AIR for us since 'AIR' isn't in FlightStatus
            routeId: route.id,
          }
        });

        // Initialize checklist and dispatch plan
        await db.flightChecklists.create({
          data: { flightId: newFlight.id, isComplete: true }
        });

        await db.dispatchPlans.create({
          data: { flightId: newFlight.id }
        });

        syncedCount++;
      }
    }

    revalidatePath("/flights");
    revalidatePath("/dispatcher/dashboard");

    return { success: true, count: syncedCount };
  } catch (error: any) {
    console.error("Failed to sync flights:", error);
    return { success: false, error: error.message };
  }
}
