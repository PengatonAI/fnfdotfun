import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { crewId } = await params;

    // Check if crew exists and user is creator
    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      select: {
        createdByUserId: true,
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    if (crew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the crew creator can generate invite tokens" },
        { status: 403 }
      );
    }

    // Generate unique token
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hours from now

    // Create invite token
    const inviteToken = await prisma.inviteToken.create({
      data: {
        token,
        crewId,
        expiresAt,
      },
    });

    return NextResponse.json({
      token: inviteToken.token,
      expiresAt: inviteToken.expiresAt,
      inviteLink: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/crews/${crewId}/join?token=${token}`,
    });
  } catch (error) {
    console.error("Error creating invite token:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
