import { NextResponse } from "next/server";
import { randomBytes } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    // Dynamic imports to avoid build-time initialization
    const { auth } = await import("@/lib/auth");
    const { prisma } = await import("@/lib/prisma");

    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { address, chain } = body;

    // Validation
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    if (!chain || typeof chain !== "string") {
      return NextResponse.json(
        { error: "Chain is required" },
        { status: 400 }
      );
    }

    // Normalize address (lowercase for EVM)
    const normalizedAddress = address.trim().toLowerCase();

    // Generate secure random nonce (32+ characters)
    const nonce = randomBytes(32).toString("hex");

    // Save nonce to database
    await prisma.walletVerificationNonce.create({
      data: {
        userId: session.user.id,
        address: normalizedAddress,
        nonce,
      },
    });

    return NextResponse.json({ nonce });
  } catch (error) {
    console.error("Error requesting verification:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

