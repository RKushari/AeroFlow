export async function generateDraftBriefing(flightData: any, weatherData: any, riskFactors: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    return `DRAFT BRIEFING (Fallback):
Flight ${flightData.flightNumber} from ${flightData.departureAirportId} to ${flightData.arrivalAirportId}.
Weather Conditions: ${weatherData.rawConditions}
Risk Factors Identified: ${riskFactors}
Please review crew fatigue and mechanical logs before departure.`;
  }

  const prompt = `You are an aviation safety assistant. Generate a short, strict safety briefing draft for the flight dispatcher based on the following data:
Flight: ${flightData.flightNumber} from ${flightData.departureAirportId} to ${flightData.arrivalAirportId}.
Weather Conditions: ${weatherData.rawConditions}
Risk Factors Identified: ${riskFactors}
Emphasize crew fatigue and mechanical logs. Output only the text of the briefing.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
      signal: AbortSignal.timeout(10000)
    });

    if (!res.ok) {
      throw new Error(`Gemini API error: ${await res.text()}`);
    }

    const data = await res.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error("Gemini API Error:", error);
    return `[AI GENERATION FAILED] Fallback:
Flight ${flightData.flightNumber} from ${flightData.departureAirportId} to ${flightData.arrivalAirportId}.
Weather Conditions: ${weatherData.rawConditions}
Risk Factors Identified: ${riskFactors}`;
  }
}
