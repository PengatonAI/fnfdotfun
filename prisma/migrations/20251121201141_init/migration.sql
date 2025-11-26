/*
  Warnings:

  - You are about to drop the column `baseToken` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `block` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `fee` on the `Trade` table. All the data in the column will be lost.
  - You are about to drop the column `quoteToken` on the `Trade` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[address,chain]` on the table `Wallet` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `baseTokenAddress` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `quoteTokenAddress` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `walletAddress` to the `Trade` table without a default value. This is not possible if the table is not empty.
  - Made the column `baseAmount` on table `Trade` required. This step will fail if there are existing NULL values in that column.
  - Made the column `direction` on table `Trade` required. This step will fail if there are existing NULL values in that column.
  - Made the column `platform` on table `Trade` required. This step will fail if there are existing NULL values in that column.
  - Made the column `quoteAmount` on table `Trade` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateTable
CREATE TABLE "WalletSyncState" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "lastSyncedCursor" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WalletSyncState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Trade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "walletId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "chain" TEXT NOT NULL,
    "platform" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "baseTokenAddress" TEXT NOT NULL,
    "quoteTokenAddress" TEXT NOT NULL,
    "baseAmount" TEXT NOT NULL,
    "quoteAmount" TEXT NOT NULL,
    "price" REAL,
    "tokenInSymbol" TEXT,
    "tokenOutSymbol" TEXT,
    "feeAmount" TEXT,
    "feeTokenAddress" TEXT,
    "txHash" TEXT NOT NULL,
    "txIndex" INTEGER,
    "timestamp" DATETIME NOT NULL,
    "raw" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Trade_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Trade_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Trade" ("baseAmount", "chain", "createdAt", "direction", "id", "platform", "price", "quoteAmount", "timestamp", "txHash", "walletId") SELECT "baseAmount", "chain", "createdAt", "direction", "id", "platform", "price", "quoteAmount", "timestamp", "txHash", "walletId" FROM "Trade";
DROP TABLE "Trade";
ALTER TABLE "new_Trade" RENAME TO "Trade";
CREATE INDEX "Trade_txIndex_idx" ON "Trade"("txIndex");
CREATE INDEX "Trade_userId_idx" ON "Trade"("userId");
CREATE INDEX "Trade_walletAddress_chain_idx" ON "Trade"("walletAddress", "chain");
CREATE INDEX "Trade_timestamp_idx" ON "Trade"("timestamp");
CREATE UNIQUE INDEX "Trade_walletAddress_chain_txHash_key" ON "Trade"("walletAddress", "chain", "txHash");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "WalletSyncState_userId_idx" ON "WalletSyncState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WalletSyncState_userId_walletAddress_chain_key" ON "WalletSyncState"("userId", "walletAddress", "chain");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_address_chain_key" ON "Wallet"("address", "chain");
