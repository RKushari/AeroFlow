// Calculate distance using Haversine formula (returns meters)
export function getDistanceInMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Calculate ETA based on distance and velocity
export function calculateETA(distanceMeters: number, velocityMetersPerSecond: number): number | null {
  if (!velocityMetersPerSecond || velocityMetersPerSecond <= 0) return null;
  const secondsToArrival = distanceMeters / velocityMetersPerSecond;
  return Math.floor(Date.now() / 1000) + Math.floor(secondsToArrival);
}
