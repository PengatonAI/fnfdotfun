import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Dynamic imports to avoid build-time initialization
  const { auth } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/prisma");
  const { normalizeChain } = await import("@/lib/utils/normalize-chain");

  console.log("WALLET CONNECT API HIT");

  const body = await request.json();
  console.log("BODY:", body);

  const session = await auth();
  console.log("SESSION:", session);

  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // SECURITY: userId must ONLY come from authenticated session, never from client
  const userId = session.user.id;

  const { address } = body;

  if (!address || typeof address !== "string") {
    return NextResponse.json(
      { error: "Address is required" },
      { status: 400 }
    );
  }

  const normalizedAddress = address.trim().toLowerCase();

  // Normalize chain before upsert
  let normalizedChain: "evm" | "solana";
  try {
    normalizedChain = normalizeChain(body.chain);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid chain" },
      { status: 400 }
    );
  }

  console.log('NORMALIZED CHAIN:', normalizedChain, 'FROM:', body.chain);

  await prisma.wallet.upsert({
    where: {
      walletAddress_chain: {
        address: normalizedAddress,
        chain: normalizedChain,
      },
    },
    update: {
      chain: normalizedChain,
      connectedAt: new Date(),
      updatedAt: new Date(),
    },
    create: {
      address: normalizedAddress,
      userId: userId,
      chain: normalizedChain,
      connectedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  console.log('WALLET SAVED:', { userId: session.user.id, address, chain: normalizedChain });

  return NextResponse.json({ success: true });
}
