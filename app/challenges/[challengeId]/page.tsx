import { Navbar } from "@/components/navbar";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import ChallengeBattleClient from "./challenge-battle-client";

export default async function ChallengeBattlePage({
  params,
}: {
  params: Promise<{ challengeId: string }>;
}) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const { challengeId } = await params;

  // Fetch challenge with crews
  const challenge = await prisma.challenge.findUnique({
    where: { id: challengeId },
    include: {
      fromCrew: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdByUserId: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      toCrew: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
          createdByUserId: true,
          members: {
            select: {
              userId: true,
            },
          },
        },
      },
      winnerCrew: {
        select: {
          id: true,
          name: true,
          avatarUrl: true,
        },
      },
      createdBy: {
        select: {
          id: true,
          username: true,
          image: true,
        },
      },
    },
  });

  if (!challenge) {
    notFound();
  }

  // Check if user is related to this challenge
  const isFromCrewMember = challenge.fromCrew.members.some(
    (m) => m.userId === session.user.id
  );
  const isToCrewMember = challenge.toCrew.members.some(
    (m) => m.userId === session.user.id
  );
  const isFromCrewCreator = challenge.fromCrew.createdByUserId === session.user.id;
  const isToCrewCreator = challenge.toCrew.createdByUserId === session.user.id;

  const isRelated = isFromCrewMember || isToCrewMember || isFromCrewCreator || isToCrewCreator;

  if (!isRelated) {
    redirect("/challenges");
  }

  // Serialize dates
  const serializedChallenge = {
    ...challenge,
    createdAt: challenge.createdAt.toISOString(),
    updatedAt: challenge.updatedAt.toISOString(),
    startAt: challenge.startAt?.toISOString() || null,
    endAt: challenge.endAt?.toISOString() || null,
    decidedAt: challenge.decidedAt?.toISOString() || null,
  };

  return (
    <>
      <Navbar />
      <div className="container mx-auto py-8 px-4 max-w-6xl">
        <ChallengeBattleClient
          challengeId={challengeId}
          challenge={serializedChallenge}
          currentUserId={session.user.id}
        />
      </div>
    </>
  );
}

