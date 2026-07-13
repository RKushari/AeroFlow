import { db } from "../db";

/**
 * Fetches real-time weather details from OpenWeatherMap for a given airport code.
 * If the airport profile has a "lat,lon" coordinate in weatherStationId, uses coordinates;
 * otherwise, falls back to querying by airport code / name.
 */
export async function fetchWeatherSeverity(airportCode: string): Promise<{ 
  rawConditions: string; 
  severityIndex: number; 
  rawData: any; 
}> {
  const apiKey = process.env.OPENWEATHER_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENWEATHER_API_KEY environment variable.");
  }

  // Look up airport profile if it exists
  const airport = await db.airportProfiles.findUnique({
    where: { code: airportCode },
  });

  const queryLoc = airport?.weatherStationId || airportCode;
  let url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(queryLoc)}&appid=${apiKey}`;

  if (queryLoc.includes(",")) {
    const [lat, lon] = queryLoc.split(",");
    url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat.trim()}&lon=${lon.trim()}&appid=${apiKey}`;
  }

  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenWeather API error: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const weatherData = await res.json();
  const windSpeed = weatherData.wind?.speed ?? 0;
  const description = weatherData.weather?.[0]?.description ?? "Clear";

  // Compute severity index based on wind speed
  let severityIndex = 0.1;
  if (windSpeed > 10) severityIndex = 0.4; // > 10 m/s (~19 knots)
  if (windSpeed > 20) severityIndex = 0.8; // > 20 m/s (~39 knots)
  if (windSpeed > 30) severityIndex = 1.0; // > 30 m/s (~58 knots)

  return {
    rawConditions: `Wind ${windSpeed} m/s, ${description}`,
    severityIndex,
    rawData: weatherData,
  };
}
