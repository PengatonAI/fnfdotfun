"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Navbar } from "@/components/navbar";
import Link from "next/link";

export default function JoinCrewPage({
  params,
}: {
  params: Promise<{ crewId: string }>;
}) {
  const [crewId, setCrewId] = useState<string | null>(null);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    params.then((p) => setCrewId(p.crewId));
  }, [params]);

  const handleJoin = async () => {
    if (!crewId) return;

    const token = searchParams.get("token");

    if (!token) {
      setError("Invalid invite link - missing token");
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const response = await fetch("/api/crews/join", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          crewId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to join crew");
      }

      // Redirect to crew page
      router.push(`/crews/${crewId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsJoining(false);
    }
  };

  if (!crewId) {
    return (
      <>
        <Navbar />
        <div className="container mx-auto py-8 flex items-center justify-center min-h-[60vh]">
          <p>Loading...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 max-w-md">
        <div className="rounded-lg border p-6 space-y-4">
          <h1 className="text-2xl font-bold">Join Crew</h1>
          <p className="text-muted-foreground">
            You&apos;ve been invited to join this crew. Click the button below to accept the invitation.
          </p>

          {error && (
            <div className="p-4 rounded-md bg-destructive/10 text-destructive">
              <p className="text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleJoin}
              disabled={isJoining}
              className="flex-1"
            >
              {isJoining ? "Joining..." : "Join Crew"}
            </Button>
            <Link href="/crews">
              <Button variant="outline">Cancel</Button>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

