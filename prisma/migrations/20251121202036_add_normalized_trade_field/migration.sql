-- AlterTable
ALTER TABLE "Trade" ADD COLUMN "decimalsIn" INTEGER;
ALTER TABLE "Trade" ADD COLUMN "decimalsOut" INTEGER;
ALTER TABLE "Trade" ADD COLUMN "normalizedAmountIn" REAL;
ALTER TABLE "Trade" ADD COLUMN "normalizedAmountOut" REAL;
ALTER TABLE "Trade" ADD COLUMN "tokenNameIn" TEXT;
ALTER TABLE "Trade" ADD COLUMN "tokenNameOut" TEXT;
