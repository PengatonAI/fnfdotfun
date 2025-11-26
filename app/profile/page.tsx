import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import ProfileClient from "./profile-client";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  // Debug logging
  console.log("🔍 PROFILE PAGE:", {
    hasSession: !!session,
    hasUserId: !!session?.user?.id,
    userId: session?.user?.id,
    userEmail: session?.user?.email,
    sessionKeys: session ? Object.keys(session) : [],
    userKeys: session?.user ? Object.keys(session.user) : [],
  });

  if (!session?.user?.id) {
    console.log("❌ PROFILE PAGE: Redirecting to login - missing session or user.id");
    redirect("/login");
  }

  const userId = session.user.id;

  // Fetch user with accounts
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      username: true,
      xHandle: true,
      accounts: {
        select: {
          provider: true,
        },
      },
    },
  });

  if (!user) {
    console.log("❌ PROFILE PAGE: User not found in database, redirecting to login. Session user.id:", userId);
    redirect("/login");
  }

  console.log("✅ PROFILE PAGE: User found, rendering page");

  // Fetch user's crew membership
  const crewMember = await prisma.crewMember.findFirst({
    where: { userId },
    include: {
      crew: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
    },
  });

  // Fetch recent trades
  const recentTrades = await prisma.trade.findMany({
    where: { userId },
    orderBy: { timestamp: "desc" },
    take: 5,
    select: {
      id: true,
      chain: true,
      timestamp: true,
      direction: true,
      tokenOutSymbol: true,
      tokenInSymbol: true,
      normalizedAmountOut: true,
      price: true,
      nativePrice: true,
      usdPricePerToken: true,
      usdValue: true,
      walletAddress: true,
      txHash: true,
      raw: true,
    },
  });

  // Fetch user's latest PnL card
  const latestPnLCard = await prisma.sharedCard.findFirst({
    where: {
      userId: userId,
      cardType: "user",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Parse the card data if it exists
  let pnlCardData: {
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
  } | null = null;

  if (latestPnLCard) {
    try {
      const snapshot = JSON.parse(latestPnLCard.snapshotData);
      pnlCardData = {
        cardId: latestPnLCard.shareToken,
        settings: snapshot.settings || {
          theme: "dark",
          backgroundColor: "#111111",
          accentColor: "#A855F7",
          showPnl: true,
          showVolume: true,
          showWinRate: true,
          showTotalTrades: true,
          frame: "none",
          badges: [],
          font: "Inter",
        },
        stats: snapshot.stats || { pnl: {} },
        range: latestPnLCard.timeframe || "all",
      };
    } catch {
      // If parsing fails, leave as null
    }
  }

  // Transform crew member data for client
  const crewMemberData = crewMember ? {
    role: crewMember.role,
    crew: {
      id: crewMember.crew.id,
      name: crewMember.crew.name,
      avatarUrl: crewMember.crew.avatarUrl,
    },
  } : null;

  return (
    <>
      <Navbar />
      <ProfileClient
        user={user}
        crewMember={crewMemberData}
        recentTrades={recentTrades as any}
        pnlCardData={pnlCardData}
      />
    </>
  );
}
