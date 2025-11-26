import { prisma } from "../lib/prisma";

async function resetWallets() {
  try {
    console.log("Starting wallet reset...\n");

    // Delete all wallets
    const result = await prisma.wallet.deleteMany();

    console.log(`✅ All wallets deleted. Users can reconnect with correct chain values.`);
    console.log(`Deleted ${result.count} wallet(s)`);
  } catch (error) {
    console.error("Error resetting wallets:", error);
    if (error instanceof Error) {
      console.error("Error message:", error.message);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
resetWallets()
  .then(() => {
    console.log("\nReset completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
