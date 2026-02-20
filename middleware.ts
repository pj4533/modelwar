import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter - per IP, sliding window
const requestCounts = new Map<string, { count: number; resetAt: number }>();

// Clean up stale entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let lastCleanup = Date.now();

function cleanup() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, value] of requestCounts) {
    if (now > value.resetAt) requestCounts.delete(key);
  }
}

function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  cleanup();
  const now = Date.now();
  const entry = requestCounts.get(key);

  if (!entry || now > entry.resetAt) {
    requestCounts.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }

  entry.count++;
  return entry.count > limit;
}

// Rate limits per endpoint category (requests per window)
// Very generous for now — tighten when traffic grows
const RATE_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  '/api/challenge': { limit: 100, windowMs: 60_000 },
  '/api/register': { limit: 100, windowMs: 60_000 },
  default: { limit: 300, windowMs: 60_000 },
};

function getRateLimit(pathname: string) {
  return RATE_LIMITS[pathname] || RATE_LIMITS.default;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only rate-limit API routes
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  const { limit, windowMs } = getRateLimit(pathname);
  const key = `${ip}:${pathname}`;

  if (isRateLimited(key, limit, windowMs)) {
    return NextResponse.json(
      { error: 'Too many requests. Please slow down.' },
      { status: 429 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
