/*
  Warnings:

  - The `permission` column on the `WebsiteInvitation` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `permission` column on the `WebsiteShare` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('VIEW', 'EDIT');

-- AlterTable
ALTER TABLE "WebsiteInvitation" DROP COLUMN "permission",
ADD COLUMN     "permission" "Permission" NOT NULL DEFAULT 'VIEW';

-- AlterTable
ALTER TABLE "WebsiteShare" DROP COLUMN "permission",
ADD COLUMN     "permission" "Permission" NOT NULL DEFAULT 'VIEW';
