// src/app/api/admin/worker/[...path]/route.ts
// Proxy to worker service with API key authentication
import { NextRequest, NextResponse } from 'next/server';

import { auth } from '@/../auth';
import { isAdmin } from '@/lib/permissions';

const WORKER_URL =
  process.env.NEXT_PUBLIC_MONITORING_API_URL ||
  process.env.WORKER_INTERNAL_URL ||
  'http://localhost:3001';
const WORKER_API_KEY = process.env.WORKER_API_KEY || '';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET');
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST');
}

async function handleRequest(
  request: NextRequest,
  paramsPromise: Promise<{ path: string[] }>,
  method: string
) {
  try {
    // Check admin auth
    const session = await auth();
    if (!session?.user || !isAdmin(session.user.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { path } = await paramsPromise;
    const targetPath = '/' + path.join('/');
    const searchParams = request.nextUrl.searchParams.toString();
    const url = `${WORKER_URL}${targetPath}${searchParams ? '?' + searchParams : ''}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (WORKER_API_KEY) {
      headers['X-API-Key'] = WORKER_API_KEY;
    }

    const fetchOptions: RequestInit = {
      method,
      headers,
    };

    if (method === 'POST') {
      try {
        const body = await request.json();
        fetchOptions.body = JSON.stringify(body);
      } catch {
        // No body or invalid JSON, that's fine
      }
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      return NextResponse.json(
        { error: `Worker error: ${response.status}` },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Worker proxy error:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to reach worker',
      },
      { status: 500 }
    );
  }
}
