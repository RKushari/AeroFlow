import { NextRequest, NextResponse } from 'next/server';
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

interface StateVector {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  timePosition: number | null;
  lastContact: number;
  longitude: number | null;
  latitude: number | null;
  baroAltitude: number | null;
  onGround: boolean;
  velocity: number | null;
  trueTrack: number | null;
  verticalRate: number | null;
  sensors: number[] | null;
  geoAltitude: number | null;
  squawk: string | null;
  spi: boolean;
  positionSource: number;
  category: number;
}

function parseStateVector(v: any[]): StateVector {
  return {
    icao24: v[0],
    callsign: v[1] ? String(v[1]).trim() : null,
    originCountry: v[2],
    timePosition: v[3],
    lastContact: v[4],
    longitude: v[5],
    latitude: v[6],
    baroAltitude: v[7],
    onGround: v[8],
    velocity: v[9],
    trueTrack: v[10],
    verticalRate: v[11],
    sensors: v[12],
    geoAltitude: v[13],
    squawk: v[14],
    spi: v[15],
    positionSource: v[16],
    category: v[17],
  };
}

function enrichStates(states: StateVector[]) {
  return states.map((s, i) => {
    const origIdx = i % MAJOR_AIRPORTS.length;
    const destIdx = (i + 4) % MAJOR_AIRPORTS.length;
    return {
      ...s,
      originAirport: MAJOR_AIRPORTS[origIdx].code,
      destinationAirport: MAJOR_AIRPORTS[destIdx].code,
      originCoords: MAJOR_AIRPORTS[origIdx].coords,
      destinationCoords: MAJOR_AIRPORTS[destIdx].coords,
    };
  });
}

function generateMockData() {
  return Array.from({ length: 300 }).map((_, i) => {
    const origIdx = i % MAJOR_AIRPORTS.length;
    const destIdx = (i + 4) % MAJOR_AIRPORTS.length;
    const orig = MAJOR_AIRPORTS[origIdx];
    const dest = MAJOR_AIRPORTS[destIdx];

    const isOnGround = i % 7 === 0;
    const progress = isOnGround ? 0.05 : (0.2 + (i % 7) * 0.1);
    const lon = orig.coords[0] + (dest.coords[0] - orig.coords[0]) * progress;
    const lat = orig.coords[1] + (dest.coords[1] - orig.coords[1]) * progress;

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
      destinationCoords: dest.coords,
    };
  });
}

// ============================================================
// OAuth2 Token Cache
// OpenSky retired Basic auth in March 2026 and now requires
// OAuth2 client credentials flow. We cache the token in memory.
// ============================================================
const OPENSKY_TOKEN_URL = 'https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token';

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

async function getOAuth2Token(clientId: string, clientSecret: string): Promise<string | null> {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60000) {
    return cachedToken.accessToken;
  }

  try {
    const body = new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });

    const res = await fetch(OPENSKY_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[OPENSKY_AUTH] Token request failed: ${res.status} ${errText}`);
      return null;
    }

    const data = await res.json();
    cachedToken = {
      accessToken: data.access_token,
      expiresAt: Date.now() + (data.expires_in || 1800) * 1000,
    };
    console.log(`[OPENSKY_AUTH] Got OAuth2 token, expires in ${data.expires_in}s`);
    return cachedToken.accessToken;
  } catch (err: any) {
    console.error('[OPENSKY_AUTH] Token exchange error:', err.message);
    return null;
  }
}

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const lamin = searchParams.get('lamin');
    const lomin = searchParams.get('lomin');
    const lamax = searchParams.get('lamax');
    const lomax = searchParams.get('lomax');

    // Default bounding box: North America
    const bbox = {
      lamin: lamin ? parseFloat(lamin) : 24.396308,
      lomin: lomin ? parseFloat(lomin) : -125.0,
      lamax: lamax ? parseFloat(lamax) : 49.384358,
      lomax: lomax ? parseFloat(lomax) : -66.93457,
    };

    const openSkyParams = new URLSearchParams({
      lamin: bbox.lamin.toString(),
      lomin: bbox.lomin.toString(),
      lamax: bbox.lamax.toString(),
      lomax: bbox.lomax.toString(),
    });
    const openSkyUrl = `https://opensky-network.org/api/states/all?${openSkyParams}`;

    // Build auth headers using OAuth2 Bearer token
    const headers: Record<string, string> = {
      'User-Agent': 'AeroFlow-Telemetry-App/1.0',
      'Accept': 'application/json',
    };

    // Try primary credentials first
    const primaryClientId = process.env.OPENSKY_CLIENT_ID;
    const primaryClientSecret = process.env.OPENSKY_CLIENT_SECRET;
    if (primaryClientId && primaryClientSecret) {
      const token = await getOAuth2Token(primaryClientId, primaryClientSecret);
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
    }

    let upstreamRes = await fetch(openSkyUrl, {
      headers,
      next: { revalidate: 45 },
      signal: AbortSignal.timeout(10000),
    });

    // If primary fails, try backup credentials with a fresh token
    if (!upstreamRes.ok && (upstreamRes.status === 429 || upstreamRes.status === 401 || upstreamRes.status === 403)) {
      console.warn(`[OPENSKY] Primary failed with ${upstreamRes.status}, trying backup...`);
      
      const backupClientId = process.env.OPENSKY_BACKUP_CLIENT_ID;
      const backupClientSecret = process.env.OPENSKY_BACKUP_CLIENT_SECRET;
      if (backupClientId && backupClientSecret) {
        // Force a fresh token for backup credentials
        cachedToken = null;
        const backupToken = await getOAuth2Token(backupClientId, backupClientSecret);
        if (backupToken) {
          headers['Authorization'] = `Bearer ${backupToken}`;
          upstreamRes = await fetch(openSkyUrl, {
            headers,
            next: { revalidate: 45 },
            signal: AbortSignal.timeout(10000),
          });
        }
      }
    }

    if (!upstreamRes.ok) {
      const errorText = await upstreamRes.text().catch(() => 'No body');
      console.error(`[OPENSKY_ERROR] Status: ${upstreamRes.status} ${upstreamRes.statusText}`);
      console.error(`[OPENSKY_ERROR] Body: ${errorText}`);
      throw new Error(`OpenSky returned ${upstreamRes.status}: ${errorText}`);
    }

    const data = await upstreamRes.json();

    if (!data || !data.states || data.states.length === 0) {
      throw new Error('No live telemetry data available');
    }

    const states = data.states.map((v: any[]) => parseStateVector(v));
    const enriched = enrichStates(states);

    const response = NextResponse.json({
      source: 'live',
      data: enriched,
      creditsRemaining: null,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=45, stale-while-revalidate=300');
    return response;

  } catch (error: any) {
    console.error('OpenSky fetch failed, falling back to mock:', error.message);

    const mockData = generateMockData();
    const response = NextResponse.json({
      source: 'mock',
      data: mockData,
      creditsRemaining: 0,
      debugError: error.message,
    });
    response.headers.set('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60');
    return response;
  }
}

