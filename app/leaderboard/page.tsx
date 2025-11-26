import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import LeaderboardClient from "./leaderboard-client";
import Link from "next/link";
import { Target, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCurrentUserBasicInfo(userId: string) {
  try {
    // Dynamic import to avoid build-time initialization
    const { prisma } = await import("@/lib/prisma");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        image: true,
        crews: {
          select: {
            crew: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
          },
          take: 1,
        },
      },
    });

    if (!user) return null;

    return {
      id: user.id,
      username: user.username,
      image: user.image,
      crew: user.crews[0]?.crew || null,
    };
  } catch (error) {
    console.error("Error fetching user info:", error);
    return null;
  }
}

export default async function LeaderboardPage() {
  // Dynamic import to avoid build-time initialization
  const { auth } = await import("@/lib/auth");

  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Get basic user info (avatar, username, crew badge) - not stats
  const userInfo = await getCurrentUserBasicInfo(session.user.id);

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 1: PREMIUM TABS
        ═══════════════════════════════════════════════════════════════════════ */}
        <div className="flex items-center gap-2 p-1.5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl w-fit">
          <Link
            href="/leaderboard"
            className="relative px-6 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white transition-all duration-200 tricolor-hover-border"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Users
            </div>
          </Link>
          <Link
            href="/leaderboard/crews"
            className="px-6 py-2.5 text-sm font-medium rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Crews
            </div>
          </Link>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════════
            SECTION 2: LEADERBOARD CONTENT (Hero + Filters + Table)
        ═══════════════════════════════════════════════════════════════════════ */}
        <LeaderboardClient 
          initialData={null} 
          currentUserId={session.user.id}
          userInfo={userInfo}
        />
      </div>
    </>
  );
}
