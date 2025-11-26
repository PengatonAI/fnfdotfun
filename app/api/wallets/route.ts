import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// GET - List all wallets for the logged-in user
export async function GET() {
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

    const wallets = await prisma.wallet.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(wallets);
  } catch (error) {
    console.error("Error fetching wallets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Add a new wallet
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
    const { address, chain, label } = body;

    // Validation
    if (!address || typeof address !== "string" || address.trim().length === 0) {
      return NextResponse.json(
        { error: "Wallet address is required" },
        { status: 400 }
      );
    }

    // Auto-detect chain from address format
    let detectedChain: string;
    const normalizedAddress = address.trim();
    
    if (normalizedAddress.startsWith("0x") && normalizedAddress.length === 42) {
      // EVM address (0x followed by 40 hex characters)
      detectedChain = "evm";
    } else if (normalizedAddress.length >= 32 && normalizedAddress.length <= 44) {
      // Solana address (base58, typically 32-44 characters)
      detectedChain = "solana";
    } else {
      return NextResponse.json(
        { error: "Invalid wallet address format" },
        { status: 400 }
      );
    }

    // Use provided chain if valid, otherwise use detected chain
    const finalChain = chain && (chain.toLowerCase() === "evm" || chain.toLowerCase() === "solana") 
      ? chain.toLowerCase() 
      : detectedChain;

    if (label && typeof label !== "string") {
      return NextResponse.json(
        { error: "Label must be a string" },
        { status: 400 }
      );
    }

    if (label && label.length > 50) {
      return NextResponse.json(
        { error: "Label must be 50 characters or less" },
        { status: 400 }
      );
    }

    // Check for uniqueness (user + address) - use lowercase for comparison
    const normalizedAddressLower = normalizedAddress.toLowerCase();
    const existingWallet = await prisma.wallet.findUnique({
      where: {
        userId_address: {
          userId: session.user.id,
          address: normalizedAddressLower,
        },
      },
    });

    if (existingWallet) {
      return NextResponse.json(
        { error: "This wallet is already added to your account" },
        { status: 409 }
      );
    }

    // Create wallet
    const wallet = await prisma.wallet.create({
      data: {
        userId: session.user.id,
        address: normalizedAddressLower,
        chain: finalChain,
        label: label?.trim() || null,
        verified: false, // Will be set to true after verification
      },
    });

    return NextResponse.json(wallet, { status: 201 });
  } catch (error) {
    console.error("Error creating wallet:", error);
    
    // Handle Prisma unique constraint error
    if (error instanceof Error && error.message.includes("Unique constraint")) {
      return NextResponse.json(
        { error: "This wallet is already added to your account" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

