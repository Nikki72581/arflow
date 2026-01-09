import { getCurrentUserWithOrg } from '@/lib/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { FileText, Users, CreditCard, TrendingUp } from 'lucide-react'
import { prisma } from '@/lib/db'

export const metadata = {
  title: 'Dashboard | ARFlow',
  description: 'Accounts Receivable dashboard',
}

export default async function DashboardPage() {
  const user = await getCurrentUserWithOrg()

  // Get basic AR stats
  const [totalCustomers, totalInvoices, openInvoices, totalBalance] = await Promise.all([
    prisma.customer.count({
      where: { organizationId: user.organizationId, status: 'ACTIVE' },
    }),
    prisma.arDocument.count({
      where: { organizationId: user.organizationId, documentType: 'INVOICE' },
    }),
    prisma.arDocument.count({
      where: { organizationId: user.organizationId, status: 'OPEN' },
    }),
    prisma.arDocument.aggregate({
      where: { organizationId: user.organizationId, status: 'OPEN' },
      _sum: { balanceDue: true },
    }),
  ])

  const stats = [
    {
      title: 'Total Customers',
      value: totalCustomers.toString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950',
    },
    {
      title: 'Total Invoices',
      value: totalInvoices.toString(),
      icon: FileText,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50 dark:bg-purple-950',
    },
    {
      title: 'Open Invoices',
      value: openInvoices.toString(),
      icon: CreditCard,
      color: 'text-amber-600',
      bgColor: 'bg-amber-50 dark:bg-amber-950',
    },
    {
      title: 'Outstanding Balance',
      value: `$${(totalBalance._sum.balanceDue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50 dark:bg-emerald-950',
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-teal-600 to-teal-500 bg-clip-text text-transparent">
          Dashboard
        </h1>
        <p className="text-muted-foreground">
          Welcome back, {user.firstName}! Here's your AR overview.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Welcome Card */}
      <Card>
        <CardHeader>
          <CardTitle>Welcome to ARFlow</CardTitle>
          <CardDescription>
            Your accounts receivable portal is being set up
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ARFlow helps you manage customer invoices, track payments, and provide your customers
            with a self-service portal to view their account details.
          </p>
          <div className="space-y-2">
            <p className="text-sm font-medium">Quick Links:</p>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>View and manage customers in the Customers section</li>
              <li>Track invoices and payments in the Invoices section</li>
              <li>Connect your accounting system via Integrations</li>
              <li>View activity history in Audit Logs</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
