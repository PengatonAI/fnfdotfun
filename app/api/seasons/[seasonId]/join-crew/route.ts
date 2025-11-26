import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ seasonId: string }> }
) {
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

    const { seasonId } = await params;

    // 1) Verify user belongs to a crew
    const userCrewMember = await prisma.crewMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        crew: true,
      },
    });

    if (!userCrewMember) {
      return NextResponse.json(
        { error: "You must be a member of a crew to join as a crew" },
        { status: 403 }
      );
    }

    const crew = userCrewMember.crew;

    // 2) Check if user is crew admin (creator)
    if (crew.createdByUserId !== session.user.id) {
      return NextResponse.json(
        { error: "Only the crew creator can register the crew for tournaments" },
        { status: 403 }
      );
    }

    // 3) Fetch season
    const season = await prisma.season.findUnique({
      where: { id: seasonId },
    });

    if (!season) {
      return NextResponse.json(
        { error: "Season not found" },
        { status: 404 }
      );
    }

    // 4) Check if season is a tournament
    if (!season.isTournament) {
      return NextResponse.json(
        { error: "This season is not a tournament" },
        { status: 400 }
      );
    }

    // 5) Check if crew join is allowed
    if (season.allowCrewJoin !== true) {
      return NextResponse.json(
        { error: "Crew participation is not enabled for this tournament" },
        { status: 400 }
      );
    }

    // 6) Parse and enforce whitelist if allowedCrews exists
    let allowedCrews: string[] = [];
    
    try {
      if (season.allowedCrews) {
        allowedCrews = JSON.parse(season.allowedCrews);
      }
    } catch {
      // Ignore parse errors
    }

    if (allowedCrews.length > 0) {
      if (!allowedCrews.includes(crew.id)) {
        return NextResponse.json(
          { error: "Your crew is not allowed to join this private tournament." },
          { status: 403 }
        );
      }
    }

    // 7) Check if crew already joined
    const existingParticipant = await prisma.tournamentCrewParticipant.findUnique({
      where: {
        seasonId_crewId: {
          seasonId,
          crewId: crew.id,
        },
      },
    });

    if (existingParticipant) {
      return NextResponse.json(
        { error: "Your crew has already joined this tournament" },
        { status: 409 }
      );
    }

    // 8) Create TournamentCrewParticipant record
    await prisma.tournamentCrewParticipant.create({
      data: {
        seasonId,
        crewId: crew.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error joining tournament as crew:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

