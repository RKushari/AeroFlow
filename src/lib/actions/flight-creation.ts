'use server';

import { db } from "../db";
import { requireRole } from "../auth";
import { validateFlightDetails } from "../aviation-edge";
import { logAudit } from "../audit/ledger";
import { FlightStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { getAirportByIata } from "../data/airports";

export interface AirportLookupResult {
  code: string;
  name: string;
  city: string;
  country: string;
  icao: string;
}

export async function lookupAirport(iata: string): Promise<AirportLookupResult | null> {
  if (!iata || iata.length !== 3) return null;
  const airport = getAirportByIata(iata.toUpperCase());
  if (!airport) return null;
  return {
    code: airport.code,
    name: airport.name,
    city: airport.city,
    country: airport.country,
    icao: airport.icao,
  };
}

export interface CreateFlightInput {
  flightNumber: string;
  originIata: string;
  destinationIata: string;
  aircraftReg: string;
  departureTime: string;
}

export async function createFlightPlan(input: CreateFlightInput) {
  // Restrict to FLIGHT_DISPATCHER and OPERATIONS_DIRECTOR
  const session = await requireRole(["FLIGHT_DISPATCHER", "OPERATIONS_DIRECTOR"]);
  const userId = session.user.id;

  const { flightNumber, originIata, destinationIata, aircraftReg, departureTime } = input;

  if (!flightNumber || !originIata || !destinationIata || !aircraftReg || !departureTime) {
    throw new Error("Missing required flight details.");
  }

  // 1. Validate codes and aircraft registration with Aviation Edge
  const validation = await validateFlightDetails(originIata, destinationIata, aircraftReg);
  if (!validation.isValid) {
    throw new Error(validation.error || "Aviation Edge validation failed.");
  }

  // 2. Perform database updates in a transaction
  const flight = await db.$transaction(async (tx) => {
    // Ensure origin airport profile exists
    await tx.airportProfiles.upsert({
      where: { code: originIata },
      update: {},
      create: { code: originIata, weatherStationId: originIata },
    });

    // Ensure destination airport profile exists
    await tx.airportProfiles.upsert({
      where: { code: destinationIata },
      update: {},
      create: { code: destinationIata, weatherStationId: destinationIata },
    });

    // Find or create route profile
    let route = await tx.routeProfiles.findFirst({
      where: { originId: originIata, destinationId: destinationIata },
    });

    if (!route) {
      route = await tx.routeProfiles.create({
        data: {
          originId: originIata,
          destinationId: destinationIata,
          baseRisk: 0.1,
        },
      });
    }

    // Create the flight in Pending state (SCHEDULED)
    const newFlight = await tx.flights.create({
      data: {
        flightNumber,
        status: FlightStatus.SCHEDULED, // SCHEDULED serves as Pending state
        routeId: route.id,
      },
    });

    // Create default flight checklist
    const checklist = await tx.flightChecklists.create({
      data: {
        flightId: newFlight.id,
        isComplete: false,
      },
    });

    // Create default checklist items (mandatory & optional)
    const defaultTasks = [
      { task: "Pre-flight Walkaround Check", isMandatory: true },
      { task: "Fuel Load Verification", isMandatory: true },
      { task: "Cabin Security Inspection", isMandatory: true },
      { task: "Avionics and Flight Instruments System Check", isMandatory: true },
      { task: "Catering and Baggage Loading Check", isMandatory: false },
    ];

    await tx.checklistItems.createMany({
      data: defaultTasks.map((t) => ({
        checklistId: checklist.id,
        task: t.task,
        isMandatory: t.isMandatory,
        isComplete: false,
      })),
    });

    // Create empty dispatch plan for this flight
    await tx.dispatchPlans.create({
      data: {
        flightId: newFlight.id,
      },
    });

    // Log to Audit Ledger
    await logAudit(
      userId,
      "CREATE_FLIGHT_PLAN",
      newFlight.id,
      null,
      { flightNumber, originIata, destinationIata, aircraftReg, departureTime },
      tx
    );

    return newFlight;
  });

  revalidatePath("/dispatcher/dashboard");
  return { success: true, flightId: flight.id };
}
