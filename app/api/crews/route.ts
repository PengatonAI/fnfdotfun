import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - List crews for the current user
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const sort = searchParams.get("sort") || "newest";

    const crews = await prisma.crew.findMany({
      where: {
        members: {
          some: {
            userId: session.user.id,
          },
        },
      },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        joinRequests: {
          where: {
            status: "pending",
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: sort === "oldest" ? "asc" : "desc",
      },
    });

    // Apply sorting by member count if needed
    let sortedCrews = crews;
    if (sort === "most-members" || sort === "least-members") {
      sortedCrews = [...crews].sort((a, b) => {
        const aCount = a.members.length;
        const bCount = b.members.length;
        return sort === "most-members" ? bCount - aCount : aCount - bCount;
      });
    }

    return NextResponse.json(sortedCrews);
  } catch (error) {
    console.error("Error fetching crews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create a new crew
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if user is already in a crew
    const existingCrewMember = await prisma.crewMember.findFirst({
      where: {
        userId: session.user.id,
      },
    });

    if (existingCrewMember) {
      return NextResponse.json(
        { error: "You can only belong to one crew at a time. Please leave your current crew first." },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, description, openToMembers = true } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Crew name is required" },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { error: "Crew name must be 100 characters or less" },
        { status: 400 }
      );
    }

    if (description && typeof description !== "string") {
      return NextResponse.json(
        { error: "Description must be a string" },
        { status: 400 }
      );
    }

    if (description && description.length > 500) {
      return NextResponse.json(
        { error: "Description must be 500 characters or less" },
        { status: 400 }
      );
    }

    if (typeof openToMembers !== "boolean") {
      return NextResponse.json(
        { error: "openToMembers must be a boolean" },
        { status: 400 }
      );
    }

    // Create crew and add creator as first member in a transaction
    const crew = await prisma.$transaction(async (tx) => {
      const newCrew = await tx.crew.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          openToMembers: openToMembers,
          createdByUserId: session.user.id,
        },
      });

      await tx.crewMember.create({
        data: {
          crewId: newCrew.id,
          userId: session.user.id,
        },
      });

      return newCrew;
    });

    // Fetch the complete crew with relations
    const crewWithDetails = await prisma.crew.findUnique({
      where: { id: crew.id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
                username: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
      },
    });

    return NextResponse.json(crewWithDetails, { status: 201 });
  } catch (error) {
    console.error("Error creating crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

