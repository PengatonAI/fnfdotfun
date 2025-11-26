import { NextResponse } from "next/server";
import { generateMonthlySeason } from "@/lib/seasons/generateMonthlySeason";

/**
 * GET /api/cron/generate-monthly-season
 * 
 * Cron job endpoint to automatically generate monthly seasons.
 * 
 * SECURITY: This route requires a secret key in the x-cron-key header
 * to prevent unauthorized access.
 * 
 * VERCEL CRON JOB CONFIGURATION:
 * 
 * Path: /api/cron/generate-monthly-season
 * Method: GET
 * Schedule: 0 0 1 * * (runs at 00:00 UTC on the 1st of every month)
 * 
 * Headers:
 *   x-cron-key: <CRON_SECRET>
 * 
 * Environment Variable:
 *   CRON_SECRET - Secret key that must match the x-cron-key header
 * 
 * Example Vercel cron.json:
 * {
 *   "crons": [
 *     {
 *       "path": "/api/cron/generate-monthly-season",
 *       "schedule": "0 0 1 * *"
 *     }
 *   ]
 * }
 * 
 * Note: You'll need to configure the x-cron-key header in your Vercel
 * project settings or use Vercel's cron job configuration UI.
 */
export async function GET(request: Request) {
  try {
    // Check for cron secret key in header
    const cronKey = request.headers.get("x-cron-key");
    const expectedKey = process.env.CRON_SECRET;

    if (!expectedKey) {
      console.error("CRON_SECRET environment variable is not set");
      return NextResponse.json(
        { error: "Cron job not configured" },
        { status: 500 }
      );
    }

    if (!cronKey || cronKey !== expectedKey) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid cron key" },
        { status: 403 }
      );
    }

    // Generate monthly season
    const result = await generateMonthlySeason();

    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    console.error("Cron generate monthly season error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

