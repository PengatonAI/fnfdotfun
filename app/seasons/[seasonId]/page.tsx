import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import SeasonLeaderboardClient from "./season-leaderboard-client";
import AdminTournamentControls from "./admin-tournament-controls";
import JoinTournamentButton from "./join-tournament-button";
import JoinCrewButton from "./join-crew-button";
import Link from "next/link";
import { Calendar, Eye, Link as LinkIcon, Trophy, Users, Shield, FileText } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SeasonDetailPage({
  params,
}: {
  params: { seasonId: string };
}) {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { isSeasonActive } = await import("@/lib/seasons/utils");

  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const { seasonId } = params;

  // Fetch season
  const season = await prisma.season.findUnique({
    where: { id: seasonId },
  });

  if (!season) {
    return (
      <>
        <Navbar />
        <div className="min-h-screen bg-bg-main">
          <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-12">
              <div className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#ff4a4a]/10 to-[#ff4a4a]/5 border border-[#ff4a4a]/20 flex items-center justify-center mb-6">
                  <Trophy className="w-10 h-10 text-[#ff4a4a]/60" />
                </div>
                <h1 className="text-2xl font-bold text-white mb-2">Season Not Found</h1>
                <p className="text-white/40 max-w-md">
                  The season you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const active = isSeasonActive(season);
  const initialData = null;

  // Parse JSON fields
  let allowedChains: string[] = [];
  let allowedUsers: string[] = [];
  let allowedCrews: string[] = [];
  
  try {
    if (season.allowedChains) {
      allowedChains = JSON.parse(season.allowedChains);
    }
    if (season.allowedUsers) {
      allowedUsers = JSON.parse(season.allowedUsers);
    }
    if (season.allowedCrews) {
      allowedCrews = JSON.parse(season.allowedCrews);
    }
  } catch {
    // Ignore parse errors
  }

  // Check if user is admin
  const isAdmin = session?.user?.username === "nanoxbt";

  // Check if user has joined tournament (only for tournaments)
  let hasJoined = false;
  let isPrivate = false;
  let canJoin = true;
  
  if (season.isTournament && session?.user?.id) {
    const participant = await prisma.tournamentParticipant.findUnique({
      where: {
        seasonId_userId: {
          seasonId: season.id,
          userId: session.user.id,
        },
      },
    });
    hasJoined = !!participant;

    // Check if tournament is private and user is not allowed
    if (season.visibility === "private" || allowedUsers.length > 0 || allowedCrews.length > 0) {
      isPrivate = true;
      
      // Check if user is allowed
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

      canJoin = isUserAllowed || isCrewAllowed;
    }
  }

  // Check crew participation (only for tournaments and if user is in a crew)
  let userCrew = null;
  let crewHasJoined = false;
  let isCrewCreator = false;
  let canCrewJoin = false;

  if (season.isTournament && session?.user?.id) {
    // Check if user is in a crew
    const userCrewMember = await prisma.crewMember.findFirst({
      where: {
        userId: session.user.id,
      },
      include: {
        crew: true,
      },
    });

    if (userCrewMember) {
      userCrew = userCrewMember.crew;
      isCrewCreator = userCrew.createdByUserId === session.user.id;

      // Check if crew has joined
      if (season.allowCrewJoin === true) {
        const crewParticipant = await prisma.tournamentCrewParticipant.findUnique({
          where: {
            seasonId_crewId: {
              seasonId: season.id,
              crewId: userCrew.id,
            },
          },
        });
        crewHasJoined = !!crewParticipant;

        // Check if crew can join (whitelist check)
        if (allowedCrews.length > 0) {
          canCrewJoin = allowedCrews.includes(userCrew.id);
        } else {
          canCrewJoin = true;
        }
      }
    }
  }

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* ═══════════════════════════════════════════════════════════════
              PREMIUM SEASON HEADER
          ═══════════════════════════════════════════════════════════════ */}
          <div className="mb-8">
            {/* Title + Badges */}
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <h1 className="text-2xl lg:text-3xl font-bold text-white">{season.name}</h1>
              
              {/* Status Badge */}
              {active && (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[#00d57a]/20 text-[#00d57a] border border-[#00d57a]/30">
                  Live
                </span>
              )}
              
              {/* Type Badge */}
              {season.isTournament ? (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent border border-accent/30">
                  Tournament
                </span>
              ) : (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/10 text-white/60 border border-white/10">
                  Official Season
                </span>
              )}
            </div>

            {/* Date Range */}
            <div className="flex items-center gap-2 text-white/50 mb-4">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(season.startAt)} → {formatDate(season.endAt)}
              </span>
            </div>

            {/* Metadata Row */}
            {season.isTournament && (
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40">
                {season.visibility && (
                  <div className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="capitalize">{season.visibility}</span>
                  </div>
                )}
                {allowedChains.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <LinkIcon className="w-3.5 h-3.5" />
                    <span>{allowedChains.join(", ")}</span>
                  </div>
                )}
                {(allowedUsers.length > 0 || allowedCrews.length > 0) && (
                  <div className="flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Restricted Access</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              PREMIUM TAB SWITCHER
          ═══════════════════════════════════════════════════════════════ */}
          <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-8 inline-flex">
            <Link
              href={`/seasons/${season.id}`}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border transition-all"
            >
              <Trophy className="w-4 h-4" />
              Trader Leaderboard
            </Link>
            <Link
              href={`/seasons/${season.id}/crews`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-[#0a0a0a]/50 transition-all"
            >
              <Users className="w-4 h-4" />
              Crew Leaderboard
            </Link>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              JOIN TOURNAMENT CARD
          ═══════════════════════════════════════════════════════════════ */}
          {season.isTournament && (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-8">
              {/* Top accent border */}
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#ff4a4a] via-white to-[#00d57a]" />
              
              <div className="relative p-6">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
                  {/* Left: Individual Join */}
                  <div className="flex-1">
                    <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-accent" />
                      Individual Participation
                    </h3>
                    {hasJoined ? (
                      <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d57a]/10 text-[#00d57a] border border-[#00d57a]/30">
                        <span className="text-sm font-medium">✓ You&apos;ve Joined</span>
                      </div>
                    ) : (
                      <div className="max-w-xs">
                        <JoinTournamentButton
                          seasonId={season.id}
                          disabled={isPrivate && !canJoin}
                          disabledMessage={
                            isPrivate && !canJoin
                              ? "You are not allowed to join this private tournament."
                              : undefined
                          }
                        />
                        <p className="text-xs text-white/30 mt-2">
                          Join to appear on the season leaderboard.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right: Crew Join (if applicable) */}
                  {userCrew && season.allowCrewJoin === true && (
                    <div className="flex-1 lg:border-l lg:border-[#1a1a1a] lg:pl-6">
                      <h3 className="text-white font-semibold mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-accent" />
                        Crew Participation
                      </h3>
                      {crewHasJoined ? (
                        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#00d57a]/10 text-[#00d57a] border border-[#00d57a]/30">
                          <span className="text-sm font-medium">✓ Crew Registered</span>
                        </div>
                      ) : isCrewCreator ? (
                        <div className="max-w-xs">
                          <JoinCrewButton
                            seasonId={season.id}
                            disabled={!canCrewJoin}
                            disabledMessage={
                              !canCrewJoin
                                ? "Your crew is not allowed to join this private tournament."
                                : undefined
                            }
                          />
                        </div>
                      ) : (
                        <p className="text-sm text-white/40">
                          Only the crew creator can register for tournaments.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              DESCRIPTION & RULES CARD
          ═══════════════════════════════════════════════════════════════ */}
          {(season.description || season.rules || (isAdmin && season.isTournament)) && (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-8">
              <div className="relative p-6 space-y-6">
                {/* Description */}
                {season.description && (
                  <div>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-accent" />
                      Description
                    </h3>
                    <div className="text-white/60 whitespace-pre-line text-sm leading-relaxed">
                      {season.description}
                    </div>
                  </div>
                )}

                {/* Rules */}
                {season.rules && (
                  <div className={season.description ? "pt-6 border-t border-[#1a1a1a]" : ""}>
                    <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
                      <Shield className="w-4 h-4 text-accent" />
                      Tournament Rules
                    </h3>
                    <div className="text-white/60 whitespace-pre-line text-sm leading-relaxed">
                      {season.rules}
                    </div>
                  </div>
                )}

                {/* Admin Controls */}
                {isAdmin && season.isTournament && (
                  <div className={(season.description || season.rules) ? "pt-6 border-t border-[#1a1a1a]" : ""}>
                    <h3 className="text-white font-semibold mb-3 text-sm">Admin Controls</h3>
                    <AdminTournamentControls season={season} />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              LEADERBOARD SECTION
          ═══════════════════════════════════════════════════════════════ */}
          <SeasonLeaderboardClient
            season={{
              id: season.id,
              name: season.name,
              startAt: season.startAt.toISOString(),
              endAt: season.endAt.toISOString(),
            }}
            initialData={initialData}
          />
        </div>
      </div>
    </>
  );
}
