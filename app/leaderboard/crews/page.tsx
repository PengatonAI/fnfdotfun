import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import CrewLeaderboardClient from "./crew-leaderboard-client";
import Link from "next/link";
import { Target, Users } from "lucide-react";

export const dynamic = "force-dynamic";

async function getCurrentUserCrewInfo(userId: string) {
  try {
    const membership = await prisma.crewMember.findFirst({
      where: { 
        userId: userId,
      },
      select: {
        crew: {
          select: {
            id: true,
            name: true,
            avatarUrl: true,
            _count: {
              select: { members: true },
            },
          },
        },
      },
    });

    if (!membership) return null;

    return {
      id: membership.crew.id,
      name: membership.crew.name,
      avatarUrl: membership.crew.avatarUrl,
      memberCount: membership.crew._count.members,
    };
  } catch (error) {
    console.error("Error fetching crew info:", error);
    return null;
  }
}

export default async function CrewLeaderboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  // Get basic crew info (avatar, name, member count) - not stats
  const crewInfo = await getCurrentUserCrewInfo(session.user.id);

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
            className="px-6 py-2.5 text-sm font-medium rounded-lg text-white/50 hover:text-white hover:bg-white/5 transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4" />
              Users
            </div>
          </Link>
          <Link
            href="/leaderboard/crews"
            className="relative px-6 py-2.5 text-sm font-medium rounded-lg bg-white/10 text-white transition-all duration-200 tricolor-hover-border"
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
        <CrewLeaderboardClient 
          initialData={null} 
          crewInfo={crewInfo}
        />
      </div>
    </>
  );
}
