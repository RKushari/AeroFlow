import { NextResponse } from 'next/server';

export function handleApiError(error: any) {
  if (error.response) {
    const status = error.response.status;
    if (status === 429) {
      return NextResponse.json({
        error: 'Rate limit exceeded (4000 credits/day standard).',
        retryAfter: error.retryAfter
      }, { status: 429 });
    }
    if (status === 401 || status === 403) {
      return NextResponse.json({ error: 'Auth failed or insufficient permissions.' }, { status });
    }
    if (status === 404) {
      return NextResponse.json({ error: 'No flights found for given parameters.' }, { status: 404 });
    }
    if (status === 400) {
      return NextResponse.json({ error: 'Invalid bounding box or time parameters.' }, { status: 400 });
    }
  }
  console.error("OpenSky API Error:", error.message || error);
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
