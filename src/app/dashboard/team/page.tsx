import { Suspense } from 'react'
import { Users, Search, Award, DollarSign, TrendingUp, Pencil } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { EmptyState } from '@/components/ui/empty-state'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getUsers } from '@/app/actions/users'
import { db } from '@/lib/db'
import { formatDate } from '@/lib/utils'
import { getCurrentUserWithOrg } from '@/lib/auth'
import { AddTeamMemberDialog } from '@/components/team/add-team-member-dialog'
import { PendingInvitations } from '@/components/team/pending-invitations'
import { EditUserDialog } from '@/components/team/edit-user-dialog'
import { PlaceholderUserActions } from '@/components/team/placeholder-user-actions'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Team | ARFlow',
  description: 'Manage your team members',
}

async function getTeamStats(organizationId: string) {
  const [totalUsers, salespeople, admins, totalCommissions] = await Promise.all([
    db.user.count({
      where: { organizationId },
    }),
    db.user.count({
      where: { organizationId, role: 'SALESPERSON' },
    }),
    db.user.count({
      where: { organizationId, role: 'ADMIN' },
    }),
    db.commissionCalculation.aggregate({
      where: {
        organizationId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
    }),
  ])

  return {
    totalUsers,
    salespeople,
    admins,
    totalCommissions: totalCommissions._sum.amount || 0,
  }
}

async function getUserCommissionStats(userId: string) {
  const [totalEarned, pendingCount] = await Promise.all([
    db.commissionCalculation.aggregate({
      where: {
        userId,
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: { amount: true },
    }),
    db.commissionCalculation.count({
      where: {
        userId,
        status: 'PENDING',
      },
    }),
  ])

  return {
    totalEarned: totalEarned._sum.amount || 0,
    pendingCount,
  }
}

async function TeamTable({ searchQuery, isAdmin }: { searchQuery?: string; isAdmin: boolean }) {
  const result = await getUsers()

  if (!result.success) {
    return (
      <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
        {result.error}
      </div>
    )
  }

  let users = result.data || []

  // Filter by search query
  if (searchQuery && users.length > 0) {
    const query = searchQuery.toLowerCase()
    users = users.filter(
      (user) =>
        user.email.toLowerCase().includes(query) ||
        user.firstName?.toLowerCase().includes(query) ||
        user.lastName?.toLowerCase().includes(query) ||
        user.employeeId?.toLowerCase().includes(query) ||
        user.salespersonId?.toLowerCase().includes(query)
    )
  }

  if (users.length === 0) {
    if (searchQuery) {
      return (
        <EmptyState
          icon={Search}
          title="No team members found"
          description={`No team members match "${searchQuery}". Try a different search term.`}
        />
      )
    }

    return (
      <EmptyState
        icon={Users}
        title="No team members yet"
        description="Team members will appear here once they join your organization."
      />
    )
  }

  // Fetch commission stats for all users in a single query (fixes N+1 problem)
  const userIds = users.map(u => u.id);
  const [commissionStats, pendingCounts] = await Promise.all([
    db.commissionCalculation.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: { in: ['APPROVED', 'PAID'] },
      },
      _sum: {
        amount: true,
      },
    }),
    db.commissionCalculation.groupBy({
      by: ['userId'],
      where: {
        userId: { in: userIds },
        status: 'PENDING',
      },
      _count: {
        _all: true,
      },
    }),
  ]);

  // Create lookup maps for O(1) access
  const statsMap = new Map(
    commissionStats
      .filter(s => s._sum.amount !== null)
      .map(s => [
        s.userId,
        {
          totalEarned: s._sum.amount || 0,
        },
      ])
  );

  const pendingMap = new Map(
    pendingCounts.map(p => [p.userId, p._count._all])
  );

  // Combine user data with stats
  const usersWithStats = users.map(user => ({
    ...user,
    totalEarned: statsMap.get(user.id)?.totalEarned || 0,
    pendingCount: pendingMap.get(user.id) || 0,
  }));

  return (
    <div className="rounded-lg border border-border bg-gradient-to-br from-card to-muted/20 shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="border-b border-border bg-muted/50">
            <TableHead className="font-semibold">Name</TableHead>
            <TableHead className="font-semibold">Email</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Employee ID</TableHead>
            <TableHead className="font-semibold">Salesperson ID</TableHead>
            <TableHead className="font-semibold">Role</TableHead>
            <TableHead className="font-semibold">Total Earned</TableHead>
            <TableHead className="font-semibold">Pending</TableHead>
            <TableHead className="font-semibold">Joined</TableHead>
            {isAdmin && <TableHead className="font-semibold">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {usersWithStats.map((user) => {
            const fullName = [user.firstName, user.lastName]
              .filter(Boolean)
              .join(' ') || 'Unnamed User'

            return (
              <TableRow
                key={user.id}
                className="hover:bg-muted/40 transition-colors border-b border-border/60"
              >
                <TableCell>
                  <div className="font-medium text-foreground">{fullName}</div>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.email}
                </TableCell>
                <TableCell>
                  {user.isPlaceholder ? (
                    <Badge variant="secondary" className="gap-1">
                      Placeholder
                    </Badge>
                  ) : (
                    <Badge variant="success" className="gap-1">
                      Active
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.employeeId || '—'}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {user.salespersonId || '—'}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={user.role === 'ADMIN' ? 'default' : 'info'}
                    className="font-medium"
                  >
                    {user.role}
                  </Badge>
                </TableCell>
                <TableCell className="font-semibold text-emerald-700 dark:text-emerald-400">
                  ${user.totalEarned.toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </TableCell>
                <TableCell>
                  {user.pendingCount > 0 ? (
                    <Badge variant="warning" className="font-semibold">{user.pendingCount}</Badge>
                  ) : (
                    <span className="text-muted-foreground"></span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {formatDate(user.createdAt)}
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    {user.isPlaceholder ? (
                      <PlaceholderUserActions
                        userId={user.id}
                        userEmail={user.email}
                        userName={fullName}
                        invitedAt={user.invitedAt}
                      />
                    ) : (
                      <EditUserDialog user={user} />
                    )}
                  </TableCell>
                )}
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}

function TeamTableSkeleton() {
  return (
    <div className="rounded-md border">
      <div className="p-8 text-center text-muted-foreground">Loading team members...</div>
    </div>
  )
}

export default async function TeamPage({
  searchParams,
}: {
  searchParams: { search?: string }
}) {
  const user = await getCurrentUserWithOrg()
  const stats = await getTeamStats(user.organizationId)
  const isAdmin = user.role === 'ADMIN'

  const teamMetrics = [
    {
      title: 'Total Team Members',
      value: stats.totalUsers.toString(),
      icon: Users,
      description: 'Active users',
    },
    {
      title: 'Salespeople',
      value: stats.salespeople.toString(),
      icon: TrendingUp,
      description: 'Sales team members',
    },
    {
      title: 'Admins',
      value: stats.admins.toString(),
      icon: Award,
      description: 'Admin users',
    },
    {
      title: 'Total Commissions',
      value: `$${stats.totalCommissions.toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      })}`,
      icon: DollarSign,
      description: 'All-time earnings',
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">Team</h1>
          <p className="text-muted-foreground">
            View and manage your team members
          </p>
        </div>
        {isAdmin && <AddTeamMemberDialog />}
      </div>

      {/* Team Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {teamMetrics.map((metric) => (
          <Card key={metric.title} className="border-2 border-indigo-500/30 transition-all hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 bg-gradient-to-br from-card to-muted/20">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {metric.title}
              </CardTitle>
              <div className="h-10 w-10 rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center">
                <metric.icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-indigo-500 bg-clip-text text-transparent">{metric.value}</div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pending Invitations - Admin Only */}
      {isAdmin && <PendingInvitations />}

      {/* Search Bar */}
      <div className="flex items-center gap-4">
        <form className="flex-1" action="/dashboard/team" method="GET">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              name="search"
              placeholder="Search team members..."
              defaultValue={searchParams.search}
              className="pl-9 border-border focus:border-primary/40 focus:ring-primary/20"
            />
          </div>
        </form>
      </div>

      {/* Team Table */}
      <Suspense fallback={<TeamTableSkeleton />}>
        <TeamTable searchQuery={searchParams.search} isAdmin={isAdmin} />
      </Suspense>
    </div>
  )
}
