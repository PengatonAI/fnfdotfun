import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET - Fetch crew by ID with members
export async function GET(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { crewId } = await params;

    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
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
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
              },
            },
          },
          orderBy: {
            joinedAt: "asc",
          },
        },
        activities: {
          include: {
            user: {
              select: {
                id: true,
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 5,
        },
      },
    });

    if (!crew) {
      return NextResponse.json(
        { error: "Crew not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(crew);
  } catch (error) {
    console.error("Error fetching crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Edit crew (creator only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ crewId: string }> }
) {
  try {
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
        { error: "Only the crew creator can edit the crew" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, openToMembers, avatarUrl, bannerUrl, tagline, bio } = body;

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Crew name is required and must be a non-empty string" },
          { status: 400 }
        );
      }

      if (name.length > 100) {
        return NextResponse.json(
          { error: "Crew name must be 100 characters or less" },
          { status: 400 }
        );
      }
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        return NextResponse.json(
          { error: "Description must be a string or null" },
          { status: 400 }
        );
      }

      if (description && description.length > 500) {
        return NextResponse.json(
          { error: "Description must be 500 characters or less" },
          { status: 400 }
        );
      }
    }

    if (openToMembers !== undefined && typeof openToMembers !== "boolean") {
      return NextResponse.json(
        { error: "openToMembers must be a boolean" },
        { status: 400 }
      );
    }

    if (tagline !== undefined) {
      if (tagline !== null && (typeof tagline !== "string" || tagline.length > 100)) {
        return NextResponse.json(
          { error: "Tagline must be a string with 100 characters or less, or null" },
          { status: 400 }
        );
      }
    }

    if (avatarUrl !== undefined && avatarUrl !== null && typeof avatarUrl !== "string") {
      return NextResponse.json(
        { error: "avatarUrl must be a string or null" },
        { status: 400 }
      );
    }

    if (bannerUrl !== undefined && bannerUrl !== null && typeof bannerUrl !== "string") {
      return NextResponse.json(
        { error: "bannerUrl must be a string or null" },
        { status: 400 }
      );
    }

    if (bio !== undefined && bio !== null && typeof bio !== "string") {
      return NextResponse.json(
        { error: "bio must be a string or null" },
        { status: 400 }
      );
    }

    // Track if settings were updated
    const hasUpdates = name !== undefined || description !== undefined || 
                       openToMembers !== undefined || avatarUrl !== undefined || 
                       bannerUrl !== undefined || tagline !== undefined || bio !== undefined;

    const updatedCrew = await prisma.$transaction(async (tx) => {
      const crew = await tx.crew.update({
        where: { id: crewId },
        data: {
          ...(name !== undefined && { name: name.trim() }),
          ...(description !== undefined && { description: description?.trim() || null }),
          ...(openToMembers !== undefined && { openToMembers }),
          ...(avatarUrl !== undefined && { avatarUrl: avatarUrl?.trim() || null }),
          ...(bannerUrl !== undefined && { bannerUrl: bannerUrl?.trim() || null }),
          ...(tagline !== undefined && { tagline: tagline?.trim() || null }),
          ...(bio !== undefined && { bio: bio?.trim() || null }),
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
            name: true, // Keep for internal use only
            email: true,
            image: true,
            username: true,
            xHandle: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
        },
      });

      // Log activity if settings were updated
      if (hasUpdates) {
        await tx.crewActivity.create({
          data: {
            crewId,
            userId: session.user.id,
            type: "updated_settings",
            message: "Crew settings updated",
          },
        });
      }

      return crew;
    });
    return NextResponse.json(updatedCrew);
  } catch (error) {
    console.error("Error updating crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

