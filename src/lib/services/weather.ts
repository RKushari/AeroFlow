export async function fetchWeatherSeverity(airportCode: string): Promise<{ rawConditions: string; severityIndex: number }> {
  // In a real implementation, call OpenWeatherMap API
  // const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${airportCode}&appid=${process.env.OWM_API_KEY}`);
  // const data = await res.json();
  
  // Dummy logic for the blueprint
  console.log(`Fetching weather for ${airportCode}...`);
  return {
    rawConditions: 'Wind 15kts, Vis 10km, Light Rain',
    severityIndex: 0.3,
  };
}
