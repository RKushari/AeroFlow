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
    const time = parseInt(req.nextUrl.searchParams.get('time') || '0', 10);
    
    const cacheKey = `track:${icao24}:${time}`;
    const cachedData = await CacheService.get(cacheKey);
    if (cachedData) return NextResponse.json({ source: 'cache', data: cachedData });

    const track = await openSky.getTrack(icao24, time);
    
    // Cache live tracks for 1 minute, historical tracks for 24h
    const ttl = time === 0 ? 60 : 86400;
    await CacheService.set(cacheKey, track, ttl);

    return NextResponse.json({ source: 'live', data: track });
  } catch (error: any) {
    return handleApiError(error);
  }
}
