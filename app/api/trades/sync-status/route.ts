import { NextResponse } from "next/server";
import { getStatus } from "@/lib/trades/sync-status";

/**
 * GET endpoint to read sync progress status
 * Returns current sync status for frontend polling
 */
export async function GET() {
  try {
    const status = getStatus();
    return NextResponse.json(status);
  } catch (error) {
    // Return safe default on error
    return NextResponse.json({
      stage: "error",
      current: 0,
      total: 0,
      message: "Error reading sync status",
      updatedAt: Date.now(),
      done: true,
      error: "Failed to read sync status",
    });
  }
}

