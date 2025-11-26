"use client";

import Link from "next/link";

interface Tournament {
  id: string;
  name: string;
  startAt: Date;
  endAt: Date;
  userJoined: boolean;
  crewJoined: boolean;
}

interface TournamentsDashboardCardProps {
  tournaments: Tournament[];
  userBestRank?: number | null;
  userPerformance?: number | null;
  totalPrizePool?: number;
  userContribution?: number;
  bestPerformance?: number | null;
}

export function TournamentsDashboardCard({
  tournaments,
  userBestRank,
  userPerformance,
  totalPrizePool = 0,
  userContribution = 0,
  bestPerformance,
}: TournamentsDashboardCardProps) {
  const activeTournamentCount = tournaments.length;
  const joinedCount = tournaments.filter(t => t.userJoined).length;

  return (
    <Link
      href="/challenges"
      className="rounded-xl bg-bg-card border border-border-soft p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)] h-full flex flex-col transition-all duration-200 hover:border-border-mid hover:shadow-[0_4px_30px_rgba(0,0,0,0.4)]"
    >
      <h2 className="text-lg font-semibold text-white mb-6">Tournaments</h2>

      {/* Stats Grid - 3x2 layout like mockup */}
      <div className="grid grid-cols-3 gap-4 flex-1">
        {/* Active Tournaments */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            Active Tournaments
          </div>
          <span className="text-2xl font-bold text-white">
            #{activeTournamentCount}
          </span>
        </div>

        {/* Your Best Rank */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            Your Best Rank
          </div>
          <span className="text-2xl font-bold text-white">
            {userBestRank ? `#${userBestRank}` : "—"}
          </span>
        </div>

        {/* Your Performance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Your performance
          </div>
          <span className={`text-2xl font-bold ${userPerformance && userPerformance > 0 ? "text-profit" : "text-white"}`}>
            {userPerformance ? `+${userPerformance}%` : "—"}
          </span>
        </div>

        {/* Prize Pool */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            $ Prize Pool
          </div>
          <span className="text-2xl font-bold text-white">
            ${totalPrizePool.toLocaleString()}
          </span>
        </div>

        {/* Your Contribution */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Your Contribution
          </div>
          <span className="text-2xl font-bold text-white">
            ${userContribution.toLocaleString()}
          </span>
        </div>

        {/* Best Performance */}
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 text-xs text-text-muted mb-1">
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
            Best Performance
          </div>
          <span className={`text-2xl font-bold ${bestPerformance && bestPerformance > 0 ? "text-profit" : "text-white"}`}>
            {bestPerformance ? `+${bestPerformance}%` : "—"}
          </span>
        </div>
      </div>

      {/* Active tournament badges at bottom */}
      {tournaments.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border-soft">
          <div className="flex flex-wrap gap-2">
            {tournaments.slice(0, 3).map((tournament) => (
              <span
                key={tournament.id}
                className={`text-xs px-2 py-1 rounded-full ${
                  tournament.userJoined
                    ? "bg-profit/20 text-profit"
                    : "bg-accent/20 text-accent"
                }`}
              >
                {tournament.userJoined ? "✓ " : ""}{tournament.name.slice(0, 15)}{tournament.name.length > 15 ? "..." : ""}
              </span>
            ))}
            {tournaments.length > 3 && (
              <span className="text-xs px-2 py-1 text-text-muted">
                +{tournaments.length - 3} more
              </span>
            )}
          </div>
        </div>
      )}
    </Link>
  );
}

