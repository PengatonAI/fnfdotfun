import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get the user's linked accounts to find provider's original profile image
    const userWithAccounts = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        accounts: {
          select: {
            provider: true,
            providerAccountId: true,
            access_token: true,
          },
        },
      },
    });

    if (!userWithAccounts) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Try to fetch the original profile image from the provider
    let originalImageUrl: string | null = null;

    // Check for Twitter account
    const twitterAccount = userWithAccounts.accounts.find(
      (acc) => acc.provider === "twitter"
    );

    if (twitterAccount && twitterAccount.access_token) {
      try {
        // Fetch user profile from Twitter API v2
        const response = await fetch(
          "https://api.twitter.com/2/users/me?user.fields=profile_image_url",
          {
            headers: {
              Authorization: `Bearer ${twitterAccount.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          originalImageUrl = data.data?.profile_image_url || null;
        }
      } catch (error) {
        console.error("Failed to fetch Twitter profile image:", error);
      }
    }

    // Check for Google account (Google images are stored at sign-in)
    const googleAccount = userWithAccounts.accounts.find(
      (acc) => acc.provider === "google"
    );

    if (!originalImageUrl && googleAccount && googleAccount.access_token) {
      try {
        // Fetch user profile from Google People API
        const response = await fetch(
          "https://www.googleapis.com/oauth2/v3/userinfo",
          {
            headers: {
              Authorization: `Bearer ${googleAccount.access_token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          originalImageUrl = data.picture || null;
        }
      } catch (error) {
        console.error("Failed to fetch Google profile image:", error);
      }
    }

    // Update user's profile picture (to original or null if not found)
    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: { image: originalImageUrl },
      select: {
        id: true,
        image: true,
        username: true,
        xHandle: true,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: originalImageUrl
        ? "Profile picture reset to platform avatar"
        : "Profile picture cleared (platform avatar not available)",
    });
  } catch (error) {
    console.error("Error resetting profile picture:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

