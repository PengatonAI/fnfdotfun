"use client";

import { signOut, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getPublicDisplayName, formatUsernameWithHandle } from "@/lib/user-utils";
import { Web3Button } from "@/components/web3-button";
import { WhiteDivider } from "@/components/WhiteDivider";
import Image from "next/image";
import useSWR from "swr";
import { fetcher } from "@/lib/swr-fetcher";

export function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();

  // Fetch pending challenge count for badge
  const { data: challengeCount } = useSWR(
    session?.user?.id ? "/api/challenges/unread-count" : null,
    fetcher,
    { refreshInterval: 15000 }
  );
  const pendingChallenges = challengeCount?.pendingIncoming || 0;

  // Debug client-side session - log after it loads
  if (status !== "loading") {
    console.log("🔍 NAVBAR CLIENT SESSION:", {
      status,
      hasSession: !!session,
      hasUserId: !!session?.user?.id,
      userId: session?.user?.id,
      userEmail: session?.user?.email,
      userKeys: session?.user ? Object.keys(session.user) : [],
      fullSession: session, // Log full session to see what's actually there
    });
  }

  const handleLogout = async () => {
    try {
      await signOut({ 
        callbackUrl: "/login",
        redirect: true,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      // Force redirect if signOut fails
      window.location.href = "/login";
    }
  };

  // Wait for session to load - show loading state instead of returning null
  if (status === "loading") {
    return (
      <nav className="border-b border-border-mid bg-bg-main">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="text-sm text-muted-foreground">Loading...</div>
        </div>
        <WhiteDivider />
      </nav>
    );
  }

  // Only return null if session is definitely unauthenticated (not loading)
  if (!session || !session.user?.id) {
    console.log("❌ NAVBAR: No session or user.id after loading, returning null. Status:", status);
    return null;
  }

  return (
    <nav className="border-b border-border bg-[#0b0c0d]">
      <div className="container mx-auto flex items-center justify-between px-4 py-4">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-text-primary">
            <Image 
              src="/logo.png" 
              width={30} 
              height={30} 
              alt="fnf logo" 
              className="rounded-full" 
            />
            fnfdotfun v1
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/dashboard"
              className={`text-sm nav-link-hover ${
                pathname === "/dashboard"
                  ? "text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Dashboard
            </Link>
            <Link
              href="/crews"
              className={`text-sm nav-link-hover ${
                pathname === "/crews"
                  ? "text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Crews
            </Link>
            <Link
              href="/leaderboard"
              className={`text-sm nav-link-hover ${
                pathname === "/leaderboard"
                  ? "text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Leaderboard
            </Link>
            <Link
              href="/seasons"
              className={`text-sm nav-link-hover ${
                pathname === "/seasons"
                  ? "text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Seasons
            </Link>
            <Link
              href="/challenges"
              className={`text-sm nav-link-hover relative flex items-center gap-1 ${
                pathname === "/challenges"
                  ? "text-text-primary font-medium"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              Challenges
              {pendingChallenges > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium bg-red-500 text-white rounded-full">
                  {pendingChallenges > 99 ? "99+" : pendingChallenges}
                </span>
              )}
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Web3Button />
          <Link
            href="/profile"
            className={`text-sm nav-link-hover ${
              pathname === "/profile"
                ? "text-text-primary font-medium"
                : "text-text-muted hover:text-text-primary"
            }`}
          >
            Profile
          </Link>
          {session.user?.image && (
            <Link href="/profile">
              <Image
                src={session.user.image}
                alt={getPublicDisplayName(session.user as any)}
                width={32}
                height={32}
                className="rounded-full cursor-pointer"
              />
            </Link>
          )}
          <span className="text-sm text-text-muted">
            {formatUsernameWithHandle(session.user as any)}
          </span>
          <Button onClick={handleLogout} variant="outline" size="sm">
            Logout
          </Button>
        </div>
      </div>
      <WhiteDivider />
    </nav>
  );
}

