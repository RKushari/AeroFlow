import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(req: Request) {
  const authHeader = req.headers.get('Authorization');
  
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  try {
    const activeFlights = await db.flights.findMany({
      where: { status: { in: ['SCHEDULED', 'BOARDING', 'HOLD'] } },
      include: { route: true }
    });

    for (const flight of activeFlights) {
      const apiKey = process.env.OPENWEATHER_API_KEY;
      if (!apiKey) throw new Error("Missing OPENWEATHER_API_KEY");

      try {
        const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=40.71&lon=-74.00&appid=${apiKey}`, {
          signal: AbortSignal.timeout(5000)
        });
        if (!res.ok) {
          console.error("OpenWeather API Error:", await res.text());
          continue;
        }

        const weatherData = await res.json();
      const windSpeed = weatherData.wind?.speed ?? 0;
      
      let severityIndex = 0.1;
      if (windSpeed > 20) severityIndex = 0.5;
      if (windSpeed > 40) severityIndex = 0.9;

      await db.weatherRecords.create({ 
        data: { 
          flightId: flight.id,
          severityIndex, 
          rawData: weatherData 
        } 
      });
      } catch (err) {
        console.error(`Weather fetch failed for flight ${flight.id}:`, err);
      }
    }
    
    return NextResponse.json({ success: true, message: `Weather data ingested for ${activeFlights.length} flights.` });
  } catch (error: any) {
    console.error("Cron Error", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
