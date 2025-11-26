"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import EditCrewDialog from "./edit-crew-dialog";
import InviteDialog from "./invite-dialog";
import CreateChallengeDialog from "./create-challenge-dialog";
import { getPublicDisplayName, formatUsernameWithHandle, getUserInitial } from "@/lib/user-utils";
import { Sparkline } from "@/app/dashboard/components/sparkline";
import { 
  ExternalLink, 
  Trophy, 
  Users, 
  TrendingUp, 
  Award, 
  Crown, 
  Shield, 
  User,
  BarChart3,
  Swords,
  UserPlus,
  Settings,
  LogOut,
  Activity,
  ChevronRight
} from "lucide-react";
import { format } from "date-fns";

interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  xHandle: string | null;
}

interface CrewMember {
  id: string;
  userId: string;
  role: string;
  joinedAt: string;
  user: UserType;
}

interface Crew {
  id: string;
  name: string;
  description: string | null;
  openToMembers: boolean;
  avatarUrl: string | null;
  bannerUrl: string | null;
  tagline: string | null;
  bio: string | null;
  createdByUserId: string;
  createdBy: UserType;
  members: CrewMember[];
  createdAt: string;
  updatedAt: string;
}

interface JoinRequest {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
  user: UserType;
}

interface CrewActivity {
  id: string;
  crewId: string;
  userId: string | null;
  type: string;
  message: string | null;
  createdAt: string;
  user: UserType | null;
}

interface Trade {
  id: string;
  chain: string;
  timestamp: string;
  direction: string;
  tokenOutSymbol: string | null;
  normalizedAmountOut: number | null;
  price: number | null;
  nativePrice: number | null;
  usdPricePerToken: number | null;
  usdValue: number | null;
  tokenInSymbol: string | null;
  walletAddress: string;
  txHash: string;
  raw: string | null;
  user?: {
    username: string | null;
    image: string | null;
  };
}

interface CrewDetailsClientProps {
  crew: Crew;
  currentUserId: string;
  isCreator: boolean;
  isMember: boolean;
  joinRequests?: JoinRequest[];
  hasPendingRequest?: boolean;
  isInAnotherCrew?: boolean;
  activities?: CrewActivity[];
  crewTrades?: Trade[];
  sparklineData?: number[];
}

// Format PnL value for display
function formatPnL(value: number): string {
  const absValue = Math.abs(value);
  const prefix = value >= 0 ? "$" : "-$";
  if (absValue >= 1000000) {
    return `${prefix}${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `${prefix}${(absValue / 1000).toFixed(2)}K`;
  }
  return `${prefix}${absValue.toFixed(2)}`;
}

// Format compact number
function formatCompactNumber(value: number): string {
  if (value >= 1000000) {
    return `$${(value / 1000000).toFixed(2)}M`;
  }
  if (value >= 1000) {
    return `$${(value / 1000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
}

const safeDate = (value: string | Date) => {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  return format(date, "dd/MM/yyyy, HH:mm:ss");
};

const formatAddress = (addr: string) => {
  if (!addr) return "";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

const getExplorerUrl = (txHash: string, chain: string) => {
  const chainLower = chain.toLowerCase();
  if (chainLower === "solana" || chainLower === "sol") {
    return `https://solscan.io/tx/${txHash}`;
  }
  if (chainLower === "ethereum" || chainLower === "eth" || chainLower === "mainnet") {
    return `https://etherscan.io/tx/${txHash}`;
  }
  if (chainLower === "base") {
    return `https://basescan.org/tx/${txHash}`;
  }
  return `https://etherscan.io/tx/${txHash}`;
};

export default function CrewDetailsClient({
  crew: initialCrew,
  currentUserId,
  isCreator,
  isMember,
  joinRequests: initialJoinRequests = [],
  hasPendingRequest: initialHasPendingRequest = false,
  isInAnotherCrew: initialIsInAnotherCrew = false,
  activities: initialActivities = [],
  crewTrades: initialCrewTrades = [],
  sparklineData: initialSparklineData,
}: CrewDetailsClientProps) {
  const [crew, setCrew] = useState(initialCrew);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showChallengeDialog, setShowChallengeDialog] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);
  const [kickingId, setKickingId] = useState<string | null>(null);
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>(initialJoinRequests);
  const [hasPendingRequest, setHasPendingRequest] = useState(initialHasPendingRequest);
  const [isRequesting, setIsRequesting] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch crew PnL data
  const { data: pnl, error: pnlError, isLoading: loadingPnl } = useSWR(
    `/api/crews/${crew.id}/pnl`,
    fetcher,
    { refreshInterval: 15000 }
  );

  // Fetch crew trades for the Recent Crew Trades section
  const { data: crewTradesData } = useSWR(
    `/api/crews/${crew.id}/trades`,
    fetcher,
    { refreshInterval: 30000 }
  );

  const crewTrades = crewTradesData?.trades || initialCrewTrades;
  const sparklineData = crewTradesData?.sparklineData || initialSparklineData;

  const handleInviteMember = () => {
    setShowInviteDialog(true);
  };

  const handleCrewUpdated = (updatedCrew: Crew) => {
    setCrew(updatedCrew);
    router.refresh();
  };

  const handleLeaveCrew = async () => {
    if (isCreator) {
      const confirmed = confirm(
        "Leaving will transfer ownership to the next oldest member, or delete the crew if you are the last member. Continue?"
      );
      if (!confirmed) {
        return;
      }
    } else {
      if (!confirm("Are you sure you want to leave this crew?")) {
        return;
      }
    }

    setIsLeaving(true);
    try {
      const response = await fetch(`/api/crews/${crew.id}/leave`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to leave crew");
      }

      const result = await response.json();

      if (result.deleted) {
        router.push("/crews");
        setTimeout(() => {
          alert("Crew deleted.");
        }, 100);
      } else {
        router.push("/crews");
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
      setIsLeaving(false);
    }
  };

  const handleKickMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the crew?")) {
      return;
    }

    setKickingId(userId);
    try {
      const response = await fetch(`/api/crews/${crew.id}/kick`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to kick member");
      }

      const updatedCrew = await response.json();
      setCrew(updatedCrew);
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setKickingId(null);
    }
  };

  const handleRequestJoin = async () => {
    setIsRequesting(true);
    try {
      const response = await fetch(`/api/crews/${crew.id}/request-join`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to request join");
      }

      setHasPendingRequest(true);
      alert("Join request sent! The crew creator will review your request.");
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsRequesting(false);
    }
  };

  const handleRequestDecision = async (requestId: string, action: "approve" | "reject") => {
    setProcessingRequestId(requestId);
    try {
      const response = await fetch(
        `/api/crews/${crew.id}/join-requests/${requestId}/decision`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ action }),
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || `Failed to ${action} request`);
      }

      const result = await response.json();

      if (action === "approve" && result.crew) {
        setCrew(result.crew);
      }

      setJoinRequests(joinRequests.filter((r) => r.id !== requestId));
      router.refresh();
    } catch (error) {
      alert(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setProcessingRequestId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getDaysSince = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getCrewAge = () => {
    return getDaysSince(crew.createdAt);
  };

  // Get role badge for member
  const getMemberRole = (member: CrewMember) => {
    if (member.userId === crew.createdByUserId) {
      return { label: "Leader", icon: Crown, color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/30" };
    }
    // Check if founding member (joined within first day of crew creation)
    const crewDate = new Date(crew.createdAt);
    const joinDate = new Date(member.joinedAt);
    const daysDiff = Math.abs(joinDate.getTime() - crewDate.getTime()) / (1000 * 60 * 60 * 24);
    if (daysDiff <= 1) {
      return { label: "Founding Member", icon: Shield, color: "text-purple-400 bg-purple-400/10 border-purple-400/30" };
    }
    return { label: "Member", icon: User, color: "text-slate-400 bg-slate-400/10 border-slate-400/30" };
  };

  // Calculate member PnL
  const getMemberPnL = (userId: string) => {
    if (loadingPnl || pnlError || !pnl?.members) return null;
    const memberData = pnl.members.find((m: { userId: string }) => m.userId === userId);
    return memberData?.pnl?.totalPnL ?? null;
  };

  // Crew stats
  const totalPnL = pnl?.crew?.totalPnL ?? 0;
  const avgWinRate = pnl?.crew?.avgWinRate ?? 0;
  const totalVolume = pnl?.crew?.totalVolume ?? 0;

  return (
    <div className="space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: PREMIUM CREW BANNER (HERO SECTION)
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5),0_0_60px_rgba(168,85,247,0.05)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-3xl" />
          <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-3xl" />
          {/* Grid pattern overlay */}
          <div 
            className="absolute inset-0 opacity-[0.02]"
            style={{
              backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
              backgroundSize: '40px 40px'
            }}
          />
        </div>

        {/* Banner Image Background */}
        {crew.bannerUrl && (
          <div className="absolute inset-0">
            <img
              src={crew.bannerUrl}
              alt={`${crew.name} banner`}
              className="w-full h-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d0d] via-[#0d0d0d]/90 to-transparent" />
          </div>
        )}

        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Left: Logo + Info */}
            <div className="flex items-start gap-6">
              {/* Large Crew Logo with glow */}
              <div className="relative flex-shrink-0">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/40 via-purple-500/40 to-pink-500/40 rounded-2xl blur-md opacity-60" />
                {crew.avatarUrl ? (
                  <div className="relative w-28 h-28 rounded-2xl overflow-hidden border-2 border-[#2a2a2a] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <img
                      src={crew.avatarUrl}
                      alt={crew.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative w-28 h-28 rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <span className="text-4xl font-bold text-accent">
                      {crew.name[0].toUpperCase()}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#00d57a] rounded-full border-3 border-[#0d0d0d]" />
              </div>

              {/* Crew Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {crew.name}
                  </h1>
                  {isCreator && (
                    <span className="px-3 py-1 text-xs font-semibold bg-gradient-to-r from-yellow-500/20 to-amber-500/20 text-yellow-400 rounded-full border border-yellow-500/30">
                      Leader
                    </span>
                  )}
                </div>
                
                {/* Tagline/Motto */}
                <p className="text-lg text-white/50 italic mb-4">
                  {crew.tagline || crew.description || "All or nothing"}
                </p>

                {/* Metadata Row */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-white/40">
                  <span className="flex items-center gap-1.5">
                    <span className="text-white/50">Created by</span>
                    <span className="text-white/70 font-medium">{formatUsernameWithHandle(crew.createdBy)}</span>
                  </span>
                  <span className="text-white/20">•</span>
                  <span className="text-white/50">{formatDate(crew.createdAt)}</span>
                  <span className="text-white/20">•</span>
                  <span className="flex items-center gap-1.5">
                    <span className="text-white/50">Crew age:</span>
                    <span className="text-white/70 font-medium">{getCrewAge()} days</span>
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 lg:flex-shrink-0">
              {isCreator && (
                <>
                  {/* Tricolor Challenge Button */}
                  <div className="relative rounded-lg overflow-hidden">
                    <div 
                      className="absolute inset-0 rounded-lg p-[1px]"
                      style={{
                        background: 'linear-gradient(90deg, #ff4a4a 0%, #ff4a4a 33.33%, #ffffff 33.33%, #ffffff 66.66%, #00d57a 66.66%, #00d57a 100%)',
                      }}
                    >
                      <div className="w-full h-full rounded-[7px] bg-[#0a0a0a]" />
                    </div>
                    <Button 
                      onClick={() => setShowChallengeDialog(true)} 
                      className="relative bg-transparent border-none text-white font-medium hover:bg-white/5"
                    >
                      <Swords className="w-4 h-4 mr-2" />
                      Challenge Crew
                    </Button>
                  </div>
                  <Button 
                    onClick={handleInviteMember} 
                    variant="outline" 
                    className="border-[#2a2a2a] hover:bg-white/5 text-white/70 hover:text-white"
                  >
                    <UserPlus className="w-4 h-4 mr-2" />
                    Invite
                  </Button>
                  <Button 
                    onClick={() => setShowEditDialog(true)} 
                    variant="outline"
                    className="border-[#2a2a2a] hover:bg-white/5 text-white/70 hover:text-white"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  <Button
                    onClick={handleLeaveCrew}
                    variant="destructive"
                    disabled={isLeaving}
                    className="bg-[#ff4a4a]/20 hover:bg-[#ff4a4a]/30 text-[#ff4a4a] border border-[#ff4a4a]/30"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {isLeaving ? "Leaving..." : "Leave"}
                  </Button>
                </>
              )}
              {isMember && !isCreator && (
                <Button
                  onClick={handleLeaveCrew}
                  variant="destructive"
                  disabled={isLeaving}
                  className="bg-[#ff4a4a]/20 hover:bg-[#ff4a4a]/30 text-[#ff4a4a] border border-[#ff4a4a]/30"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  {isLeaving ? "Leaving..." : "Leave Crew"}
                </Button>
              )}
              {!isMember && !isCreator && (
                <>
                  {hasPendingRequest ? (
                    <Button variant="outline" disabled className="border-[#2a2a2a] text-white/40">
                      Request Pending
                    </Button>
                  ) : !crew.openToMembers ? (
                    <Button variant="outline" disabled className="border-[#2a2a2a] text-white/40">
                      Invite Only
                    </Button>
                  ) : crew.members.length >= 5 ? (
                    <Button variant="outline" disabled className="border-[#2a2a2a] text-white/40">
                      Crew is Full
                    </Button>
                  ) : (
                    <Button
                      onClick={handleRequestJoin}
                      disabled={isRequesting}
                      className="bg-accent hover:bg-accent/90 text-white"
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      {isRequesting ? "Requesting..." : "Request to Join"}
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: THREE KEY STAT CARDS
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Crew Total PnL */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-[#00d57a]/10 to-transparent rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Crew Total PnL</span>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${totalPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
              {loadingPnl ? (
                <span className="text-white/30 animate-pulse">Loading...</span>
              ) : pnlError ? (
                "$0.00"
              ) : (
                formatCompactNumber(totalPnL)
              )}
            </div>
          </div>
        </div>

        {/* Average Win Rate */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-accent/10 to-transparent rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Avg Win Rate</span>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {loadingPnl ? (
                <span className="text-white/30 animate-pulse">Loading...</span>
              ) : pnlError ? (
                "0.0%"
              ) : (
                `${(avgWinRate * 100).toFixed(1)}%`
              )}
            </div>
          </div>
        </div>

        {/* Total Volume */}
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-purple-500/10 to-transparent rounded-full blur-2xl" />
          </div>
          <div className="relative">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-3xl font-bold text-white tracking-tight">
              {loadingPnl ? (
                <span className="text-white/30 animate-pulse">Loading...</span>
              ) : pnlError ? (
                "$0.00"
              ) : (
                formatCompactNumber(totalVolume)
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 3: PERFORMANCE CHART - WHITE LINE
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-white/[0.02] to-transparent rounded-full blur-2xl" />
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-white/40" />
            <h2 className="text-lg font-semibold text-white">Performance</h2>
          </div>
          
          {/* PnL Labels */}
          <div className="flex justify-between mb-2">
            <span className="text-xs text-white/40">
              {sparklineData && sparklineData.length > 1 
                ? formatPnL(sparklineData[0])
                : "$0"}
            </span>
            <span className="text-xs text-white/40">
              {sparklineData && sparklineData.length > 1 
                ? formatPnL(sparklineData[sparklineData.length - 1])
                : formatPnL(totalPnL)}
            </span>
          </div>
          
          {/* Chart - WHITE LINE */}
          <div className="relative h-32 w-full">
            {sparklineData && sparklineData.length > 1 ? (
              <Sparkline 
                data={sparklineData} 
                width={800} 
                height={128} 
                color="#FFFFFF"
                className="w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center border border-dashed border-[#1a1a1a] rounded-lg">
                <span className="text-sm text-white/20">No performance data yet</span>
              </div>
            )}
            {/* Decorative baseline */}
            <div className="absolute inset-x-0 bottom-0 border-t border-dashed border-white/10" />
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: MEMBERS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Members</h2>
              <span className="text-sm text-white/40">({crew.members.length}/5)</span>
            </div>
            {crew.members.length >= 5 && (
              <span className="text-xs px-3 py-1 bg-amber-500/10 text-amber-400 rounded-full border border-amber-500/20">
                Crew is full
              </span>
            )}
          </div>
          
          <div className="space-y-3">
            {crew.members.map((member) => {
              const roleInfo = getMemberRole(member);
              const memberPnL = getMemberPnL(member.userId);
              const RoleIcon = roleInfo.icon;
              
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#2a2a2a] transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4">
                    {/* Avatar with glow on hover */}
                    <div className="relative">
                      <div className="absolute -inset-0.5 bg-gradient-to-r from-accent/30 to-purple-500/30 rounded-full blur-sm opacity-0 group-hover:opacity-60 transition-opacity" />
                      {member.user.image ? (
                        <img
                          src={member.user.image}
                          alt={getPublicDisplayName(member.user)}
                          className="relative w-12 h-12 rounded-full border-2 border-[#2a2a2a]"
                        />
                      ) : (
                        <div className="relative w-12 h-12 rounded-full bg-accent/10 border-2 border-[#2a2a2a] flex items-center justify-center">
                          <span className="text-accent font-semibold">
                            {getUserInitial(member.user)}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">
                          {formatUsernameWithHandle(member.user)}
                        </span>
                        {member.user.id === currentUserId && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 text-accent rounded">
                            You
                          </span>
                        )}
                      </div>
                      {/* Role Badge */}
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${roleInfo.color}`}>
                          <RoleIcon className="w-3 h-3" />
                          {roleInfo.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right side: PnL + Actions */}
                  <div className="flex items-center gap-4">
                    {/* PnL Display */}
                    <div className="text-right">
                      <div className="text-xs text-white/40 mb-0.5 uppercase tracking-wider">PnL</div>
                      <div className={`font-bold ${memberPnL !== null && memberPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
                        {loadingPnl ? (
                          <span className="text-white/30">...</span>
                        ) : memberPnL !== null ? (
                          formatCompactNumber(memberPnL)
                        ) : (
                          "$0.00"
                        )}
                      </div>
                    </div>
                    
                    {/* Kick Button */}
                    {isCreator && member.user.id !== currentUserId && member.user.id !== crew.createdByUserId && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKickMember(member.user.id)}
                        disabled={kickingId === member.user.id}
                        className="border-[#ff4a4a]/20 text-[#ff4a4a] hover:bg-[#ff4a4a]/10 text-xs"
                      >
                        {kickingId === member.user.id ? "..." : "Kick"}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: SEASONS SECTION
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Seasons</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Season Performance */}
            <div className="relative rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Trophy className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/50 uppercase tracking-wider">Season Performance</span>
                </div>
                <p className="text-xl font-semibold text-white/50">Coming Soon</p>
              </div>
            </div>

            {/* Season Wins */}
            <div className="relative rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-[#00d57a]/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Award className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/50 uppercase tracking-wider">Season Wins</span>
                </div>
                <p className="text-xl font-semibold text-white/50">Coming Soon</p>
              </div>
            </div>

            {/* Season Badges */}
            <div className="relative rounded-xl bg-[#0a0a0a] border border-[#1a1a1a] p-5 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-4 h-4 text-white/40" />
                  <span className="text-xs text-white/50 uppercase tracking-wider">Season Badges</span>
                </div>
                <p className="text-xl font-semibold text-white/50">Coming Soon</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: RECENT CREW TRADES
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
        </div>

        <div className="relative p-6 pb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Recent Crew Trades</h2>
          </div>
        </div>
        
        {crewTrades.length === 0 ? (
          <div className="relative px-6 pb-6">
            <div className="text-center py-8 rounded-xl bg-[#0a0a0a]/50 border border-[#1a1a1a]">
              <p className="text-sm text-white/30">No trades yet. Crew members&apos; recent trades will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-[#1a1a1a] bg-[#0a0a0a]/50">
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Timestamp
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Direction
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Token
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody>
                {crewTrades.slice(0, 5).map((trade: Trade) => {
                  let rawData: Record<string, unknown> = {};
                  try {
                    rawData = typeof trade.raw === "string" ? JSON.parse(trade.raw) : trade.raw || {};
                  } catch {
                    rawData = {};
                  }
                  
                  const displaySymbol = (rawData.displayTokenSymbol as string) || trade.tokenOutSymbol;
                  const displayAmount = (rawData.displayAmount as number) ?? trade.normalizedAmountOut;
                  
                  return (
                    <tr key={trade.id} className="border-b border-[#1a1a1a] hover:bg-white/[0.02] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {trade.user?.image ? (
                            <img
                              src={trade.user.image}
                              alt=""
                              className="w-6 h-6 rounded-full border border-[#2a2a2a]"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-accent/10 flex items-center justify-center border border-[#2a2a2a]">
                              <span className="text-[10px] text-accent font-medium">
                                {trade.user?.username?.[0]?.toUpperCase() || "?"}
                              </span>
                            </div>
                          )}
                          <span className="text-sm text-white/70">
                            {trade.user?.username || formatAddress(trade.walletAddress)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50 whitespace-nowrap">
                        {safeDate(trade.timestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2.5 py-1 rounded text-xs font-semibold uppercase ${
                            trade.direction === "BUY"
                              ? "bg-[#00d57a]/20 text-[#00d57a]"
                              : "bg-[#ff4a4a]/20 text-[#ff4a4a]"
                          }`}
                        >
                          {trade.direction}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-white">
                        {displaySymbol || "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-white/50">
                        {displayAmount != null ? (
                          <span>
                            {Number(displayAmount).toLocaleString(undefined, {
                              maximumFractionDigits: 2,
                            })}{" "}
                            {displaySymbol || ""}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={getExplorerUrl(trade.txHash, trade.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/30 hover:text-white transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          JOIN REQUESTS SECTION (Creator Only)
      ═══════════════════════════════════════════════════════════════════════ */}
      {isCreator && joinRequests.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-24 -right-24 w-64 h-64 bg-gradient-to-br from-orange-500/5 to-transparent rounded-full blur-3xl" />
          </div>

          <div className="relative">
            <div className="flex items-center gap-2 mb-6">
              <UserPlus className="w-5 h-5 text-orange-400" />
              <h2 className="text-lg font-semibold text-white">Join Requests</h2>
              <span className="px-2 py-0.5 text-xs font-medium bg-orange-500/20 text-orange-400 rounded-full">
                {joinRequests.length}
              </span>
            </div>
            <div className="space-y-3">
              {joinRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]"
                >
                  <div className="flex items-center gap-4">
                    {request.user.image ? (
                      <img
                        src={request.user.image}
                        alt={getPublicDisplayName(request.user)}
                        className="w-10 h-10 rounded-full border-2 border-[#2a2a2a]"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center border-2 border-[#2a2a2a]">
                        <span className="text-accent font-medium">
                          {getUserInitial(request.user)}
                        </span>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-white">
                        {formatUsernameWithHandle(request.user)}
                      </p>
                      <p className="text-xs text-white/40">
                        Requested {formatDate(request.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleRequestDecision(request.id, "approve")}
                      disabled={processingRequestId === request.id}
                      className="bg-[#00d57a]/20 hover:bg-[#00d57a]/30 text-[#00d57a] border border-[#00d57a]/30"
                    >
                      {processingRequestId === request.id ? "..." : "Approve"}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRequestDecision(request.id, "reject")}
                      disabled={processingRequestId === request.id}
                      className="border-[#2a2a2a] hover:bg-white/5 text-white/60"
                    >
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Edit Crew Dialog */}
      {showEditDialog && (
        <EditCrewDialog
          crew={crew}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          onCrewUpdated={handleCrewUpdated}
        />
      )}

      {/* Invite Dialog */}
      {showInviteDialog && (
        <InviteDialog
          crewId={crew.id}
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
        />
      )}

      {/* Create Challenge Dialog */}
      {showChallengeDialog && (
        <CreateChallengeDialog
          crewId={crew.id}
          crewName={crew.name}
          open={showChallengeDialog}
          onOpenChange={setShowChallengeDialog}
        />
      )}
    </div>
  );
}
