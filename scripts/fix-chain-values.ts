import { prisma } from "../lib/prisma";

async function fixChainValues() {
  let fixedCount = 0;

  try {
    console.log("Starting chain value cleanup...\n");

    // 1. Update wallets with chain="ethereum" to chain="evm"
    const ethereumWallets = await prisma.wallet.findMany({
      where: {
        chain: "ethereum",
      },
      select: {
        id: true,
        chain: true,
      },
    });

    for (const wallet of ethereumWallets) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { chain: "evm" },
      });
      console.log(`Updated wallet ${wallet.id}: ethereum → evm`);
      fixedCount++;
    }

    // 2. Update wallets with chain="solana" where address starts with "0x" to chain="evm"
    const solanaWallets = await prisma.wallet.findMany({
      where: {
        chain: "solana",
        address: {
          startsWith: "0x",
        },
      },
      select: {
        id: true,
        chain: true,
        address: true,
      },
    });

    for (const wallet of solanaWallets) {
      await prisma.wallet.update({
        where: { id: wallet.id },
        data: { chain: "evm" },
      });
      console.log(`Updated wallet ${wallet.id}: solana → evm`);
      fixedCount++;
    }

    console.log(`\nFixed ${fixedCount} wallets`);
  } catch (error) {
    console.error("Error fixing chain values:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
fixChainValues()
  .then(() => {
    console.log("Cleanup completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
