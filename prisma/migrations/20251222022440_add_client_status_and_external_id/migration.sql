-- CreateEnum
CREATE TYPE "ClientStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'PROSPECTIVE', 'CHURNED');

-- AlterTable
ALTER TABLE "clients" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "status" "ClientStatus" NOT NULL DEFAULT 'ACTIVE';
