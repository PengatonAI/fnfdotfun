import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Calendar, Trophy, Clock, Eye, Link as LinkIcon } from "lucide-react";

export const dynamic = "force-dynamic";

function formatDate(date: Date | string): string {
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ═══════════════════════════════════════════════════════════════════════
// PREMIUM SEASON CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function SeasonCard({
  season,
  status,
  isOfficial = false,
}: {
  season: {
    id: string;
    name: string;
    startAt: Date;
    endAt: Date;
    visibility: string | null;
    allowedChains: string | null;
    isTournament: boolean;
  };
  status: "active" | "upcoming" | "past";
  isOfficial?: boolean;
}) {
  // Parse allowed chains
  let allowedChains: string[] = [];
  try {
    if (season.allowedChains) {
      allowedChains = JSON.parse(season.allowedChains);
    }
  } catch {
    // Ignore parse errors
  }

  const isPast = status === "past";
  const isActive = status === "active";

  return (
    <div
      className={`relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border shadow-[0_4px_20px_rgba(0,0,0,0.3)] transition-all duration-300 hover:shadow-[0_8px_40px_rgba(0,0,0,0.4)] group ${
        isActive
          ? "border-[#00d57a]/40 hover:border-[#00d57a]/60"
          : isPast
          ? "border-[#1a1a1a] opacity-70 hover:opacity-90"
          : "border-[#1a1a1a] hover:border-[#2a2a2a]"
      }`}
    >
      {/* Decorative glow on hover */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
            isActive
              ? "bg-gradient-to-br from-[#00d57a]/10 to-transparent"
              : "bg-gradient-to-br from-accent/5 to-transparent"
          }`}
        />
      </div>

      <div className="relative p-6">
        {/* Header: Name + Badges */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 flex-wrap mb-2">
              <h3 className="text-lg font-bold text-white truncate">{season.name}</h3>

              {/* Status Badge */}
              {isActive && (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-[#00d57a]/20 text-[#00d57a] border border-[#00d57a]/30">
                  Live
                </span>
              )}

              {/* Type Badge */}
              {season.isTournament ? (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-accent/20 text-accent border border-accent/30">
                  Tournament
                </span>
              ) : isOfficial ? (
                <span className="px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider rounded-full bg-white/10 text-white/60 border border-white/10">
                  Official Season
                </span>
              ) : null}
            </div>

            {/* Dates */}
            <div className="flex items-center gap-2 text-sm text-white/50">
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatDate(season.startAt)} → {formatDate(season.endAt)}
              </span>
            </div>
          </div>

          {/* Tricolor View Button */}
          <Link href={`/seasons/${season.id}`} className="flex-shrink-0">
            <div className="relative rounded-lg overflow-hidden">
              <div
                className="absolute inset-0 rounded-lg p-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)",
                }}
              >
                <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
              </div>
              <Button className="relative bg-transparent border-none text-white font-medium hover:bg-white/5 px-5 text-sm">
                {isActive ? "View Leaderboard" : "View Season"}
              </Button>
            </div>
          </Link>
        </div>

        {/* Metadata Row */}
        {(season.visibility || allowedChains.length > 0) && (
          <div className="flex items-center gap-4 pt-4 border-t border-[#1a1a1a]">
            {season.visibility && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <Eye className="w-3.5 h-3.5" />
                <span className="capitalize">{season.visibility}</span>
              </div>
            )}
            {allowedChains.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-white/40">
                <LinkIcon className="w-3.5 h-3.5" />
                <span>{allowedChains.join(", ")}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function EmptyState({ message }: { message: string }) {
  return (
    <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-8">
      <div className="flex items-center justify-center text-center">
        <p className="text-white/30 text-sm">{message}</p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SECTION HEADER COMPONENT
// ═══════════════════════════════════════════════════════════════════════
function SectionHeader({
  title,
  icon: Icon,
  count,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  count?: number;
}) {
  return (
    <div className="flex items-center justify-between mt-10 mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="w-5 h-5 text-white/40" />}
        <h2 className="text-white text-lg font-semibold">{title}</h2>
      </div>
      {count !== undefined && count > 0 && (
        <span className="text-sm text-white/40">
          {count} {count === 1 ? "season" : "seasons"}
        </span>
      )}
    </div>
  );
}

export default async function SeasonsPage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { default: prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Fetch ALL seasons
  const seasons = await prisma.season.findMany({
    orderBy: { startAt: "desc" },
  });

  // Split seasons into monthly and tournaments
  const monthlySeasons = seasons.filter((s) => !s.isTournament);
  const tournaments = seasons.filter((s) => s.isTournament);

  // Compute groups using now
  const now = new Date();
  const currentMonthly = monthlySeasons.find(
    (s) => new Date(s.startAt) <= now && new Date(s.endAt) >= now
  );

  const activeTournaments = tournaments.filter(
    (s) => new Date(s.startAt) <= now && new Date(s.endAt) >= now
  );
  const upcomingTournaments = tournaments.filter(
    (s) => new Date(s.startAt) > now
  );
  const pastTournaments = tournaments.filter((s) => new Date(s.endAt) < now);
  const pastSeasons = monthlySeasons.filter((s) => new Date(s.endAt) < now);

  // Combined active seasons (current monthly + active tournaments)
  const hasActiveSeasons = currentMonthly || activeTournaments.length > 0;
  const hasUpcoming = upcomingTournaments.length > 0;
  const hasPast = pastSeasons.length > 0 || pastTournaments.length > 0;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          {/* ═══════════════════════════════════════════════════════════════
              PAGE HEADER - Clean, minimal intro
          ═══════════════════════════════════════════════════════════════ */}
          <div className="mb-8">
            <h1 className="text-white text-2xl font-semibold">Seasons</h1>
            <p className="text-white/60 text-sm mt-1">
              Monthly competitive trading seasons. Win prestige, climb leaderboards, earn badges.
            </p>
          </div>

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Active Seasons
          ═══════════════════════════════════════════════════════════════ */}
          {hasActiveSeasons && (
            <>
              <SectionHeader
                title="Active Seasons"
                icon={Trophy}
                count={(currentMonthly ? 1 : 0) + activeTournaments.length}
              />
              <div className="space-y-4">
                {/* Current Monthly Season */}
                {currentMonthly && (
                  <SeasonCard
                    season={currentMonthly}
                    status="active"
                    isOfficial={true}
                  />
                )}

                {/* Active Tournaments */}
                {activeTournaments.map((tournament) => (
                  <SeasonCard
                    key={tournament.id}
                    season={tournament}
                    status="active"
                  />
                ))}
              </div>
            </>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Upcoming Tournaments
          ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader
            title="Upcoming Tournaments"
            icon={Clock}
            count={upcomingTournaments.length}
          />
          {hasUpcoming ? (
            <div className="space-y-4">
              {upcomingTournaments.map((tournament) => (
                <SeasonCard
                  key={tournament.id}
                  season={tournament}
                  status="upcoming"
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No upcoming tournaments scheduled yet." />
          )}

          {/* ═══════════════════════════════════════════════════════════════
              SECTION: Past Seasons
          ═══════════════════════════════════════════════════════════════ */}
          <SectionHeader
            title="Past Seasons"
            icon={Calendar}
            count={pastSeasons.length + pastTournaments.length}
          />
          {hasPast ? (
            <div className="space-y-4">
              {/* Past Monthly Seasons */}
              {pastSeasons.map((season) => (
                <SeasonCard
                  key={season.id}
                  season={season}
                  status="past"
                  isOfficial={true}
                />
              ))}

              {/* Past Tournaments */}
              {pastTournaments.map((tournament) => (
                <SeasonCard
                  key={tournament.id}
                  season={tournament}
                  status="past"
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No past seasons yet." />
          )}

          {/* ═══════════════════════════════════════════════════════════════
              EMPTY STATE - No seasons at all
          ═══════════════════════════════════════════════════════════════ */}
          {!hasActiveSeasons && !hasUpcoming && !hasPast && (
            <div className="relative rounded-xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] p-12 mt-8">
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
              </div>
              <div className="relative flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent/10 to-accent/5 border border-accent/20 flex items-center justify-center mb-6">
                  <Trophy className="w-10 h-10 text-accent/60" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">No Seasons Found</h3>
                <p className="text-white/40 max-w-md">
                  Check back soon for upcoming competitive trading seasons and tournaments!
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
