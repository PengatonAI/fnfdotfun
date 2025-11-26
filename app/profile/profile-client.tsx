"use client";

import { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ChangePictureDialog from "./change-picture-dialog";
import EditProfileModal from "./edit-profile-modal";
import PnLCardPreview from "@/components/pnl-card/pnl-card-preview";
import { ExternalLink, Trophy, TrendingUp, Award, Target, Zap, Lock, CheckCircle, Wallet, Crown, Users, BarChart3, Pencil } from "lucide-react";
import { format } from "date-fns";

interface User {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  username: string | null;
  xHandle: string | null;
  accounts: { provider: string }[];
}

interface CrewMember {
  role: string;
  crew: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface Trade {
  id: string;
  chain: string;
  timestamp: Date;
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
}

interface PnLCardData {
  cardId: string;
  settings: {
    theme: string;
    backgroundColor: string;
    accentColor: string;
    showPnl?: boolean;
    showVolume?: boolean;
    showWinRate?: boolean;
    showTotalTrades?: boolean;
    frame?: string;
    badges?: string[];
    font?: string;
  };
  stats: {
    pnl?: {
      totalPnl?: number;
      realizedPnl?: number;
      unrealizedPnl?: number;
      winRate?: number;
      volume?: number;
      totalTrades?: number;
    };
  };
  range: string;
}

interface ProfileClientProps {
  user: User;
  crewMember: CrewMember | null;
  recentTrades: Trade[];
  pnlCardData: PnLCardData | null;
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
  const absValue = Math.abs(value);
  if (absValue >= 1000000) {
    return `$${(absValue / 1000000).toFixed(2)}M`;
  }
  if (absValue >= 1000) {
    return `$${(absValue / 1000).toFixed(2)}K`;
  }
  return `$${absValue.toFixed(2)}`;
}

const safeDate = (value: Date | string) => {
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

export default function ProfileClient({
  user: initialUser,
  crewMember,
  recentTrades,
  pnlCardData,
}: ProfileClientProps) {
  const [user, setUser] = useState(initialUser);
  const [bio, setBio] = useState("");
  const [tagline, setTagline] = useState("Ready to dominate the markets");
  const [showChangePictureDialog, setShowChangePictureDialog] = useState(false);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const router = useRouter();

  // Fetch PnL data
  const { data: pnlData, isLoading: loadingPnl } = useSWR("/api/profile/pnl", fetcher, {
    refreshInterval: 15000,
  });

  const hasGoogle = user.accounts.some((acc) => acc.provider === "google");
  const hasTwitter = user.accounts.some((acc) => acc.provider === "twitter");

  const handlePictureUpdated = (newImageUrl: string) => {
    setUser({ ...user, image: newImageUrl });
    router.refresh();
  };

  const handleProfileUpdated = (data: {
    image?: string;
    username?: string;
    bio?: string;
    tagline?: string;
  }) => {
    const updates: Partial<typeof user> = {};
    if (data.image) updates.image = data.image;
    if (data.username) updates.username = data.username;
    setUser({ ...user, ...updates });
    if (data.bio !== undefined) setBio(data.bio);
    if (data.tagline !== undefined) setTagline(data.tagline);
    router.refresh();
  };

  // Get user initial for fallback avatar
  const getUserInitial = () => {
    if (user.username) return user.username[0].toUpperCase();
    if (user.name) return user.name[0].toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  };

  // PnL stats
  const totalPnL = pnlData?.totalPnL ?? 0;
  const realizedPnL = pnlData?.realizedPnL ?? 0;
  const unrealizedPnL = pnlData?.unrealizedPnL ?? 0;
  const winRate = pnlData?.metrics?.winRate ?? 0;
  const volume = pnlData?.metrics?.volume ?? 0;
  const avgWin = pnlData?.metrics?.avgWin ?? 0;
  const avgLoss = pnlData?.metrics?.avgLoss ?? 0;
  const totalTrades = pnlData?.metrics?.totalTrades ?? 0;

  // Achievement calculations (client-side)
  const achievements = [
    {
      id: "pnl-10k",
      title: "$10K PnL Milestone",
      description: "Reach $10,000 in total PnL",
      icon: TrendingUp,
      unlocked: totalPnL >= 10000,
      progress: Math.min(100, (totalPnL / 10000) * 100),
    },
    {
      id: "trades-100",
      title: "100 Trades Milestone",
      description: "Complete 100 trades",
      icon: Target,
      unlocked: totalTrades >= 100,
      progress: Math.min(100, (totalTrades / 100) * 100),
    },
    {
      id: "perfect-month",
      title: "Perfect Month",
      description: "Achieve positive PnL for 30 consecutive days",
      icon: Crown,
      unlocked: false,
      progress: 0,
    },
    {
      id: "volume-50k",
      title: "$50K Volume",
      description: "Reach $50,000 in trading volume",
      icon: BarChart3,
      unlocked: volume >= 50000,
      progress: Math.min(100, (volume / 50000) * 100),
    },
  ];

  // Transform pnlCardData for preview
  const previewSettings = pnlCardData ? {
    theme: pnlCardData.settings.theme || "dark",
    backgroundColor: pnlCardData.settings.backgroundColor || "#111111",
    accentColor: pnlCardData.settings.accentColor || "#A855F7",
    showAvatar: true,
    showUsername: true,
    showPnl: pnlCardData.settings.showPnl ?? true,
    showVolume: pnlCardData.settings.showVolume ?? true,
    showWinRate: pnlCardData.settings.showWinRate ?? true,
    showTotalTrades: pnlCardData.settings.showTotalTrades ?? true,
    font: pnlCardData.settings.font || "Inter",
    frame: pnlCardData.settings.frame || "none",
    badges: pnlCardData.settings.badges || [],
  } : null;

  const previewStats = pnlCardData ? {
    ...pnlCardData.stats,
    range: pnlCardData.range,
  } : null;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 1: PREMIUM PROFILE HERO BANNER
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_8px_40px_rgba(0,0,0,0.5)]">
        {/* Background decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-gradient-to-br from-accent/5 to-transparent rounded-full blur-3xl" />
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

        {/* Edit Profile Button - Top Right */}
        <div className="absolute top-4 right-4 z-10">
          <Button
            variant="outline"
            onClick={() => setShowEditProfileModal(true)}
            className="h-9 px-4 bg-[#0a0a0a] border-white/10 hover:bg-transparent text-white text-sm rounded-lg tricolor-hover-border"
          >
            <Pencil className="w-3.5 h-3.5 mr-2" />
            Edit Profile
          </Button>
        </div>

        <div className="relative p-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            {/* Left: Avatar + Info */}
            <div className="flex items-center gap-6">
              {/* Large Avatar with Neon Glow */}
              <div className="relative flex-shrink-0 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent/50 via-purple-500/50 to-pink-500/50 rounded-full opacity-0 group-hover:opacity-100 blur-md transition-opacity duration-300" />
                {user.image ? (
                  <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-[#2a2a2a] shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <Image
                      src={user.image}
                      alt={user.username || "Profile"}
                      fill
                      className="object-cover"
                    />
                  </div>
                ) : (
                  <div className="relative w-28 h-28 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 border-2 border-accent/30 flex items-center justify-center shadow-[0_4px_20px_rgba(0,0,0,0.4)]">
                    <span className="text-4xl font-bold text-accent">
                      {getUserInitial()}
                    </span>
                  </div>
                )}
                {/* Online indicator */}
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-500 rounded-full border-3 border-[#0d0d0d]" />
              </div>

              {/* User Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                    {user.username || "Set Username"}
                  </h1>
                </div>
                
                {/* Tagline */}
                <p className="text-lg text-white/60 italic mb-4">
                  {tagline || "Ready to dominate the markets"}
                </p>

                {/* Badges Row */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Crew Badge */}
                  {crewMember && (
                    <Link 
                      href={`/crews/${crewMember.crew.id}`}
                      className="flex items-center gap-2 px-3 py-1.5 bg-accent/10 border border-accent/30 rounded-full hover:bg-accent/20 transition-colors"
                    >
                      {crewMember.crew.avatarUrl ? (
                        <Image src={crewMember.crew.avatarUrl} alt="" width={16} height={16} className="rounded-full" />
                      ) : (
                        <Users className="w-4 h-4 text-accent" />
                      )}
                      <span className="text-xs font-medium text-accent">{crewMember.crew.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-accent/20 rounded text-accent/80">
                        {crewMember.role === "CREATOR" ? "Leader" : "Member"}
                      </span>
                    </Link>
                  )}
                  
                  {/* Top Trader Badge (if applicable) */}
                  {winRate > 0.6 && totalTrades >= 50 && (
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span className="text-xs font-medium text-yellow-400">Top Trader</span>
                    </div>
                  )}

                  {/* X Handle */}
                  {user.xHandle && (
                    <a
                      href={`https://x.com/${user.xHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                    >
                      <svg className="w-3 h-3 text-white/60" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                      </svg>
                      <span className="text-xs text-white/60">@{user.xHandle}</span>
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Quick Stats */}
            <div className="flex items-center gap-6 lg:flex-shrink-0">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{totalTrades}</div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Trades</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
                  {loadingPnl ? "..." : formatPnL(totalPnL)}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Total PnL</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <div className="text-center">
                <div className="text-2xl font-bold text-white">
                  {loadingPnl ? "..." : `${(winRate * 100).toFixed(0)}%`}
                </div>
                <div className="text-xs text-white/40 uppercase tracking-wider">Win Rate</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 2: PREMIUM STATS GRID
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        {/* Total PnL */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Total PnL</span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${totalPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatPnL(totalPnL)}
            </div>
          </div>
        </div>

        {/* Realized PnL */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Realized</span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${realizedPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatPnL(realizedPnL)}
            </div>
          </div>
        </div>

        {/* Unrealized PnL */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Unrealized</span>
            </div>
            <div className={`text-2xl font-bold tracking-tight ${unrealizedPnL >= 0 ? "text-[#00d57a]" : "text-[#ff4a4a]"}`}>
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatPnL(unrealizedPnL)}
            </div>
          </div>
        </div>

        {/* Win Rate */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Trophy className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Win Rate</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : `${(winRate * 100).toFixed(1)}%`}
            </div>
          </div>
        </div>

        {/* Volume */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Volume</span>
            </div>
            <div className="text-2xl font-bold text-white tracking-tight">
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatCompactNumber(volume)}
            </div>
          </div>
        </div>

        {/* Avg Win */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Award className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Avg Win</span>
            </div>
            <div className="text-2xl font-bold text-[#00d57a] tracking-tight">
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatPnL(avgWin)}
            </div>
          </div>
        </div>

        {/* Avg Loss */}
        <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-5 shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-white/40" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Avg Loss</span>
            </div>
            <div className="text-2xl font-bold text-[#ff4a4a] tracking-tight">
              {loadingPnl ? <span className="text-white/30 animate-pulse">...</span> : formatPnL(avgLoss)}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 4: ACHIEVEMENTS CARD
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex items-center gap-3 mb-6">
          <Trophy className="w-5 h-5 text-yellow-400" />
          <h2 className="text-lg font-semibold text-white">Achievements</h2>
          <span className="text-sm text-white/40">
            ({achievements.filter(a => a.unlocked).length}/{achievements.length} unlocked)
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {achievements.map((achievement) => {
            const IconComponent = achievement.icon;
            return (
              <div
                key={achievement.id}
                className={`relative rounded-xl p-5 border transition-all duration-200 ${
                  achievement.unlocked
                    ? "bg-gradient-to-br from-accent/10 to-purple-900/10 border-accent/30 shadow-[0_0_20px_rgba(168,85,247,0.15)]"
                    : "bg-[#0a0a0a] border-[#1a1a1a] opacity-60"
                }`}
              >
                {/* Icon */}
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-3 ${
                  achievement.unlocked
                    ? "bg-accent/20"
                    : "bg-white/5"
                }`}>
                  {achievement.unlocked ? (
                    <IconComponent className="w-6 h-6 text-accent" />
                  ) : (
                    <Lock className="w-5 h-5 text-white/30" />
                  )}
                </div>

                {/* Title & Description */}
                <h3 className={`font-semibold mb-1 ${achievement.unlocked ? "text-white" : "text-white/50"}`}>
                  {achievement.title}
                </h3>
                <p className="text-xs text-white/40 mb-3">
                  {achievement.description}
                </p>

                {/* Progress Bar */}
                {!achievement.unlocked && (
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div 
                      className="absolute inset-y-0 left-0 bg-accent/50 rounded-full transition-all duration-500"
                      style={{ width: `${achievement.progress}%` }}
                    />
                  </div>
                )}

                {/* Unlocked Badge */}
                {achievement.unlocked && (
                  <div className="flex items-center gap-1 text-xs text-accent font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Unlocked
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 5: PNL CARD PREVIEW
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left: Description */}
          <div className="lg:w-1/3 flex flex-col justify-center">
            <h2 className="text-lg font-semibold text-white mb-3">Your PnL Card</h2>
            <p className="text-sm text-white/50 mb-6">
              Showcase your trading performance with a customizable PnL card. 
              Share your stats on social media and flex your gains.
            </p>
            <Link href="/pnl-card">
              <Button 
                variant="outline"
                className="w-full lg:w-auto bg-[#0a0a0a] border-white/10 hover:bg-transparent text-white transition-all duration-200 tricolor-hover-border"
              >
                Customize PnL Card
              </Button>
            </Link>
          </div>

          {/* Right: Card Preview */}
          <div className="lg:w-2/3">
            {previewSettings && previewStats ? (
              <PnLCardPreview
                settings={previewSettings}
                stats={previewStats}
                loading={false}
              />
            ) : (
              <div className="rounded-xl border border-[#1a1a1a] bg-[#0a0a0a] p-8 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Wallet className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-white font-semibold mb-2">No PnL Card Yet</h3>
                <p className="text-sm text-white/40 mb-4">
                  Create your first PnL card to showcase your trading stats
                </p>
                <Link href="/pnl-card">
                  <Button size="sm" className="bg-[#0a0a0a] border border-[#2a2a2a] text-white tricolor-hover-border">
                    Create PnL Card
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════
          SECTION 6: RECENT TRADES
      ═══════════════════════════════════════════════════════════════════════ */}
      <div className="relative rounded-xl bg-gradient-to-br from-[#0d0d0d] via-[#111111] to-[#0a0a0a] border border-[#1a1a1a] shadow-[0_4px_20px_rgba(0,0,0,0.3)] overflow-hidden">
        <div className="p-6 pb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">Recent Trades</h2>
          <Link href="/profile/trades">
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs border-white/10 hover:bg-white/5 text-white/60 hover:text-white tricolor-hover-border"
            >
              View All Trades
            </Button>
          </Link>
        </div>
        
        {recentTrades.length === 0 ? (
          <div className="px-6 pb-6">
            <div className="text-center py-8 text-white/40">
              <p className="text-sm">No trades yet. Your most recent trades will appear here.</p>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-t border-b border-[#1a1a1a] bg-[#0a0a0a]/50">
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
                    Wallet
                  </th>
                  <th className="text-left px-6 py-3 text-xs font-medium text-white/40 uppercase tracking-wider">
                    Tx
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentTrades.slice(0, 5).map((trade) => {
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
                      <td className="px-6 py-4 text-sm font-mono text-white/40">
                        {formatAddress(trade.walletAddress)}
                      </td>
                      <td className="px-6 py-4">
                        <a
                          href={getExplorerUrl(trade.txHash, trade.chain)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-white/40 hover:text-white transition-colors"
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

      {/* Change Picture Dialog */}
      <ChangePictureDialog
        open={showChangePictureDialog}
        onOpenChange={setShowChangePictureDialog}
        currentImage={user.image}
        onPictureUpdated={handlePictureUpdated}
      />

      {/* Edit Profile Modal */}
      <EditProfileModal
        open={showEditProfileModal}
        onOpenChange={setShowEditProfileModal}
        currentImage={user.image}
        currentUsername={user.username}
        currentBio={bio}
        currentTagline={tagline}
        hasGoogle={hasGoogle}
        hasTwitter={hasTwitter}
        onProfileUpdated={handleProfileUpdated}
      />
    </div>
  );
}

