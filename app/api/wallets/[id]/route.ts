import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// DELETE - Remove a wallet (only if owner)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: walletId } = await params;

    // Check if wallet exists and belongs to user
    const wallet = await prisma.wallet.findUnique({
      where: { id: walletId },
      select: {
        userId: true,
      },
    });

    if (!wallet) {
      return NextResponse.json(
        { error: "Wallet not found" },
        { status: 404 }
      );
    }

    if (wallet.userId !== session.user.id) {
      return NextResponse.json(
        { error: "You can only delete your own wallets" },
        { status: 403 }
      );
    }

    // Delete wallet
    await prisma.wallet.delete({
      where: { id: walletId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting wallet:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

