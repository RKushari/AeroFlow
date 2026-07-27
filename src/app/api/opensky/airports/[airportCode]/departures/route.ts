import { NextRequest, NextResponse } from 'next/server';
import { openSky } from '@/lib/services/opensky';
import { CacheService } from '@/lib/services/cache';
import { handleApiError } from '../../../utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ airportCode: string }> }
) {
  try {
    const { airportCode } = await params;
    
    // API Requires max 2 hour interval
    const endTime = Math.floor(Date.now() / 1000);
    const beginTime = endTime - (2 * 60 * 60); 

    const cacheKey = `departures:${airportCode}:${beginTime}:${endTime}`;
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) return NextResponse.json({ source: 'cache', data: cachedData });

    const departures = await openSky.getDepartures(airportCode, beginTime, endTime);
    await CacheService.set(cacheKey, departures, 1800); // 30 min cache

    return NextResponse.json({ source: 'live', data: departures });
  } catch (error: any) {
    return handleApiError(error);
  }
}
