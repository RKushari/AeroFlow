import { NextRequest, NextResponse } from 'next/server';
import { openSky } from '@/lib/services/opensky';
import { CacheService } from '@/lib/services/cache';
import { handleApiError } from '../../utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ airportCode: string }> }
) {
  try {
    const { airportCode } = await params;
    const cacheKey = `arrivals:${airportCode}:24h`;
    
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) return NextResponse.json({ source: 'cache', data: cachedData });

    // OpenSky limit: Max 2 days. Setup for last 24 hours.
    const endTime = Math.floor(Date.now() / 1000);
    const beginTime = endTime - (24 * 60 * 60);

    const arrivals = await openSky.getArrivals(airportCode, beginTime, endTime);
    
    // Historical data updates nightly, safe to cache for 1 hour
    await CacheService.set(cacheKey, arrivals, 3600);

    return NextResponse.json({ source: 'live', data: arrivals });
  } catch (error: any) {
    return handleApiError(error);
  }
}
