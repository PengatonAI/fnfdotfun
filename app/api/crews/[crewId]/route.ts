import { NextResponse } from "next/server";
import { sanitizeCrewName, sanitizeString, isValidDescription, isValidUrl } from "@/lib/security/validation";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// GET - Fetch crew by ID with members
export async function GET(
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

    // SECURITY: Check if user is a member before returning crew data
    const userMembership = await prisma.crewMember.findFirst({
      where: {
        crewId,
        userId: session.user.id,
      },
    });

    const crew = await prisma.crew.findUnique({
      where: { id: crewId },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            // SECURITY: Only expose email to crew members
            ...(userMembership ? { email: true } : {}),
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
                // SECURITY: Only expose email to crew members
                ...(userMembership ? { email: true } : {}),
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
                name: true,
                // SECURITY: Only expose email to crew members
                ...(userMembership ? { email: true } : {}),
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

    // SECURITY: If crew is not open and user is not a member, deny access
    if (!crew.openToMembers && !userMembership) {
      return NextResponse.json(
        { error: "You must be a member to view this crew" },
        { status: 403 }
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
        { error: "Only the crew creator can edit the crew" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, description, openToMembers, avatarUrl, bannerUrl, tagline, bio } = body;

    // SECURITY: Validate and sanitize input
    let sanitizedName: string | undefined;
    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Crew name is required and must be a non-empty string" },
          { status: 400 }
        );
      }
      try {
        sanitizedName = sanitizeCrewName(name);
      } catch (error) {
        return NextResponse.json(
          { error: error instanceof Error ? error.message : "Invalid crew name format" },
          { status: 400 }
        );
      }
    }

    let sanitizedDescription: string | null | undefined;
    if (description !== undefined) {
      if (description !== null && typeof description !== "string") {
        return NextResponse.json(
          { error: "Description must be a string or null" },
          { status: 400 }
        );
      }
      if (!isValidDescription(description)) {
        return NextResponse.json(
          { error: "Description must be 500 characters or less" },
          { status: 400 }
        );
      }
      sanitizedDescription = description ? sanitizeString(description, 500) : null;
    }

    if (openToMembers !== undefined && typeof openToMembers !== "boolean") {
      return NextResponse.json(
        { error: "openToMembers must be a boolean" },
        { status: 400 }
      );
    }

    let sanitizedTagline: string | null | undefined;
    if (tagline !== undefined) {
      if (tagline !== null && typeof tagline !== "string") {
        return NextResponse.json(
          { error: "Tagline must be a string or null" },
          { status: 400 }
        );
      }
      if (tagline && tagline.length > 100) {
        return NextResponse.json(
          { error: "Tagline must be 100 characters or less" },
          { status: 400 }
        );
      }
      sanitizedTagline = tagline ? sanitizeString(tagline, 100) : null;
    }

    let sanitizedAvatarUrl: string | null | undefined;
    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== "string") {
        return NextResponse.json(
          { error: "avatarUrl must be a string or null" },
          { status: 400 }
        );
      }
      if (avatarUrl && !isValidUrl(avatarUrl)) {
        return NextResponse.json(
          { error: "Invalid avatar URL format" },
          { status: 400 }
        );
      }
      sanitizedAvatarUrl = avatarUrl;
    }

    let sanitizedBannerUrl: string | null | undefined;
    if (bannerUrl !== undefined) {
      if (bannerUrl !== null && typeof bannerUrl !== "string") {
        return NextResponse.json(
          { error: "bannerUrl must be a string or null" },
          { status: 400 }
        );
      }
      if (bannerUrl && !isValidUrl(bannerUrl)) {
        return NextResponse.json(
          { error: "Invalid banner URL format" },
          { status: 400 }
        );
      }
      sanitizedBannerUrl = bannerUrl;
    }

    let sanitizedBio: string | null | undefined;
    if (bio !== undefined) {
      if (bio !== null && typeof bio !== "string") {
        return NextResponse.json(
          { error: "bio must be a string or null" },
          { status: 400 }
        );
      }
      if (bio && bio.length > 500) {
        return NextResponse.json(
          { error: "bio must be 500 characters or less" },
          { status: 400 }
        );
      }
      sanitizedBio = bio ? sanitizeString(bio, 500) : null;
    }

    // Track if settings were updated
    const hasUpdates = sanitizedName !== undefined || sanitizedDescription !== undefined || 
                       openToMembers !== undefined || sanitizedAvatarUrl !== undefined || 
                       sanitizedBannerUrl !== undefined || sanitizedTagline !== undefined || sanitizedBio !== undefined;

    const updatedCrew = await prisma.$transaction(async (tx) => {
      const crew = await tx.crew.update({
        where: { id: crewId },
        data: {
          ...(sanitizedName !== undefined && { name: sanitizedName }),
          ...(sanitizedDescription !== undefined && { description: sanitizedDescription }),
          ...(openToMembers !== undefined && { openToMembers }),
          ...(sanitizedAvatarUrl !== undefined && { avatarUrl: sanitizedAvatarUrl }),
          ...(sanitizedBannerUrl !== undefined && { bannerUrl: sanitizedBannerUrl }),
          ...(sanitizedTagline !== undefined && { tagline: sanitizedTagline }),
          ...(sanitizedBio !== undefined && { bio: sanitizedBio }),
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
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
