import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Get fresh session on every request (no caching)
  const session = await auth();

  // Debug logging
  console.log("🔍 MIDDLEWARE:", {
    path: request.nextUrl.pathname,
    hasSession: !!session,
    hasUserId: !!session?.user?.id,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
  });

  // Check for valid session with user.id (required for protected routes)
  if (!session || !session.user?.id) {
    console.log("❌ MIDDLEWARE: Redirecting to login - missing session or user.id");
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", request.nextUrl.pathname);
    
    const response = NextResponse.redirect(loginUrl);
    // Clear any auth cookies if session is invalid
    response.cookies.delete("next-auth.session-token");
    response.cookies.delete("__Secure-next-auth.session-token");
    return response;
  }

  console.log("✅ MIDDLEWARE: Session valid, allowing request");
  const response = NextResponse.next();
  // Ensure no caching of auth state
  response.headers.set("Cache-Control", "no-store, max-age=0");
  return response;
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/profile",
    "/profile/:path*",
    "/wallets",
    "/wallets/:path*",
    "/crews/:path*",
    "/leaderboard/:path*",
    "/seasons/:path*",
    "/challenges/:path*",
  ],
};

