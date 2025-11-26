import { Navbar } from "@/components/navbar";
import { redirect } from "next/navigation";
import CrewsClient from "./crews-client";

export const dynamic = "force-dynamic";

export default async function CrewsPage() {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");

  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // Check if user is in a crew
  const userCrewMember = await prisma.crewMember.findFirst({
    where: {
      userId: session.user.id,
    },
    include: {
      crew: {
        include: {
          createdBy: {
            select: {
              id: true,
              name: true, // Keep for internal use only
              email: true,
              image: true,
              username: true,
              xHandle: true,
            },
          },
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true, // Keep for internal use only
                  email: true,
                  image: true,
                  username: true,
                  xHandle: true,
                },
              },
            },
            orderBy: {
              joinedAt: "asc",
            },
          },
          joinRequests: {
            where: {
              status: "pending",
            },
            select: {
              id: true,
            },
          },
        },
      },
    },
  });

  // Serialize userCrew to match the expected interface (convert Date to string)
  const userCrew = userCrewMember?.crew ? {
    ...userCrewMember.crew,
    createdAt: userCrewMember.crew.createdAt.toISOString(),
    updatedAt: userCrewMember.crew.updatedAt.toISOString(),
    members: userCrewMember.crew.members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    })),
  } : null;

  // Fetch all other crews (for discovery - this will be limited in production)
  const otherCrewsRaw = await prisma.crew.findMany({
    where: {
      members: {
        none: {
          userId: session.user.id,
        },
      },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          username: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              image: true,
              username: true,
            },
          },
        },
        orderBy: {
          joinedAt: "asc",
        },
      },
      joinRequests: {
        where: {
          userId: session.user.id,
          status: "pending",
        },
        select: {
          id: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 20, // Limit to prevent performance issues
  });

  // Serialize otherCrews to match the expected interface (convert Date to string)
  const otherCrews = otherCrewsRaw.map((crew) => ({
    ...crew,
    createdAt: crew.createdAt.toISOString(),
    updatedAt: crew.updatedAt.toISOString(),
    members: crew.members.map((member) => ({
      ...member,
      joinedAt: member.joinedAt.toISOString(),
    })),
  }));

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-bg-main">
        <div className="container mx-auto px-4 py-8 max-w-7xl">
          <CrewsClient 
            userCrew={userCrew as any} 
            otherCrews={otherCrews as any} 
            userId={session.user.id} 
          />
        </div>
      </div>
    </>
  );
}
