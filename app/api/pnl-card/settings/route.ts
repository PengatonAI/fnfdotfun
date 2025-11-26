import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Allowed fields for user card settings
const ALLOWED_STRING_FIELDS = [
  "theme",
  "backgroundColor",
  "accentColor",
] as const;

const ALLOWED_BOOLEAN_FIELDS = [
  "showAvatar",
  "showUsername",
  "showPnl",
  "showVolume",
  "showWinRate",
  "showTotalTrades",
] as const;

// GET - Fetch user card settings
export async function GET() {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const settings = await prisma.userCardSettings.findUnique({
      where: { userId: session.user.id },
    });

    // Return settings or empty object if none exist
    return NextResponse.json(settings || {});
  } catch (error) {
    console.error("Error fetching user card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create or update user card settings
export async function POST(request: Request) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Build validated data object with only allowed fields
    const data: Record<string, string | boolean | null> = {};

    // Validate and extract string fields
    for (const field of ALLOWED_STRING_FIELDS) {
      if (field in body) {
        const value = body[field];
        if (value === null || typeof value === "string") {
          data[field] = value;
        }
      }
    }

    // Validate and extract boolean fields
    for (const field of ALLOWED_BOOLEAN_FIELDS) {
      if (field in body) {
        const value = body[field];
        if (typeof value === "boolean") {
          data[field] = value;
        }
      }
    }

    // Upsert the settings
    const settings = await prisma.userCardSettings.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        ...data,
      },
      update: data,
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving user card settings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
