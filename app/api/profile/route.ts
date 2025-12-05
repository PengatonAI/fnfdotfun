import { NextResponse } from "next/server";
import { sanitizeUsername, isValidUsername } from "@/lib/security/validation";

export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
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
    const { username } = body;

    // SECURITY: Validate and sanitize username
    if (username !== undefined && username !== null) {
      if (typeof username !== "string") {
        return NextResponse.json(
          { error: "Username must be a string" },
          { status: 400 }
        );
      }
      
      if (!isValidUsername(username)) {
        return NextResponse.json(
          { error: "Username must be 3-20 characters and contain only letters, numbers, and underscores" },
          { status: 400 }
        );
      }
    }
    
    // Sanitize username (already validated format, just trim)
    const sanitizedUsername = username ? username.trim() : null;

    // Check if username is already taken
    if (username) {
      const existingUser = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUser && existingUser.id !== session.user.id) {
        return NextResponse.json(
          { error: "Username is already taken" },
          { status: 409 }
        );
      }
    }

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        username: sanitizedUsername,
      },
      select: {
        id: true,
        username: true,
        xHandle: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

