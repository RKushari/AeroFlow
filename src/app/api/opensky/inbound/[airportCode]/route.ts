import { NextRequest, NextResponse } from 'next/server';
import { openSky } from '@/lib/services/opensky';
import { getDistanceInMeters, calculateETA } from '@/lib/utils/geo';
import { handleApiError } from '../../utils';

// Mock DB of airport coordinates for ETA calculations
const airportCoords: Record<string, { lat: number, lon: number }> = {
  'EDDF': { lat: 50.0333, lon: 8.5705 },
  'JFK': { lat: 40.6413, lon: -73.7781 }
};

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ airportCode: string }> }
) {
  try {
    const { airportCode } = await params;
    const coords = airportCoords[airportCode.toUpperCase()];
    
    if (!coords) {
      return NextResponse.json({ error: 'Airport coordinates not configured for ETA calculation.' }, { status: 400 });
    }

    const offset = 2.0; // approx 200km bounding box
    const bbox = {
      lamin: coords.lat - offset, lamax: coords.lat + offset,
      lomin: coords.lon - offset, lomax: coords.lon + offset
    };

    const localStates = await openSky.getStates(bbox);
    
    const inboundFlights = localStates
      .filter(flight => !flight.onGround && flight.latitude && flight.longitude)
      .map(flight => {
        const distance = getDistanceInMeters(
          flight.latitude!, flight.longitude!, coords.lat, coords.lon
        );
        const eta = calculateETA(distance, flight.velocity || 0);
        return {
          icao24: flight.icao24,
          callsign: flight.callsign,
          position: { lat: flight.latitude, lon: flight.longitude },
          altitude: flight.baroAltitude,
          velocity: flight.velocity,
          distanceMeters: Math.round(distance),
          estimatedArrivalUnix: eta
        };
      })
      .filter(flight => flight.distanceMeters < 150000); // Only return within 150km

    return NextResponse.json({ source: 'computed', data: inboundFlights });
  } catch (error: any) {
    return handleApiError(error);
  }
}
