'use server';

import { db } from "../db";
import { openSky } from "../services/opensky";
import { FlightStatus } from "@prisma/client";
import { updateMonitoredFlights, getMonitoredFlightIds } from "./risk-analytics";
import { getAirportByIcao, getAirportByIata, globalAirports } from "../data/airports";

export async function getFlightsByAirport(airportIcao: string) {
  if (!airportIcao) return [];
  try {
    const airport = getAirportByIcao(airportIcao);
    if (!airport) return [];
    
    const diff = 0.45;
    const bbox = {
      lamin: airport.lat - diff,
      lamax: airport.lat + diff,
      lomin: airport.lng - diff,
      lomax: airport.lng + diff
    };

    const states = await openSky.getStates(bbox);
    
    return states.map(f => ({
      icao24: f.icao24,
      callsign: f.callsign ? f.callsign.trim() : 'UNKNOWN',
      // We know these are near the selected airport — use it as the "near" airport
      nearAirportIcao: airportIcao,
      nearAirportIata: airport.code,
      nearAirportName: airport.name,
      firstSeen: f.timePosition,
      lastSeen: f.lastContact,
      velocity: f.velocity,
      altitude: f.baroAltitude,
      originCountry: f.originCountry,
    })).sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0));
  } catch (e) {
    console.error('OpenSky Airport Fetch error', e);
    return [];
  }
}

export async function searchLiveFlight(query: string) {
  if (!query) return null;
  const q = query.trim().toUpperCase();
  try {
    const states = await openSky.getStates();
    const flight = states.find(s => 
      (s.callsign && s.callsign.trim().toUpperCase() === q) || 
      (s.icao24 && s.icao24.toUpperCase() === q)
    );
    if (!flight) return null;
    return {
      icao24: flight.icao24,
      callsign: flight.callsign ? flight.callsign.trim() : 'UNKNOWN',
      originCountry: flight.originCountry,
      longitude: flight.longitude,
      latitude: flight.latitude,
      velocity: flight.velocity,
      onGround: flight.onGround,
    };
  } catch (e) {
    console.error('OpenSky Live Search error', e);
    return null;
  }
}

/**
 * Resolves an airport identifier (ICAO or IATA) to IATA code.
 * Falls back to the raw string if not found.
 */
function resolveToIata(code: string): string {
  if (!code || code === 'UNK') return 'UNK';
  // Try direct IATA match first
  const byIata = getAirportByIata(code);
  if (byIata) return byIata.code;
  // Try ICAO match
  const byIcao = getAirportByIcao(code);
  if (byIcao) return byIcao.code;
  return code;
}

export async function enrollFlight(
  callsign: string,
  estDepartureAirport: string = 'UNK',
  estArrivalAirport: string = 'UNK'
) {
  if (!callsign || callsign === 'UNKNOWN') {
    return { success: false, error: 'Valid callsign required to enroll flight' };
  }
  
  // Resolve to IATA codes for better display
  const originIata = resolveToIata(estDepartureAirport);
  const destIata = resolveToIata(estArrivalAirport);

  let flight = await db.flights.findFirst({ where: { flightNumber: callsign } });
  
  if (!flight) {
    let route = await db.routeProfiles.findFirst({
      where: { originId: originIata, destinationId: destIata }
    });

    if (!route) {
      route = await db.routeProfiles.create({
        data: { originId: originIata, destinationId: destIata, baseRisk: 0.1 }
      });
    }

    flight = await db.flights.create({
      data: {
        flightNumber: callsign,
        status: FlightStatus.DEPARTED,
        routeId: route.id,
      }
    });

    await db.flightChecklists.create({ data: { flightId: flight.id, isComplete: true } });
    await db.dispatchPlans.create({ data: { flightId: flight.id } });
  }

  // Fetch the full flight with route so the card can use it immediately
  const fullFlight = await db.flights.findUnique({
    where: { id: flight.id },
    include: { route: true }
  });

  let monitoredIds = await getMonitoredFlightIds() || [];
  if (!monitoredIds.includes(flight.id)) {
    monitoredIds.push(flight.id);
    await updateMonitoredFlights(monitoredIds);
  }

  return { success: true, flight: fullFlight ?? flight };
}

import { fetchWeatherSeverity } from "../services/weather";

export async function getWeatherForAirport(airportCode: string) {
  try {
    const res = await fetchWeatherSeverity(airportCode);
    return { success: true, conditions: res.rawConditions, severity: res.severityIndex };
  } catch (e) {
    console.error(`Failed to fetch weather for ${airportCode}`, e);
    return { success: false, error: String(e) };
  }
}


