import { getCurrentUserWithOrg } from '@/lib/auth'
import Link from 'next/link'
import {
  BookOpen,
  CheckCircle,
  ChevronRight,
  FileText,
  Users,
  DollarSign,
  Database,
  Lightbulb,
  Play,
  Settings,
  Rocket,
  ArrowRight,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Help & Support | CommissionFlow',
  description: 'Get started with CommissionFlow - Step-by-step setup guide',
}

interface SetupStep {
  step: number
  title: string
  description: string
  icon: React.ElementType
  href: string
  estimatedTime: string
  isOptional?: boolean
  actions: {
    label: string
    href: string
    variant?: 'default' | 'outline'
  }[]
  tips: string[]
}

const setupSteps: SetupStep[] = [
  {
    step: 1,
    title: 'Create Your First Commission Plan',
    description: 'Set up the commission structure that defines how your sales team earns. Commission plans are the foundation of your commission calculations.',
    icon: FileText,
    href: '/dashboard/plans',
    estimatedTime: '5-10 minutes',
    actions: [
      {
        label: 'Create Commission Plan',
        href: '/dashboard/plans',
        variant: 'default',
      },
      {
        label: 'View Examples',
        href: '/dashboard/help#commission-plan-examples',
        variant: 'outline',
      },
    ],
    tips: [
      'Start with a simple percentage-based plan (e.g., 10% of sales)',
      'You can always add more complex rules later',
      'Plans can be based on revenue, profit, units sold, and more',
      'Each plan can have multiple tiered rules',
    ],
  },
  {
    step: 2,
    title: 'Add Team Members',
    description: 'Invite your sales team and assign them to commission plans. Team members will be able to track their own commissions.',
    icon: Users,
    href: '/dashboard/team',
    estimatedTime: '3-5 minutes',
    actions: [
      {
        label: 'Invite Team Members',
        href: '/dashboard/team',
        variant: 'default',
      },
    ],
    tips: [
      'Assign each salesperson to the appropriate commission plan',
      'Team members can have different roles (Admin or Salesperson)',
      'Salespeople can only see their own commission data',
      'You can change plan assignments at any time',
    ],
  },
  {
    step: 3,
    title: 'Generate Demo Data',
    description: 'Populate your account with realistic sample data to explore the platform. This includes clients, projects, sales, and calculated commissions.',
    icon: Database,
    href: '/dashboard/admin/demo-data',
    estimatedTime: '2-3 minutes',
    isOptional: true,
    actions: [
      {
        label: 'Generate Demo Data',
        href: '/dashboard/admin/demo-data',
        variant: 'default',
      },
    ],
    tips: [
      'Click "Generate Full Demo Dataset" for a complete sample environment',
      'This creates 20 clients, 30 projects, and 50 sales with commissions',
      'Demo data helps you understand how the system works before adding real data',
      'You can clear demo data at any time from the same page',
    ],
  },
  {
    step: 4,
    title: 'Explore Your Data',
    description: 'Review the generated data and familiarize yourself with the different sections of the platform.',
    icon: Rocket,
    href: '/dashboard',
    estimatedTime: '10-15 minutes',
    isOptional: true,
    actions: [
      {
        label: 'View Dashboard',
        href: '/dashboard',
        variant: 'default',
      },
      {
        label: 'View Clients',
        href: '/dashboard/clients',
        variant: 'outline',
      },
      {
        label: 'View Sales',
        href: '/dashboard/sales',
        variant: 'outline',
      },
    ],
    tips: [
      'Check the Clients page to see generated customer accounts',
      'Review Projects to understand how they link to clients',
      'Explore Sales to see transaction details',
      'View Commissions to see calculated earnings for each sale',
    ],
  },
  {
    step: 5,
    title: 'Review Commission Calculations',
    description: 'Understand how commissions are automatically calculated based on your plans and approve pending commissions.',
    icon: DollarSign,
    href: '/dashboard/commissions',
    estimatedTime: '5 minutes',
    actions: [
      {
        label: 'View All Commissions',
        href: '/dashboard/commissions',
        variant: 'default',
      },
      {
        label: 'Pending Approvals',
        href: '/dashboard/commissions/pending',
        variant: 'outline',
      },
    ],
    tips: [
      'Commissions are automatically calculated when sales are created',
      'Review the calculation breakdown for each commission',
      'Approve commissions to move them towards payout',
      'Use bulk actions to approve multiple commissions at once',
    ],
  },
  {
    step: 6,
    title: 'Explore Reports & Analytics',
    description: 'View detailed reports on sales performance, commission trends, and team earnings.',
    icon: BookOpen,
    href: '/dashboard/reports',
    estimatedTime: '5 minutes',
    isOptional: true,
    actions: [
      {
        label: 'View Reports',
        href: '/dashboard/reports',
        variant: 'default',
      },
    ],
    tips: [
      'Reports show commission trends over time',
      'Filter by date range, team member, or commission plan',
      'Export reports to CSV for external analysis',
      'Use insights to optimize your commission structure',
    ],
  },
]

export default async function HelpPage() {
  await getCurrentUserWithOrg()

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <BookOpen className="h-4 w-4" />
          <span>Getting Started Guide</span>
        </div>
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-muted-foreground to-foreground bg-clip-text text-transparent">
          Help & Support
        </h1>
        <p className="text-lg text-muted-foreground">
          Welcome to CommissionFlow! Follow these steps to set up your demo environment and explore the platform.
        </p>
      </div>

      {/* Quick Start Banner */}
      <Card className="border-2 border-purple-500/30 bg-gradient-to-br from-purple-500/10 via-blue-500/5 to-purple-500/10">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-500/20 p-3">
              <Rocket className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <CardTitle className="text-xl">Quick Start: 20 Minutes to Demo Ready</CardTitle>
              <CardDescription className="text-base">
                Set up a complete demo environment in just a few steps
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Play className="h-4 w-4" />
            <span>Follow the steps below to get started with your demo environment</span>
          </div>
        </CardContent>
      </Card>

      {/* Setup Steps */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Setup Steps</h2>
          <Badge variant="info" className="text-sm">
            6 Steps Total
          </Badge>
        </div>

        <div className="space-y-4">
          {setupSteps.map((step) => {
            const Icon = step.icon
            return (
              <Card
                key={step.step}
                className="border-2 transition-all hover:shadow-lg hover:border-purple-500/30"
              >
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                      <Icon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-mono">
                          Step {step.step}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          • {step.estimatedTime}
                        </span>
                      </div>
                      <CardTitle className="text-xl">{step.title}</CardTitle>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Tips */}
                  <div className="space-y-2 rounded-lg bg-muted/40 border border-muted-foreground/20 p-4">
                    <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Lightbulb className="h-4 w-4" />
                      Tips & Best Practices
                    </div>
                    <ul className="space-y-1.5 text-sm">
                      {step.tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                          <span>{tip}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-2">
                    {step.actions.map((action, index) => (
                      <Button
                        key={index}
                        asChild
                        variant={action.variant || 'default'}
                        className="gap-2"
                      >
                        <Link href={action.href}>
                          {action.label}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* FAQ Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-5 w-5" />
            Frequently Asked Questions
          </CardTitle>
          <CardDescription>
            Common questions about setting up and using CommissionFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-left">
                What&apos;s the difference between a Commission Plan and a Commission Calculation?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  A <strong>Commission Plan</strong> is the structure or template that defines how commissions are calculated (e.g., &quot;10% of all sales revenue&quot;). It contains the rules and logic.
                </p>
                <p>
                  A <strong>Commission Calculation</strong> is the actual commission amount earned on a specific sale. When you create a sale, the system uses the assigned commission plan to calculate the specific commission amount.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-left">
                How do I assign a commission plan to a team member?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  When you invite a team member or edit their profile in the Team Members page, you can select which commission plan applies to them. Each salesperson can only be assigned to one plan at a time, but you can change their plan assignment at any time.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-left">
                Can I have different commission plans for different products or territories?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  Yes! You can create multiple commission plans and assign different team members to different plans. You can also create plans with rules that vary based on product categories, customer tiers, or territories.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-left">
                What happens to demo data when I add real data?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  Demo data exists alongside real data in your system. When you&apos;re ready to start using real data, you can clear all demo data at once from the Demo Data page. This will not affect any real clients, projects, or sales you&apos;ve added.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-left">
                How do commission approvals work?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-2">
                <p>
                  When a sale is created, commissions are automatically calculated but start in a &quot;PENDING&quot; status. As an admin, you can review and approve these commissions. Once approved, they can be processed for payout.
                </p>
                <p>
                  This approval workflow ensures accuracy and gives you control over when commissions are officially recognized.
                </p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-left">
                Can I integrate with my accounting system?
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>
                  Yes! Visit the Integrations page to connect with popular accounting systems like Acumatica, Sage Intacct, and Microsoft Dynamics BC. These integrations can automate sales data sync and commission calculations.
                </p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>

      {/* Additional Resources */}
      <Card className="border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-green-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Additional Resources
          </CardTitle>
          <CardDescription>
            More ways to get help and learn about CommissionFlow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/dashboard/settings">
                <Settings className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-semibold">System Settings</div>
                  <div className="text-xs text-muted-foreground">Configure your organization preferences</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/dashboard/integrations">
                <CheckCircle className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-semibold">Integrations</div>
                  <div className="text-xs text-muted-foreground">Connect your accounting system</div>
                </div>
              </Link>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <a href="mailto:support@commissionflow.com">
                <ExternalLink className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-semibold">Contact Support</div>
                  <div className="text-xs text-muted-foreground">Get help from our team</div>
                </div>
              </a>
            </Button>

            <Button variant="outline" className="justify-start gap-2 h-auto py-3" asChild>
              <Link href="/dashboard/audit-logs">
                <FileText className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-semibold">Audit Logs</div>
                  <div className="text-xs text-muted-foreground">Track all system changes</div>
                </div>
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Quick Tips */}
      <Card className="border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-blue-500/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Pro Tips for Success
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Start Simple:</strong> Create a basic commission plan first, then add complexity as you become familiar with the system.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Use Demo Data:</strong> Generate demo data to test different commission structures before applying them to your real team.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Review Regularly:</strong> Check the Pending Approvals section frequently to keep commissions flowing smoothly.
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong>Leverage Reports:</strong> Use the Reports page to identify top performers and optimize your commission structure.
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}
