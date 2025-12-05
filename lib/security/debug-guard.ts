import { NextResponse } from "next/server";

/**
 * SECURITY: Debug endpoints should only be enabled in development
 * In production, they should be completely disabled to prevent:
 * - Information disclosure
 * - Unauthorized data access
 * - Database inspection
 */

/**
 * Check if debug endpoints are enabled
 */
export function isDebugEnabled(): boolean {
  return process.env.NODE_ENV === 'development' || process.env.ENABLE_DEBUG === 'true';
}

/**
 * Middleware guard for debug endpoints
 * Returns null if access is allowed, or a NextResponse with error if denied
 */
export function requireDebugAccess(): NextResponse | null {
  if (!isDebugEnabled()) {
    return NextResponse.json(
      { 
        error: 'Debug endpoints are disabled in production',
        message: 'This endpoint is only available in development mode'
      },
      { status: 403 }
    );
  }
  return null;
}

