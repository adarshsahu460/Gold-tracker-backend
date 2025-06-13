/*
  Warnings:

  - Changed the type of `price_per_gram` on the `GoldValue` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "GoldValue" DROP COLUMN "price_per_gram",
ADD COLUMN     "price_per_gram" JSONB NOT NULL;
