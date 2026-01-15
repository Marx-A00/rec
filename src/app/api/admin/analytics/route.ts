// src/app/api/admin/analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';

const UMAMI_URL =
  process.env.UMAMI_URL || 'https://umami-production-08c5.up.railway.app';
const UMAMI_USERNAME = process.env.UMAMI_USERNAME || 'admin';
const UMAMI_PASSWORD = process.env.UMAMI_PASSWORD || '';
const UMAMI_WEBSITE_ID =
  process.env.UMAMI_WEBSITE_ID || '9b8dd0c0-f9cf-406a-ab48-d4580cfeae39';

// Cache the token to avoid re-authenticating on every request
let cachedToken: string | null = null;
let tokenExpiry: number = 0;

async function getUmamiToken(): Promise<string> {
  // Return cached token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const response = await fetch(`${UMAMI_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: UMAMI_USERNAME,
      password: UMAMI_PASSWORD,
    }),
  });

  if (!response.ok) {
    throw new Error(`Umami auth failed: ${response.status}`);
  }

  const data = await response.json();
  cachedToken = data.token;
  // Token typically valid for 24h, we'll refresh after 23h
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000;

  return cachedToken!;
}

async function fetchUmamiData(
  endpoint: string,
  token: string,
  params: URLSearchParams
) {
  const url = `${UMAMI_URL}/api/websites/${UMAMI_WEBSITE_ID}/${endpoint}?${params}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Umami API error: ${response.status}`);
  }

  return response.json();
}

export async function GET(request: NextRequest) {
  try {
    // Check admin auth
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if Umami is configured
    if (!UMAMI_PASSWORD) {
      return NextResponse.json(
        { error: 'Umami not configured. Set UMAMI_PASSWORD env var.' },
        { status: 500 }
      );
    }

    // Get time range from query params
    const searchParams = request.nextUrl.searchParams;
    const range = searchParams.get('range') || '7d';

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let startAt: number;

    switch (range) {
      case '24h':
        startAt = now - day;
        break;
      case '7d':
        startAt = now - 7 * day;
        break;
      case '30d':
        startAt = now - 30 * day;
        break;
      case '90d':
        startAt = now - 90 * day;
        break;
      default:
        startAt = now - 7 * day;
    }

    const params = new URLSearchParams({
      startAt: startAt.toString(),
      endAt: now.toString(),
    });

    // Get auth token
    const token = await getUmamiToken();

    // Fetch all data in parallel (Umami v2 API)
    const [stats, pages, referrers, countries, browsers] = await Promise.all([
      fetchUmamiData('stats', token, params),
      fetchUmamiData(
        'metrics',
        token,
        new URLSearchParams({ ...Object.fromEntries(params), type: 'path' })
      ),
      fetchUmamiData(
        'metrics',
        token,
        new URLSearchParams({ ...Object.fromEntries(params), type: 'referrer' })
      ),
      fetchUmamiData(
        'metrics',
        token,
        new URLSearchParams({ ...Object.fromEntries(params), type: 'country' })
      ),
      fetchUmamiData(
        'metrics',
        token,
        new URLSearchParams({ ...Object.fromEntries(params), type: 'browser' })
      ),
    ]);

    return NextResponse.json({
      stats,
      pages: pages.slice(0, 10),
      referrers: referrers.slice(0, 10),
      countries: countries.slice(0, 10),
      browsers: browsers.slice(0, 5),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to fetch analytics',
      },
      { status: 500 }
    );
  }
}
