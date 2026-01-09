import { DollarSign, TrendingUp, Users, BarChart3, Clock, CheckCircle, Wallet, Sparkles } from 'lucide-react'
import { StatsCard } from './stats-card'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface DashboardStatsData {
  totalSales: number
  salesCount: number
  totalCommissions: number
  commissionsCount: number
  pendingCommissions: number
  pendingCount: number
  approvedCommissions: number
  approvedCount: number
  paidCommissions: number
  paidCount: number
  averageCommissionRate: number
  activePlansCount: number
  activeClientsCount: number
  salesPeopleCount: number
}

interface DashboardStatsProps {
  stats: DashboardStatsData
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  const isFreshOrg =
    stats.activePlansCount === 0 &&
    stats.activeClientsCount === 0 &&
    stats.salesCount === 0 &&
    stats.commissionsCount === 0 &&
    stats.salesPeopleCount === 0

  return (
    <>
      {isFreshOrg && (
        <Alert className="border-amber-200/70 bg-amber-50/70 text-amber-900">
          <Sparkles />
          <AlertTitle>Welcome! You're all set to get started.</AlertTitle>
          <AlertDescription className="text-amber-800/90">
            <p>Visit the help and support page for quick guides and next steps.</p>
            <Button asChild size="sm" className="mt-2">
              <Link href="/dashboard/help">Go to Help & Support</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          title="Total Sales"
          value={stats.totalSales}
          description={`${stats.salesCount} transactions`}
          icon={DollarSign}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Total Commissions"
          value={stats.totalCommissions}
          description={`${stats.commissionsCount} calculated`}
          icon={TrendingUp}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Average Rate"
          value={stats.averageCommissionRate}
          description="Commission percentage"
          icon={BarChart3}
          format="percentage"
          accent="dashboard"
        />
        <StatsCard
          title="Active Plans"
          value={stats.activePlansCount}
          description={`${stats.salesPeopleCount} salespeople`}
          icon={Users}
          format="number"
          accent="dashboard"
        />
      </div>

      {/* Commission Status */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatsCard
          title="Pending"
          value={stats.pendingCommissions}
          description={`${stats.pendingCount} awaiting approval`}
          icon={Clock}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Approved"
          value={stats.approvedCommissions}
          description={`${stats.approvedCount} ready to pay`}
          icon={CheckCircle}
          format="currency"
          accent="dashboard"
        />
        <StatsCard
          title="Paid"
          value={stats.paidCommissions}
          description={`${stats.paidCount} completed`}
          icon={Wallet}
          format="currency"
          accent="dashboard"
        />
      </div>
    </>
  )
}
