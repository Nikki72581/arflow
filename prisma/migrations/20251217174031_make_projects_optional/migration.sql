-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "requireProjects" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "sales_transactions" ALTER COLUMN "projectId" DROP NOT NULL;
