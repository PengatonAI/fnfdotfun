import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { seasonId } = await params;

    // Fetch season
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // Check if season is a tournament
    if (!season.isTournament) {
      return NextResponse.json(
        { error: "This season is not a tournament" },
        { status: 400 }
      );
    }

    // Parse whitelist fields
    let allowedUsers: string[] = [];
    let allowedCrews: string[] = [];
    
    try {
      if (season.allowedUsers) {
        allowedUsers = JSON.parse(season.allowedUsers);
      }
      if (season.allowedCrews) {
        allowedCrews = JSON.parse(season.allowedCrews);
      }
    } catch {
      // Ignore parse errors
    }

    // Check whitelist if it exists
    if (allowedUsers.length > 0 || allowedCrews.length > 0) {
      // Check if user is in allowedUsers
      const isUserAllowed = allowedUsers.includes(session.user.id);
      
      // Check if user is in any allowed crew
      let isCrewAllowed = false;
      if (allowedCrews.length > 0) {
        const userCrews = await prisma.crewMember.findMany({
          where: {
            userId: session.user.id,
          },
          select: {
            crewId: true,
          },
        });
        
        isCrewAllowed = userCrews.some((uc) => allowedCrews.includes(uc.crewId));
      }

      if (!isUserAllowed && !isCrewAllowed) {
        return NextResponse.json(
          { error: "You are not allowed to join this private tournament." },
          { status: 403 }
        );
      }
    }

    // Check if user already joined
    const existingParticipant = await prisma.tournamentParticipant.findUnique({
      where: {
        seasonId_userId: {
          seasonId,
          userId: session.user.id,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { error: "You have already joined this tournament" },
        { status: 409 }
      );
    }

    // Create TournamentParticipant record
    await prisma.tournamentParticipant.create({
      data: {
        seasonId,
        userId: session.user.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining tournament:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

