import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchWeatherSeverity } from '@/lib/services/weather';

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
      try {
        const { severityIndex, rawData } = await fetchWeatherSeverity(flight.route.destinationId);

        await db.weatherRecords.create({ 
          data: { 
            flightId: flight.id,
            severityIndex, 
            rawData: rawData as any
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
