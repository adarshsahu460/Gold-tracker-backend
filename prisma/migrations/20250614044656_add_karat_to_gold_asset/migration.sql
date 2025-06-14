/*
  Warnings:

  - Added the required column `karat` to the `GoldAsset` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "GoldAsset" ADD COLUMN     "karat" TEXT NOT NULL;
