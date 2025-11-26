import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

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
    const { imageUrl } = body;

    if (typeof imageUrl !== "string") {
      return NextResponse.json(
        { error: "Invalid imageUrl" },
        { status: 400 }
      );
    }

    // Update user's profile picture
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: imageUrl || null },
      select: {
        id: true,
        image: true,
        username: true,
        xHandle: true,
      },
    });

    return NextResponse.json({ 
      success: true,
      user: updatedUser 
    });
  } catch (error) {
    console.error("Error updating profile picture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

