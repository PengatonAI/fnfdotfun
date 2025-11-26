import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import PnLCardBuilder from "./pnl-card-builder";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export default async function PnLCardPage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Fetch user's crew membership for crew mode option
  const crewMember = await prisma.crewMember.findFirst({
    where: { userId: session.user.id },
    select: { crewId: true },
  });

  // Fetch the latest SharedCard to get saved settings
  const savedCard = await prisma.sharedCard.findFirst({
    where: {
      userId: session.user.id,
      cardType: "user",
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Parse saved settings from snapshotData
  let savedSettings: {
    theme?: string;
    backgroundColor?: string;
    accentColor?: string;
    showAvatar?: boolean;
    showUsername?: boolean;
    showPnl?: boolean;
    showVolume?: boolean;
    showWinRate?: boolean;
    showTotalTrades?: boolean;
    font?: string;
    frame?: string;
    badges?: string[];
    mode?: "user" | "crew";
    timeRange?: "24h" | "7d" | "30d" | "all";
  } | null = null;

  if (savedCard) {
    try {
      const snapshot = JSON.parse(savedCard.snapshotData);
      if (snapshot.settings) {
        savedSettings = {
          theme: snapshot.settings.theme,
          backgroundColor: snapshot.settings.backgroundColor,
          accentColor: snapshot.settings.accentColor,
          showAvatar: snapshot.settings.showAvatar,
          showUsername: snapshot.settings.showUsername,
          showPnl: snapshot.settings.showPnl,
          showVolume: snapshot.settings.showVolume,
          showWinRate: snapshot.settings.showWinRate,
          showTotalTrades: snapshot.settings.showTotalTrades,
          font: snapshot.settings.font,
          frame: snapshot.settings.frame,
          badges: snapshot.settings.badges,
          mode: snapshot.settings.mode,
          timeRange: snapshot.settings.timeRange || savedCard.timeframe,
        };
      }
    } catch {
      // If parsing fails, leave as null
    }
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4">
        <PnLCardBuilder
          initialCrewId={crewMember?.crewId}
          savedSettings={savedSettings}
        />
      </div>
    </>
  );
}
