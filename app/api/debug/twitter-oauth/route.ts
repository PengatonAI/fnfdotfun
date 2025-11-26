import { NextRequest, NextResponse } from "next/server";

/**
 * Diagnostic endpoint to check Twitter OAuth configuration and test API connectivity
 * Access at: /api/debug/twitter-oauth
 */
export async function GET(request: NextRequest) {
  try {
    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasClientId: !!process.env.TWITTER_CLIENT_ID,
        hasClientSecret: !!process.env.TWITTER_CLIENT_SECRET,
        clientIdLength: process.env.TWITTER_CLIENT_ID?.length || 0,
        clientSecretLength: process.env.TWITTER_CLIENT_SECRET?.length || 0,
        clientIdPrefix: process.env.TWITTER_CLIENT_ID?.substring(0, 10) || "missing",
        nextAuthUrl: process.env.NEXTAUTH_URL,
        nextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      },
      twitterApi: {
        status: "unknown",
        error: null,
      },
    };

    // Test Twitter API connectivity (if we have credentials)
    if (process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET) {
      try {
        // Note: We can't directly test OAuth without a full flow, but we can check if credentials are valid format
        const clientId = process.env.TWITTER_CLIENT_ID;
        const clientSecret = process.env.TWITTER_CLIENT_SECRET;
        
        // Twitter Client IDs are typically long alphanumeric strings
        // Twitter Client Secrets are also long strings
        diagnostics.twitterApi.credentialsFormat = {
          clientIdValid: clientId.length > 20 && /^[A-Za-z0-9_-]+$/.test(clientId),
          clientSecretValid: clientSecret.length > 40,
        };
        
        diagnostics.twitterApi.status = "credentials_present";
      } catch (error: any) {
        diagnostics.twitterApi.status = "error";
        diagnostics.twitterApi.error = error.message;
      }
    } else {
      diagnostics.twitterApi.status = "missing_credentials";
    }

    // Check callback URL configuration
    diagnostics.callbackUrl = {
      expected: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/api/auth/callback/twitter`,
      note: "This must match exactly in Twitter Developer Portal",
    };

    // Recommendations
    diagnostics.recommendations = [];
    
    if (!process.env.TWITTER_CLIENT_ID || !process.env.TWITTER_CLIENT_SECRET) {
      diagnostics.recommendations.push("❌ TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET must be set in .env.local");
    }
    
    if (!process.env.NEXTAUTH_URL) {
      diagnostics.recommendations.push("⚠️ NEXTAUTH_URL should be set (defaults to http://localhost:3000 in dev)");
    }
    
    if (!process.env.NEXTAUTH_SECRET) {
      diagnostics.recommendations.push("❌ NEXTAUTH_SECRET must be set");
    }
    
    diagnostics.recommendations.push("✅ Verify callback URL in Twitter Developer Portal matches exactly");
    diagnostics.recommendations.push("✅ Check Twitter Developer Portal for rate limits and app status");
    diagnostics.recommendations.push("✅ Ensure OAuth 2.0 is enabled (not OAuth 1.0a)");
    diagnostics.recommendations.push("✅ Check if app is in development mode (stricter rate limits)");

    return NextResponse.json(diagnostics, { status: 200 });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: "Failed to run diagnostics",
        message: error.message,
        stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

