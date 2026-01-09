-- AlterTable
ALTER TABLE "users" ADD COLUMN     "commissionAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "salesAlerts" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "weeklyReports" BOOLEAN NOT NULL DEFAULT false;
