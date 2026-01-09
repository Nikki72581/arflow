// app/dashboard/admin/page.tsx
import { requireAdmin } from '@/lib/auth';
import { db } from '@/lib/db';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SalesImportDialog } from '@/components/sales/sales-import-dialog';
import { Users, DollarSign, TrendingUp, Clock, Plus, RefreshCw, FileQuestion } from 'lucide-react';
import Link from 'next/link';
import { getProjects } from '@/app/actions/projects';
import { getClients } from '@/app/actions/clients';
import { getUsers } from '@/app/actions/users';
import { getProductCategories } from '@/app/actions/product-categories';
export const dynamic = 'force-dynamic'
export default async function AdminDashboard() {
  const user = await requireAdmin();

  // Fetch dashboard metrics
  const [
    salespeople,
    totalCommissions,
    pendingPayouts,
    activePlans,
    projectsResult,
    clientsResult,
    usersResult,
    productCategoriesResult,
  ] = await Promise.all([
    db.user.count({
      where: { 
        organizationId: user.organizationId,
        role: 'SALESPERSON'
      }
    }),
    db.commissionCalculation.aggregate({
      where: { 
        organizationId: user.organizationId,
        status: 'APPROVED'
      },
      _sum: { amount: true }
    }),
    db.payout.count({
      where: {
        organizationId: user.organizationId,
        status: 'PENDING'
      }
    }),
    db.commissionPlan.count({
      where: {
        organizationId: user.organizationId,
        isActive: true
      }
    }),
    getProjects(),
    getClients(),
    getUsers(),
    getProductCategories(),
  ]);

  const projects = projectsResult.success ? (projectsResult.data || []) : []
  const clients = clientsResult.success ? (clientsResult.data || []) : []
  const users = (usersResult.success ? (usersResult.data || []) : [])
    .filter((teamUser) => teamUser.firstName && teamUser.lastName) as Array<{
      id: string
      firstName: string
      lastName: string
      email: string
    }>
  const productCategories = productCategoriesResult.success ? (productCategoriesResult.data || []) : []

  const metrics = [
    {
      title: 'Total Salespeople',
      value: salespeople.toString(),
      icon: Users,
      description: 'Active team members',
    },
    {
      title: 'Total Commissions',
      value: `$${(totalCommissions._sum.amount || 0).toLocaleString()}`,
      icon: DollarSign,
      description: 'Approved to date',
    },
    {
      title: 'Pending Payouts',
      value: pendingPayouts.toString(),
      icon: Clock,
      description: 'Awaiting processing',
    },
    {
      title: 'Active Plans',
      value: activePlans.toString(),
      icon: TrendingUp,
      description: 'Commission structures',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-muted-foreground">Welcome back, {user.firstName}!</p>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => (
          <Card
            key={metric.title}
            className="border-2 border-indigo-500/30 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 bg-gradient-to-br from-card to-muted/20"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <metric.icon className="h-4 w-4 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="flex h-full flex-col hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Create Commission Plan
            </CardTitle>
            <CardDescription>
              Design a new commission structure with AI assistance
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild className="w-full h-10">
              <Link href="/dashboard/plans?create=1">Get Started</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Manage Team
            </CardTitle>
            <CardDescription>
              Add salespeople and assign commission plans
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline" className="w-full h-10">
              <Link href="/dashboard/team">View Team</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Import Sales Data
            </CardTitle>
            <CardDescription>
              Upload sales transactions to calculate commissions
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <SalesImportDialog
              projects={projects}
              clients={clients}
              users={users}
              productCategories={productCategories}
              triggerClassName="w-full h-10"
            />
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recalculate Commissions
            </CardTitle>
            <CardDescription>
              Update commission amounts based on current plan rules
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline" className="w-full h-10">
              <Link href="/dashboard/admin/recalculate-commissions">Recalculate</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="flex h-full flex-col hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileQuestion className="h-5 w-5" />
              Missing Commissions
            </CardTitle>
            <CardDescription>
              Find and calculate commissions for transactions without calculations
            </CardDescription>
          </CardHeader>
          <CardContent className="mt-auto">
            <Button asChild variant="outline" className="w-full h-10">
              <Link href="/dashboard/admin/missing-commissions">Scan Now</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Latest commission calculations and payouts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            No recent activity. Start by creating a commission plan and importing sales data.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
