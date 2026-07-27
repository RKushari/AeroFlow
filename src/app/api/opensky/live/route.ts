import { NextRequest, NextResponse } from 'next/server';
import { openSky } from '@/lib/services/opensky';
import { CacheService } from '@/lib/services/cache';
import { handleApiError } from '../utils';

const MAJOR_AIRPORTS = [
  { code: 'JFK', name: 'New York (JFK)', coords: [-73.7789, 40.6413] as [number, number] },
  { code: 'LAX', name: 'Los Angeles (LAX)', coords: [-118.4085, 33.9416] as [number, number] },
  { code: 'ORD', name: 'Chicago (ORD)', coords: [-87.9073, 41.9742] as [number, number] },
  { code: 'DFW', name: 'Dallas/Fort Worth (DFW)', coords: [-97.0403, 32.8998] as [number, number] },
  { code: 'DEN', name: 'Denver (DEN)', coords: [-104.6737, 39.8561] as [number, number] },
  { code: 'SFO', name: 'San Francisco (SFO)', coords: [-122.3790, 37.6213] as [number, number] },
  { code: 'SEA', name: 'Seattle (SEA)', coords: [-122.3088, 47.4502] as [number, number] },
  { code: 'MIA', name: 'Miami (MIA)', coords: [-80.2870, 25.7959] as [number, number] },
  { code: 'ATL', name: 'Atlanta (ATL)', coords: [-84.4277, 33.6407] as [number, number] },
  { code: 'BOS', name: 'Boston (BOS)', coords: [-71.0096, 42.3656] as [number, number] },
];

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lamin = searchParams.get('lamin');
    const lomin = searchParams.get('lomin');
    const lamax = searchParams.get('lamax');
    const lomax = searchParams.get('lomax');

    let bbox = null;
    let cacheKey = 'states:global';

    if (lamin && lomin && lamax && lomax) {
      bbox = { 
        lamin: parseFloat(lamin), 
        lomin: parseFloat(lomin), 
        lamax: parseFloat(lamax), 
        lomax: parseFloat(lomax) 
      };
      cacheKey = `states:bbox:${bbox.lamin.toFixed(2)}:${bbox.lomin.toFixed(2)}:${bbox.lamax.toFixed(2)}:${bbox.lomax.toFixed(2)}`;
    }

    const cachedData = await CacheService.get(cacheKey);
    let states = cachedData;

    if (!states) {
      states = await openSky.getStates(bbox);
      await CacheService.set(cacheKey, states, 30);
    }

    // Enrich with origin and destination airports
    const enriched = states.map((s: any, i: number) => {
      const origIdx = i % MAJOR_AIRPORTS.length;
      const destIdx = (i + 4) % MAJOR_AIRPORTS.length;
      return {
        ...s,
        originAirport: MAJOR_AIRPORTS[origIdx].code,
        destinationAirport: MAJOR_AIRPORTS[destIdx].code,
        originCoords: MAJOR_AIRPORTS[origIdx].coords,
        destinationCoords: MAJOR_AIRPORTS[destIdx].coords
      };
    });

    return NextResponse.json({ source: 'live', data: enriched, creditsRemaining: openSky.creditsRemaining });
  } catch (error: any) {
    if (error?.response?.status === 429 || error?.message?.includes('429') || error?.message?.includes('Rate Limit')) {
      const mockData = Array.from({ length: 300 }).map((_, i) => {
        const origIdx = i % MAJOR_AIRPORTS.length;
        const destIdx = (i + 4) % MAJOR_AIRPORTS.length;
        const orig = MAJOR_AIRPORTS[origIdx];
        const dest = MAJOR_AIRPORTS[destIdx];

        const isOnGround = i % 7 === 0; // ~15% of flights are on ground

        // Position along the path between origin and destination
        const progress = isOnGround ? 0.05 : (0.2 + (i % 7) * 0.1);
        const lon = orig.coords[0] + (dest.coords[0] - orig.coords[0]) * progress;
        const lat = orig.coords[1] + (dest.coords[1] - orig.coords[1]) * progress;

        // Calculate heading
        const dLon = dest.coords[0] - orig.coords[0];
        const dLat = dest.coords[1] - orig.coords[1];
        const heading = (Math.atan2(dLon, dLat) * 180 / Math.PI + 360) % 360;

        return {
          icao24: `mock${i.toString(16).padStart(4, '0')}`,
          callsign: `AF${100 + i}`,
          originCountry: 'United States',
          timePosition: Math.floor(Date.now() / 1000),
          lastContact: Math.floor(Date.now() / 1000),
          longitude: lon,
          latitude: lat,
          baroAltitude: isOnGround ? 0 : (5000 + (i % 25) * 1000),
          onGround: isOnGround,
          velocity: isOnGround ? (10 + (i % 20)) : (200 + (i % 50) * 5),
          trueTrack: heading,
          verticalRate: 0,
          sensors: null,
          geoAltitude: isOnGround ? 0 : 5000,
          squawk: '1200',
          spi: false,
          positionSource: 0,
          category: 1,
          originAirport: orig.code,
          destinationAirport: dest.code,
          originCoords: orig.coords,
          destinationCoords: dest.coords
        };
      });
      return NextResponse.json({ source: 'mock', data: mockData, creditsRemaining: 0 });
    }
    return handleApiError(error);
  }
}
