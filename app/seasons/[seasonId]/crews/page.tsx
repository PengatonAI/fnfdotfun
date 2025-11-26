import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import SeasonCrewLeaderboardClient from "./season-crew-leaderboard-client";
import Link from "next/link";
import { Calendar, Trophy, Users } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function SeasonCrewLeaderboardPage({
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
            <div className="flex items-center gap-2 text-white/50">
              <Calendar className="w-4 h-4" />
              <span>
                {formatDate(season.startAt)} → {formatDate(season.endAt)}
              </span>
            </div>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              PREMIUM TAB SWITCHER
          ═══════════════════════════════════════════════════════════════ */}
          <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-1.5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] mb-8 inline-flex">
            <Link
              href={`/seasons/${season.id}`}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-[#0a0a0a]/50 transition-all"
            >
              <Trophy className="w-4 h-4" />
              Trader Leaderboard
            </Link>
            <Link
              href={`/seasons/${season.id}/crews`}
              className="relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-[#0a0a0a] text-white border border-white/20 shadow-[0_0_15px_rgba(168,85,247,0.2)] tricolor-hover-border transition-all"
            >
              <Users className="w-4 h-4" />
              Crew Leaderboard
            </Link>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              CREW LEADERBOARD
          ═══════════════════════════════════════════════════════════════ */}
          <SeasonCrewLeaderboardClient
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
