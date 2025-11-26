import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const limit = parseInt(searchParams.get("limit") || "20", 10);
    const sort = searchParams.get("sort") || "newest";

    if (!query || query.trim().length === 0) {
      return NextResponse.json([]);
    }

    // Case-insensitive search (SQLite is case-sensitive, so we fetch all and filter)
    const searchQuery = query.trim().toLowerCase();

    // Fetch all crews and filter in memory for case-insensitive search
    const allCrews = await prisma.crew.findMany({
      select: {
        id: true,
        name: true,
        description: true,
        openToMembers: true,
        createdAt: true,
        createdBy: {
          select: {
            id: true,
            username: true,
            xHandle: true,
          },
        },
        members: {
          select: {
            id: true,
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
    });

    // Filter results to match case-insensitive (since SQLite is case-sensitive by default)
    let filteredCrews = allCrews
      .filter((crew) => crew.name.toLowerCase().includes(searchQuery))
      .slice(0, limit);

    // Apply sorting
    switch (sort) {
      case "oldest":
        filteredCrews.sort((a, b) => 
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        );
        break;
      case "most-members":
        filteredCrews.sort((a, b) => b.members.length - a.members.length);
        break;
      case "least-members":
        filteredCrews.sort((a, b) => a.members.length - b.members.length);
        break;
      case "newest":
      default:
        filteredCrews.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        break;
    }

    // Format response
    const results = filteredCrews.map((crew) => ({
      id: crew.id,
      name: crew.name,
      description: crew.description,
      openToMembers: crew.openToMembers,
      memberCount: crew.members.length,
      maxMembers: 5,
      hasPendingRequest: crew.joinRequests.length > 0,
      creator: {
        id: crew.createdBy.id,
        username: crew.createdBy.username,
        xHandle: crew.createdBy.xHandle,
      },
      createdAt: crew.createdAt,
    }));

    return NextResponse.json(results);
  } catch (error) {
    console.error("Error searching crews:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

