import { db } from "../db";
import { globalAirports } from "../data/airports";

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
  // OpenMeteo does not require an API key for basic usage
  // Look up airport profile if it exists
  const airport = await db.airportProfiles.findUnique({
    where: { code: airportCode },
  });

  const queryLoc = airport?.weatherStationId || airportCode;
  
  let lat = 52.52; // Default fallback (Berlin as per .ENV)
  let lon = 13.41;

  // Use globalAirports to bypass Geocoding API rate limits/timeouts
  const ap = globalAirports.find(a => a.code === queryLoc);

  if (ap) {
    lat = ap.lat;
    lon = ap.lng;
  } else if (queryLoc.includes(",")) {
    const [latStr, lonStr] = queryLoc.split(",");
    lat = parseFloat(latStr.trim());
    lon = parseFloat(lonStr.trim());
  } else {
    try {
      const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(queryLoc)}&count=1`, { signal: AbortSignal.timeout(3000) });
      if (geoRes.ok) {
         const geoData = await geoRes.json();
         if (geoData.results && geoData.results.length > 0) {
            lat = geoData.results[0].latitude;
            lon = geoData.results[0].longitude;
         }
      }
    } catch (e) {
      console.warn("Geocoding failed, using default coordinates", e);
    }
  }

  // Use OpenMeteo to get current temperature, wind speed and hourly forecast
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,wind_speed_10m&hourly=temperature_2m,wind_speed_10m&wind_speed_unit=ms`;

  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`OpenMeteo API error: ${res.status} ${res.statusText} - ${errorText}`);
  }

  const weatherData = await res.json();
  const windSpeed = weatherData.current?.wind_speed_10m ?? 0;
  const temperature = weatherData.current?.temperature_2m ?? 0;
  const description = `Temp: ${temperature}°C`;

  // Continuous wind factor
  let windFactor = 0.1;
  if (windSpeed >= 5 && windSpeed <= 30) {
    windFactor = 0.1 + ((windSpeed - 5) / 25) * 0.9;
  } else if (windSpeed > 30) {
    windFactor = 1.0;
  }

  // Continuous temperature factor
  let tempFactor = 0.0;
  if (temperature < -10) tempFactor = 1.0;
  else if (temperature < 0) tempFactor = (0 - temperature) / 10;
  else if (temperature > 40) tempFactor = 1.0;
  else if (temperature > 30) tempFactor = (temperature - 30) / 10;

  // Combined severity
  let severityIndex = Math.min(1.0, (windFactor * 0.7) + (tempFactor * 0.3));
  severityIndex = Math.max(0.1, severityIndex);

  return {
    rawConditions: `Wind ${windSpeed} m/s, ${description}`,
    severityIndex,
    rawData: weatherData,
  };
}
