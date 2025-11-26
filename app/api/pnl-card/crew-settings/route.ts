import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Allowed fields for crew card settings
const ALLOWED_STRING_FIELDS = [
  "theme",
  "backgroundColor",
  "accentColor",
] as const;

const ALLOWED_BOOLEAN_FIELDS = [
  "showAvatar",
  "showName",
  "showPnl",
  "showVolume",
  "showMemberCount",
  "showTotalTrades",
] as const;

// GET - Fetch crew card settings
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get crewId from query params
    const { searchParams } = new URL(request.url);
    const crewId = searchParams.get("crewId");

    if (!crewId) {
      return NextResponse.json(
        { error: "crewId is required" },
        { status: 400 }
      );
    }

    // Fetch crew with card settings
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: { cardSettings: true },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Anyone can read crew settings
    return NextResponse.json({
      crewId: crew.id,
      settings: crew.cardSettings || null,
    });
  } catch (error) {
    console.error("Error fetching crew card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update crew card settings
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { crewId, ...settingsData } = body;

    if (!crewId) {
      return NextResponse.json(
        { error: "crewId is required" },
        { status: 400 }
      );
    }

    // Fetch crew to validate ownership
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    // Only crew creator can modify settings
    if (crew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    // Build validated data object with only allowed fields
    const data: Record<string, string | boolean | null> = {};

    // Validate and extract string fields
    for (const field of ALLOWED_STRING_FIELDS) {
      if (field in settingsData) {
        const value = settingsData[field];
        if (value === null || typeof value === "string") {
          data[field] = value;
        }
      }
    }

    // Validate and extract boolean fields
    for (const field of ALLOWED_BOOLEAN_FIELDS) {
      if (field in settingsData) {
        const value = settingsData[field];
        if (typeof value === "boolean") {
          data[field] = value;
        }
      }
    }

    // Upsert the settings
    const settings = await prisma.crewCardSettings.upsert({
      where: { crewId },
      create: {
        crewId,
        ...data,
      },
      update: data,
    });

    return NextResponse.json({
      crewId,
      settings,
    });
  } catch (error) {
    console.error("Error saving crew card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
