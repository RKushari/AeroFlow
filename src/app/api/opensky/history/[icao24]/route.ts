import { NextRequest, NextResponse } from 'next/server';
import { openSky } from '@/lib/services/opensky';
import { CacheService } from '@/lib/services/cache';
import { handleApiError } from '../../utils';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ icao24: string }> }
) {
  try {
    const { icao24 } = await params;
    
    const endTime = Math.floor(Date.now() / 1000);
    const beginTime = endTime - (48 * 60 * 60); // Up to 2 days maximum per requirements
    
    const cacheKey = `history:${icao24}:48h`;
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) return NextResponse.json({ source: 'cache', data: cachedData });

    const history = await openSky.getAircraftHistory(icao24, beginTime, endTime);
    
    await CacheService.set(cacheKey, history, 3600); // cache 1 hour

    return NextResponse.json({ source: 'live', data: history });
  } catch (error: any) {
    return handleApiError(error);
  }
}
