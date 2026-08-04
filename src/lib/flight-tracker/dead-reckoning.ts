import destination from '@turf/destination';

export interface FlightState {
  icao24: string;
  callsign: string | null;
  originCountry: string;
  latitude: number | null;
  longitude: number | null;
  baroAltitude: number | null;
  velocity: number | null;
  onGround: boolean;
  trueTrack?: number;
  squawk?: string;
  verticalRate?: number;
  originAirport?: string;
  destinationAirport?: string;
  originCoords?: [number, number];
  destinationCoords?: [number, number];
}

export interface PredictedPosition {
  icao24: string;
  latitude: number;
  longitude: number;
}

const EARTH_RADIUS = 6371008.8; // meters

export class DeadReckoningEngine {
  private predictionStates: Map<string, {
    lastKnown: { lat: number; lon: number; time: number };
    lastPredicted: { lat: number; lon: number; time: number };
    velocity: number; // m/s
    bearing: number; // degrees
    verticalRate: number; // m/s
    altitude: number; // meters
  }> = new Map();

  public updateStates(flights: FlightState[]) {
    const activeKeys = new Set<string>();
    const now = Date.now() / 1000;

    for (const flight of flights) {
      if (flight.latitude == null || flight.longitude == null) continue;
      const key = flight.icao24;
      activeKeys.add(key);

      this.predictionStates.set(key, {
        lastKnown: { lat: flight.latitude, lon: flight.longitude, time: now },
        lastPredicted: { lat: flight.latitude, lon: flight.longitude, time: now },
        velocity: flight.velocity ?? 0,
        bearing: flight.trueTrack ?? 0,
        verticalRate: flight.verticalRate ?? 0,
        altitude: flight.baroAltitude ?? 0
      });
    }

    // Prune stale aircraft
    for (const existingKey of Array.from(this.predictionStates.keys())) {
      if (!activeKeys.has(existingKey)) {
        this.predictionStates.delete(existingKey);
      }
    }
  }

  public predictPositions(intervalMs: number = 300): PredictedPosition[] {
    const dt = intervalMs / 1000; // seconds
    const results: PredictedPosition[] = [];

    for (const [key, state] of Array.from(this.predictionStates.entries())) {
      const { lastPredicted, velocity, bearing, verticalRate, altitude } = state;

      if (velocity <= 0 || state.lastKnown.lat == null) {
        results.push({ icao24: key, latitude: lastPredicted.lat, longitude: lastPredicted.lon });
        continue;
      }

      const origin: [number, number] = [lastPredicted.lon, lastPredicted.lat];
      let distance = velocity * dt;

      if (verticalRate !== 0) {
        distance -= verticalRate * dt;
      }
      if (altitude > 0) {
        distance = (distance * EARTH_RADIUS) / (EARTH_RADIUS + altitude);
      }

      try {
        const point = destination(origin, distance, bearing, { units: 'meters' });
        const newLon = point.geometry.coordinates[0];
        const newLat = point.geometry.coordinates[1];

        this.predictionStates.set(key, {
          ...state,
          lastPredicted: {
            lat: newLat,
            lon: newLon,
            time: lastPredicted.time + dt
          }
        });

        results.push({ icao24: key, latitude: newLat, longitude: newLon });
      } catch {
        results.push({ icao24: key, latitude: lastPredicted.lat, longitude: lastPredicted.lon });
      }
    }

    return results;
  }
}
