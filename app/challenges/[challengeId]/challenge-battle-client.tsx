"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  username: string | null;
  image: string | null;
}

interface Crew {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdByUserId: string;
  members: { userId: string }[];
}

interface WinnerCrew {
  id: string;
  name: string;
  avatarUrl: string | null;
}

interface Challenge {
  id: string;
  fromCrewId: string;
  toCrewId: string;
  fromCrew: Crew;
  toCrew: Crew;
  status: string;
  type: string;
  durationHours: number;
  startAt: string | null;
  endAt: string | null;
  winnerCrewId: string | null;
  winnerCrew: WinnerCrew | null;
  createdBy: User;
  createdAt: string;
}

interface MemberPnL {
  userId: string;
  username: string | null;
  image: string | null;
  realizedPnl: number;
  totalPnl: number;
  volume: number;
  totalTrades: number;
}

interface CrewPnLSnapshot {
  crewId: string;
  crewName: string;
  avatarUrl: string | null;
  totalPnl: number;
  realizedPnl: number;
  volume: number;
  totalTrades: number;
  members: MemberPnL[];
}

interface PnLResponse {
  fromCrew: CrewPnLSnapshot;
  toCrew: CrewPnLSnapshot;
  now: string;
  startAt: string;
  endAt: string | null;
  challengeId: string;
  status: string;
}

interface ChallengeBattleClientProps {
  challengeId: string;
  challenge: Challenge;
  currentUserId: string;
}

export default function ChallengeBattleClient({
  challengeId,
  challenge: initialChallenge,
  currentUserId,
}: ChallengeBattleClientProps) {
  const [challenge] = useState(initialChallenge);
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const router = useRouter();

  // Only fetch PnL if challenge is active
  const shouldFetchPnL = challenge.status === "active";
  
  const { data: pnlData, error: pnlError, isLoading: pnlLoading } = useSWR<PnLResponse>(
    shouldFetchPnL ? `/api/challenges/${challengeId}/pnl` : null,
    fetcher,
    { refreshInterval: 10000 } // Poll every 10 seconds
  );

  // Update countdown timer
  useEffect(() => {
    if (!challenge.endAt || challenge.status !== "active") {
      setTimeRemaining("");
      return;
    }

    const updateTimer = () => {
      const end = new Date(challenge.endAt!);
      const now = new Date();
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        setTimeRemaining("Finalizing...");
        // Refresh to get completed status
        router.refresh();
        return;
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeRemaining(`${days}d ${hours}h ${minutes}m ${seconds}s`);
      } else if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [challenge.endAt, challenge.status, router]);

  const formatPnL = (value: number) => {
    const formatted = Math.abs(value).toFixed(2);
    if (value >= 0) {
      return `+$${formatted}`;
    }
    return `-$${formatted}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Determine who's winning
  const getLeader = () => {
    if (!pnlData) return null;
    if (pnlData.fromCrew.realizedPnl > pnlData.toCrew.realizedPnl) {
      return "from";
    } else if (pnlData.toCrew.realizedPnl > pnlData.fromCrew.realizedPnl) {
      return "to";
    }
    return "tie";
  };

  const leader = getLeader();

  // Render completed challenge view
  if (challenge.status === "completed") {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Link href="/challenges" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Challenges
          </Link>
          <span className="px-3 py-1 text-sm font-medium bg-muted text-muted-foreground rounded-full">
            Completed
          </span>
        </div>

        {/* Battle Title */}
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">
            {challenge.fromCrew.name} vs {challenge.toCrew.name}
          </h1>
          <p className="text-muted-foreground">
            Challenge ended {challenge.endAt && formatDate(challenge.endAt)}
          </p>
        </div>

        {/* Winner Banner */}
        <div className="rounded-xl border-2 border-primary bg-primary/10 p-8 text-center">
          {challenge.winnerCrew ? (
            <>
              <p className="text-lg text-muted-foreground mb-2">Winner</p>
              <div className="flex items-center justify-center gap-4">
                {challenge.winnerCrew.avatarUrl ? (
                  <Image
                    src={challenge.winnerCrew.avatarUrl}
                    alt={challenge.winnerCrew.name}
                    width={64}
                    height={64}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-2xl">
                      {challenge.winnerCrew.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <h2 className="text-4xl font-bold text-primary">
                  {challenge.winnerCrew.name}
                </h2>
              </div>
            </>
          ) : (
            <div>
              <p className="text-lg text-muted-foreground mb-2">Result</p>
              <h2 className="text-4xl font-bold">Draw</h2>
            </div>
          )}
        </div>

        {/* Back to Challenges */}
        <div className="text-center">
          <Link href="/challenges">
            <Button>View All Challenges</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Render pending/declined challenge view
  if (challenge.status !== "active") {
    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <Link href="/challenges" className="text-sm text-muted-foreground hover:text-foreground">
            ← Back to Challenges
          </Link>
          <span className="px-3 py-1 text-sm font-medium bg-yellow-500/10 text-yellow-500 rounded-full capitalize">
            {challenge.status}
          </span>
        </div>

        <div className="text-center py-12">
          <h1 className="text-3xl font-bold mb-4">
            {challenge.fromCrew.name} vs {challenge.toCrew.name}
          </h1>
          <p className="text-muted-foreground">
            This challenge is {challenge.status}. Live scoreboard is only available for active challenges.
          </p>
          <Link href="/challenges" className="mt-6 inline-block">
            <Button>Back to Challenges</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Render active challenge scoreboard
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href="/challenges" className="text-sm text-muted-foreground hover:text-foreground">
          ← Back to Challenges
        </Link>
        <span className="px-3 py-1 text-sm font-medium bg-green-500/20 text-green-500 rounded-full">
          Live Battle
        </span>
      </div>

      {/* Battle Title */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">
          {challenge.fromCrew.name} vs {challenge.toCrew.name}
        </h1>
        <p className="text-muted-foreground">
          PnL Challenge • {challenge.durationHours}h Duration
        </p>
      </div>

      {/* Countdown Timer */}
      {timeRemaining && (
        <div className="text-center">
          <div className="inline-block rounded-xl border border-border bg-card px-8 py-4">
            <p className="text-sm text-muted-foreground mb-1">Time Remaining</p>
            <p className="text-3xl font-mono font-bold text-green-500">
              {timeRemaining}
            </p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {pnlLoading && !pnlData && (
        <div className="text-center py-8 text-muted-foreground">
          Loading live scores...
        </div>
      )}

      {/* Error State */}
      {pnlError && (
        <div className="text-center py-8 text-red-500">
          Failed to load scores. Retrying...
        </div>
      )}

      {/* Scoreboard */}
      {pnlData && (
        <>
          {/* Main Score Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* From Crew Card */}
            <div
              className={`rounded-xl border-2 p-6 ${
                leader === "from"
                  ? "border-green-500 bg-green-500/5"
                  : leader === "to"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                {pnlData.fromCrew.avatarUrl ? (
                  <Image
                    src={pnlData.fromCrew.avatarUrl}
                    alt={pnlData.fromCrew.crewName}
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {pnlData.fromCrew.crewName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{pnlData.fromCrew.crewName}</h3>
                  {leader === "from" && (
                    <span className="text-sm text-green-500 font-medium">Leading</span>
                  )}
                </div>
              </div>

              {/* Total PnL */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-1">Realized PnL</p>
                <p
                  className={`text-4xl font-bold ${
                    pnlData.fromCrew.realizedPnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPnL(pnlData.fromCrew.realizedPnl)}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-medium">${pnlData.fromCrew.volume.toFixed(2)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="font-medium">{pnlData.fromCrew.totalTrades}</p>
                </div>
              </div>

              {/* Member Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Members</h4>
                <div className="space-y-2">
                  {pnlData.fromCrew.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {member.image ? (
                          <Image
                            src={member.image}
                            alt={member.username || "Member"}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary">
                              {(member.username || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm">{member.username || "Unknown"}</span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          member.realizedPnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatPnL(member.realizedPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* VS Divider (Mobile) */}
            <div className="md:hidden flex items-center justify-center">
              <div className="px-4 py-2 rounded-full bg-muted text-muted-foreground font-bold">
                VS
              </div>
            </div>

            {/* To Crew Card */}
            <div
              className={`rounded-xl border-2 p-6 ${
                leader === "to"
                  ? "border-green-500 bg-green-500/5"
                  : leader === "from"
                  ? "border-red-500/30 bg-red-500/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-4 mb-6">
                {pnlData.toCrew.avatarUrl ? (
                  <Image
                    src={pnlData.toCrew.avatarUrl}
                    alt={pnlData.toCrew.crewName}
                    width={56}
                    height={56}
                    className="rounded-full"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold text-xl">
                      {pnlData.toCrew.crewName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
                <div>
                  <h3 className="text-xl font-bold">{pnlData.toCrew.crewName}</h3>
                  {leader === "to" && (
                    <span className="text-sm text-green-500 font-medium">Leading</span>
                  )}
                </div>
              </div>

              {/* Total PnL */}
              <div className="text-center mb-6">
                <p className="text-sm text-muted-foreground mb-1">Realized PnL</p>
                <p
                  className={`text-4xl font-bold ${
                    pnlData.toCrew.realizedPnl >= 0 ? "text-green-500" : "text-red-500"
                  }`}
                >
                  {formatPnL(pnlData.toCrew.realizedPnl)}
                </p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Volume</p>
                  <p className="font-medium">${pnlData.toCrew.volume.toFixed(2)}</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-xs text-muted-foreground">Trades</p>
                  <p className="font-medium">{pnlData.toCrew.totalTrades}</p>
                </div>
              </div>

              {/* Member Breakdown */}
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">Members</h4>
                <div className="space-y-2">
                  {pnlData.toCrew.members.map((member) => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between p-2 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-2">
                        {member.image ? (
                          <Image
                            src={member.image}
                            alt={member.username || "Member"}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        ) : (
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs text-primary">
                              {(member.username || "?").charAt(0).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="text-sm">{member.username || "Unknown"}</span>
                      </div>
                      <span
                        className={`text-sm font-medium ${
                          member.realizedPnl >= 0 ? "text-green-500" : "text-red-500"
                        }`}
                      >
                        {formatPnL(member.realizedPnl)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Live Update Indicator */}
          <div className="text-center text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
              Live • Updates every 10 seconds
            </span>
          </div>

          {/* Timeline */}
          <div className="rounded-xl border border-border bg-card p-6">
            <h3 className="text-lg font-semibold mb-4">Challenge Timeline</h3>
            <div className="flex items-center justify-between text-sm">
              <div>
                <p className="text-muted-foreground">Started</p>
                <p className="font-medium">{formatDate(pnlData.startAt)}</p>
              </div>
              <div className="flex-1 mx-4 h-1 bg-muted rounded-full relative">
                <div
                  className="absolute top-0 left-0 h-full bg-green-500 rounded-full"
                  style={{
                    width: `${Math.min(
                      100,
                      ((new Date().getTime() - new Date(pnlData.startAt).getTime()) /
                        (new Date(pnlData.endAt!).getTime() - new Date(pnlData.startAt).getTime())) *
                        100
                    )}%`,
                  }}
                />
              </div>
              <div className="text-right">
                <p className="text-muted-foreground">Ends</p>
                <p className="font-medium">{pnlData.endAt && formatDate(pnlData.endAt)}</p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

