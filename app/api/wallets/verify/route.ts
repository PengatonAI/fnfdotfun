import { NextResponse } from "next/server";
import { recoverMessageAddress } from "viem";

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
    const { address, chain, signature, nonce } = body;

    // Validation
    if (!address || typeof address !== "string") {
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

    if (!signature || typeof signature !== "string") {
      return NextResponse.json(
        { error: "Signature is required" },
        { status: 400 }
      );
    }

    if (!nonce || typeof nonce !== "string") {
      return NextResponse.json(
        { error: "Nonce is required" },
        { status: 400 }
      );
    }

    const normalizedAddress = address.trim().toLowerCase();

    // Find nonce record
    const nonceRecord = await prisma.walletVerificationNonce.findFirst({
      where: {
        nonce,
        userId: session.user.id,
        address: normalizedAddress,
        used: false,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!nonceRecord) {
      return NextResponse.json(
        { error: "Invalid or expired nonce" },
        { status: 400 }
      );
    }

    // Check if nonce is too old (15 minutes)
    const nonceAge = Date.now() - nonceRecord.createdAt.getTime();
    const maxAge = 15 * 60 * 1000; // 15 minutes
    if (nonceAge > maxAge) {
      return NextResponse.json(
        { error: "Nonce has expired. Please request a new verification." },
        { status: 400 }
      );
    }

    // Verify signature
    try {
      const message = `Sign this message to verify ownership of your wallet for FnFdotFun.\n\nNonce: ${nonce}`;
      
      const recoveredAddress = await recoverMessageAddress({
        message,
        signature: signature as `0x${string}`,
      });

      // Compare addresses (case-insensitive)
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        return NextResponse.json(
          { error: "Signature verification failed. Address mismatch." },
          { status: 400 }
        );
      }
    } catch (error) {
      console.error("Error recovering address from signature:", error);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Mark nonce as used
    await prisma.walletVerificationNonce.update({
      where: { id: nonceRecord.id },
      data: { used: true },
    });

    // Normalize chain: "evm" -> "ethereum"
    const normalizedChain = chain.toLowerCase() === "evm" ? "ethereum" : chain.toLowerCase();

    // Upsert wallet with verified = true
    const wallet = await prisma.wallet.upsert({
      where: {
        userId_address: {
          userId: session.user.id,
          address: normalizedAddress,
        },
      },
      update: {
        verified: true,
        chain: normalizedChain, // Store normalized chain (ethereum instead of evm)
      },
      create: {
        userId: session.user.id,
        address: normalizedAddress,
        chain: normalizedChain, // Store normalized chain (ethereum instead of evm)
        verified: true,
      },
    });

    return NextResponse.json({ success: true, wallet });
  } catch (error) {
    console.error("Error verifying wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

