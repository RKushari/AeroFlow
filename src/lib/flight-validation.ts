import { openSky } from "./services/opensky";
import { getAirportByIata, type AirportRecord } from "./data/airports";

export interface AirportValidationInfo {
  iata: string;
  icao: string;
  name: string;
  city: string;
  country: string;
}

export interface AircraftValidation {
  registration: string;
  countryOfRegistration?: string;
  callsign?: string;
  icao24?: string;
  originCountry?: string;
  isLiveCorroborated: boolean;
}

export interface FlightValidationResult {
  isValid: boolean;
  error?: string;
  source: "local-airport-db" | "opensky-live";
  origin?: AirportValidationInfo;
  destination?: AirportValidationInfo;
  aircraft?: AircraftValidation;
}

interface RegistrationRule {
  test: RegExp;
  country: string;
}

const REGISTRATION_RULES: RegistrationRule[] = [
  { test: /^N[0-9]{1,5}[A-Z]{0,2}$/, country: "United States" },
  { test: /^G-[A-Z0-9]{1,4}$/, country: "United Kingdom" },
  { test: /^D-[A-Z0-9]{1,4}$/, country: "Germany" },
  { test: /^F-[A-Z0-9]{1,4}$/, country: "France" },
  { test: /^C-[A-Z0-9]{1,4}$/, country: "Canada" },
  { test: /^VH-[A-Z0-9]{1,3}$/, country: "Australia" },
  { test: /^JA[0-9]{2,4}$/, country: "Japan" },
  { test: /^EI-[A-Z0-9]{1,4}$/, country: "Ireland" },
  { test: /^PH-[A-Z0-9]{1,4}$/, country: "Netherlands" },
  { test: /^HB-[A-Z0-9]{1,4}$/, country: "Switzerland" },
  { test: /^I-[A-Z0-9]{1,4}$/, country: "Italy" },
  { test: /^RA-[0-9]{1,5}$/, country: "Russia" },
  { test: /^P[PRTU]-[A-Z0-9]{1,4}$/, country: "Brazil" },
  { test: /^VT-[A-Z0-9]{1,4}$/, country: "India" },
  { test: /^A6-[A-Z0-9]{1,4}$/, country: "United Arab Emirates" },
  { test: /^9V-[A-Z0-9]{1,4}$/, country: "Singapore" },
  { test: /^B-[0-9]{1,5}$/, country: "China" },
];

const GENERAL_REGISTRATION = /^[A-Z][A-Z0-9-]{0,5}[A-Z0-9]$/;

export function validateAircraftRegistration(reg: string): {
  valid: boolean;
  reason?: string;
  country?: string;
} {
  const normalized = (reg || "").trim().toUpperCase();
  if (normalized.length < 2 || normalized.length > 10) {
    return { valid: false, reason: "Aircraft registration must be 2–10 characters." };
  }

  const match = REGISTRATION_RULES.find((rule) => rule.test.test(normalized));
  if (match) {
    return { valid: true, country: match.country };
  }
  if (GENERAL_REGISTRATION.test(normalized)) {
    return { valid: true };
  }

  return {
    valid: false,
    reason: `"${reg}" does not match a valid aircraft registration format (e.g. N789AA, G-ABCD, D-AABC).`,
  };
}

function clampBbox(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildRouteBbox(
  origin?: AirportRecord,
  destination?: AirportRecord
): { lamin: number; lamax: number; lomin: number; lomax: number } | null {
  const points = [origin, destination].filter((p): p is AirportRecord => Boolean(p));
  if (points.length === 0) return null;

  const pad = 3;
  const lats = points.map((p) => p.lat);
  const lngs = points.map((p) => p.lng);

  return {
    lamin: clampBbox(Math.min(...lats) - pad, -90, 90),
    lamax: clampBbox(Math.max(...lats) + pad, -90, 90),
    lomin: clampBbox(Math.min(...lngs) - pad, -180, 180),
    lomax: clampBbox(Math.max(...lngs) + pad, -180, 180),
  };
}

async function corroborateLive(
  callsign: string,
  origin?: AirportRecord,
  destination?: AirportRecord
): Promise<{ callsign: string; icao24: string; originCountry: string } | null> {
  const normalized = (callsign || "").trim().replace(/\s/g, "").toUpperCase();
  if (!normalized || normalized === "UNKNOWN") return null;

  const bbox = buildRouteBbox(origin, destination);
  if (!bbox) return null;

  try {
    const states = await openSky.getStates(bbox);
    const match = states.find(
      (s) => s.callsign && s.callsign.trim().replace(/\s/g, "").toUpperCase() === normalized
    );
    if (!match || !match.callsign) return null;
    return {
      callsign: match.callsign.trim(),
      icao24: match.icao24,
      originCountry: match.originCountry,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn("OpenSky live corroboration unavailable, degrading to static validation:", message);
    return null;
  }
}

function toAirportInfo(a: AirportRecord): AirportValidationInfo {
  return { iata: a.code, icao: a.icao, name: a.name, city: a.city, country: a.country };
}

export async function validateFlightDetails(
  originIata: string,
  destinationIata: string,
  aircraftReg: string,
  flightNumber?: string
): Promise<FlightValidationResult> {
  const origin = getAirportByIata((originIata || "").trim().toUpperCase());
  if (!origin) {
    return { isValid: false, error: `Invalid Origin IATA code: ${originIata}`, source: "local-airport-db" };
  }

  const destination = getAirportByIata((destinationIata || "").trim().toUpperCase());
  if (!destination) {
    return { isValid: false, error: `Invalid Destination IATA code: ${destinationIata}`, source: "local-airport-db" };
  }

  const registration = validateAircraftRegistration(aircraftReg);
  if (!registration.valid) {
    return { isValid: false, error: registration.reason, source: "local-airport-db" };
  }

  const aircraft: AircraftValidation = {
    registration: aircraftReg.trim().toUpperCase(),
    countryOfRegistration: registration.country,
    callsign: (flightNumber || "").trim().toUpperCase() || undefined,
    isLiveCorroborated: false,
  };

  let source: FlightValidationResult["source"] = "local-airport-db";
  const live = await corroborateLive(flightNumber || "", origin, destination);
  if (live) {
    source = "opensky-live";
    aircraft.callsign = live.callsign;
    aircraft.icao24 = live.icao24;
    aircraft.originCountry = live.originCountry;
    aircraft.isLiveCorroborated = true;
  }

  return {
    isValid: true,
    source,
    origin: toAirportInfo(origin),
    destination: toAirportInfo(destination),
    aircraft,
  };
}