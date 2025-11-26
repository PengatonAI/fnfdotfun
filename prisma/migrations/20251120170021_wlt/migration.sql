-- CreateTable
CREATE TABLE "Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "walletId" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "platform" TEXT,
    "direction" TEXT,
    "baseToken" TEXT,
    "quoteToken" TEXT,
    "baseAmount" REAL,
    "quoteAmount" REAL,
    "fee" REAL,
    "price" REAL,
    "txHash" TEXT NOT NULL,
    "block" INTEGER,
    "timestamp" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Trade_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "Trade_walletId_idx" ON "Trade"("walletId");

-- CreateIndex
CREATE INDEX "Trade_txHash_idx" ON "Trade"("txHash");
