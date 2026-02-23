import { NextRequest, NextResponse } from 'next/server';
import captureWebsite from 'capture-website';
import { cacheGetBuffer, cacheSetBuffer, cacheKey, hashKey } from '@/lib/redis';

const TTL_SECONDS = 86400; // 24 hours

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL required' }, { status: 400 });
  }

  const key = cacheKey('screenshot', hashKey(url));

  const cached = await cacheGetBuffer(key);
  if (cached) {
    return new NextResponse(cached, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    const screenshot = await captureWebsite.buffer(url, {
      width: 1200,
      height: 800,
      type: 'jpeg',
      quality: 0.8,
      timeout: 10,
      delay: 1,
    });

    await cacheSetBuffer(key, Buffer.from(screenshot), TTL_SECONDS);

    return new NextResponse(screenshot, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        'X-Cache': 'MISS',
      },
    });
  } catch (error) {
    console.error('Screenshot error:', error);
    return NextResponse.json({ error: 'Failed to capture screenshot' }, { status: 500 });
  }
}
