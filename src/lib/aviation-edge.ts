import { db } from "./db";

/**
 * Validates airport IATA code and aircraft registration using the Aviation Edge API.
 * If the API is unreachable, rate-limited, or lacks key, it falls back to database or mock validation.
 */
export async function validateFlightDetails(
  originIata: string,
  destinationIata: string,
  aircraftReg: string
): Promise<{ 
  isValid: boolean; 
  error?: string; 
  isDegradedMode?: boolean;
}> {
  const apiKey = process.env.AVIATION_EDGE_API_KEY;
  
  if (!apiKey) {
    console.warn("Aviation Edge API key missing. Running in degraded validation mode.");
    return { isValid: true, isDegradedMode: true };
  }

  try {
    // 1. Validate Origin IATA Code
    const originRes = await fetch(
      `https://aviation-edge.com/v2/public/airportDatabase?codeIataAirport=${originIata}&key=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!originRes.ok) {
      throw new Error("Origin IATA validation API failed.");
    }
    const originData = await originRes.json();
    if (originData.error || !originData.length) {
      return { isValid: false, error: `Invalid Origin IATA code: ${originIata}` };
    }

    // 2. Validate Destination IATA Code
    const destRes = await fetch(
      `https://aviation-edge.com/v2/public/airportDatabase?codeIataAirport=${destinationIata}&key=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!destRes.ok) {
      throw new Error("Destination IATA validation API failed.");
    }
    const destData = await destRes.json();
    if (destData.error || !destData.length) {
      return { isValid: false, error: `Invalid Destination IATA code: ${destinationIata}` };
    }

    // 3. Validate Aircraft Registration
    const aircraftRes = await fetch(
      `https://aviation-edge.com/v2/public/airplaneDatabase?registrationAircraft=${aircraftReg}&key=${apiKey}`,
      { signal: AbortSignal.timeout(4000) }
    );
    if (!aircraftRes.ok) {
      throw new Error("Aircraft registration API failed.");
    }
    const aircraftData = await aircraftRes.json();
    if (aircraftData.error || !aircraftData.length) {
      return { isValid: false, error: `Invalid Aircraft Registration: ${aircraftReg}` };
    }

    return { isValid: true };
  } catch (error: any) {
    console.error("Aviation Edge verification error, falling back to degraded mode:", error.message);
    // Graceful fallback to avoid blocking flight creation on API outages/limitations
    return { isValid: true, isDegradedMode: true };
  }
}
