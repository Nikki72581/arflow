// src/app/api/admin/demo-data/sales/route.ts
// IMPROVED VERSION with better plan matching logic

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { prisma } from '@/lib/db'
import { faker } from '@faker-js/faker'
import { CommissionStatus, CommissionRuleType } from '@prisma/client'

function randomDate(start: Date, end: Date) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()))
}

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

async function calculateCommission(saleAmount: number, commissionPlanId: string) {
  const rules = await prisma.commissionRule.findMany({
    where: { commissionPlanId },
  })

  console.log(`   💰 Calculating commission with ${rules.length} rule(s)`)

  let commissionAmount = 0

  for (const rule of rules) {
    if (rule.ruleType === CommissionRuleType.PERCENTAGE) {
      commissionAmount += saleAmount * (rule.percentage! / 100)
      console.log(`      - PERCENTAGE: ${rule.percentage}% = $${(saleAmount * (rule.percentage! / 100)).toFixed(2)}`)
    } else if (rule.ruleType === CommissionRuleType.FLAT_AMOUNT) {
      commissionAmount += rule.flatAmount!
      console.log(`      - FLAT: $${rule.flatAmount}`)
    } else if (rule.ruleType === CommissionRuleType.TIERED) {
      if (saleAmount <= rule.tierThreshold!) {
        const amt = saleAmount * (rule.percentage! / 100)
        commissionAmount += amt
        console.log(`      - TIERED (below threshold): ${rule.percentage}% = $${amt.toFixed(2)}`)
      } else {
        const baseAmt = rule.tierThreshold! * (rule.percentage! / 100)
        const tierAmt = (saleAmount - rule.tierThreshold!) * (rule.tierPercentage! / 100)
        commissionAmount += baseAmt + tierAmt
        console.log(`      - TIERED: base $${baseAmt.toFixed(2)} + tier $${tierAmt.toFixed(2)}`)
      }
    }
  }

  // Apply caps
  const maxCap = Math.max(...rules.filter(r => r.maxAmount).map(r => r.maxAmount!), 0)
  const minCap = Math.max(...rules.filter(r => r.minAmount).map(r => r.minAmount!), 0)
  
  if (maxCap > 0) {
    console.log(`      - Max cap: $${maxCap}`)
    commissionAmount = Math.min(commissionAmount, maxCap)
  }
  if (minCap > 0) {
    console.log(`      - Min cap: $${minCap}`)
    commissionAmount = Math.max(commissionAmount, minCap)
  }

  const final = Math.round(commissionAmount * 100) / 100
  console.log(`      = TOTAL: $${final}`)
  return final
}

function findApplicablePlan(project: any, commissionPlans: any[]) {
  console.log(`   🔍 Finding plan for project: ${project.name}`)
  
  // First: Try to find project-specific plan
  const projectPlan = commissionPlans.find(p => p.projectId === project.id && p.isActive)
  if (projectPlan) {
    console.log(`   ✅ Using PROJECT-SPECIFIC plan: "${projectPlan.name}"`)
    return projectPlan
  }
  
  // Second: Try to find org-wide active plans
  const orgPlans = commissionPlans.filter(p => !p.projectId && p.isActive)
  if (orgPlans.length > 0) {
    const selectedPlan = randomItem(orgPlans)
    console.log(`   ✅ Using ORG-WIDE plan: "${selectedPlan.name}" (${orgPlans.length} org-wide plans available)`)
    return selectedPlan
  }
  
  // Third: Try ANY plan with rules (even if not marked active)
  const plansWithRules = commissionPlans.filter(p => {
    // We'll check for rules in the next query
    return true
  })
  
  if (plansWithRules.length > 0) {
    const fallbackPlan = randomItem(plansWithRules)
    console.log(`   ⚠️  Using FALLBACK plan: "${fallbackPlan.name}" (not marked active or project-specific)`)
    return fallbackPlan
  }
  
  console.log(`   ❌ No applicable plan found!`)
  return null
}

export async function POST(req: NextRequest) {
  console.log('📥 Sales API route called')
  
  try {
    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { role: true, organizationId: true },
    })

    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 })
    }

    const body = await req.json()
    const count = body.count || 10
    console.log(`📊 Creating ${count} sales\n`)

    // Get organization settings
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { requireProjects: true },
    })

    // Get required data
    const [projects, clients, salespeople, commissionPlans] = await Promise.all([
      prisma.project.findMany({ where: { organizationId: user.organizationId } }),
      prisma.client.findMany({ where: { organizationId: user.organizationId } }),
      prisma.user.findMany({ where: { organizationId: user.organizationId, role: 'SALESPERSON' } }),
      prisma.commissionPlan.findMany({
        where: { organizationId: user.organizationId },
        include: { rules: true }
      }),
    ])

    console.log('📋 Available resources:')
    console.log(`   - Organization requires projects: ${organization?.requireProjects}`)
    console.log(`   - Projects: ${projects.length}`)
    console.log(`   - Clients: ${clients.length}`)
    console.log(`   - Salespeople: ${salespeople.length}`)
    console.log(`   - Commission Plans: ${commissionPlans.length}`)

    // Log details about commission plans
    if (commissionPlans.length > 0) {
      console.log('\n📊 Commission Plans Detail:')
      commissionPlans.forEach(plan => {
        const projectInfo = plan.projectId ? 'Project-specific' : 'ORG-WIDE'
        const activeInfo = plan.isActive ? 'ACTIVE' : 'INACTIVE'
        const rulesInfo = `${plan.rules.length} rule(s)`
        console.log(`   - "${plan.name}" [${projectInfo}, ${activeInfo}, ${rulesInfo}]`)
      })
    }
    console.log()

    // Check if we have the required resources based on organization settings
    if (organization?.requireProjects && projects.length === 0) {
      return NextResponse.json({ error: 'No projects found. Please generate projects first (or disable requireProjects in organization settings).' }, { status: 400 })
    }
    if (!organization?.requireProjects && clients.length === 0 && projects.length === 0) {
      return NextResponse.json({ error: 'No clients or projects found. Please generate at least clients or projects first.' }, { status: 400 })
    }
    if (salespeople.length === 0) {
      return NextResponse.json({ error: 'No salespeople found in your organization.' }, { status: 400 })
    }
    if (commissionPlans.length === 0) {
      return NextResponse.json({ error: 'No commission plans found. Please create at least one commission plan first.' }, { status: 400 })
    }

    // Check if at least one plan has rules
    const plansWithRules = commissionPlans.filter(p => p.rules.length > 0)
    if (plansWithRules.length === 0) {
      return NextResponse.json({ 
        error: `Found ${commissionPlans.length} commission plan(s), but none have any rules! Please add at least one rule to a plan.` 
      }, { status: 400 })
    }

    const sales = []
    const commissions = []
    const skipped = []
    const now = new Date()
    const startDate = new Date(now.getFullYear(), 0, 1)
    const endDate = new Date()

    for (let i = 0; i < count; i++) {
      const salesperson = randomItem(salespeople)
      const transactionDate = randomDate(startDate, endDate)
      const amount = Math.round(5000 + Math.random() * 95000)

      // Determine if this sale should have a project or just a client
      let project = null
      let client = null

      // Logic to determine what to use
      const shouldUseProject = organization?.requireProjects || (projects.length > 0 && clients.length === 0) || (projects.length > 0 && Math.random() > 0.3)

      if (shouldUseProject && projects.length > 0) {
        // Use a project
        project = randomItem(projects)
        console.log(`\n💼 Sale ${i + 1}/${count}:`)
        console.log(`   Project: ${project.name}`)
        console.log(`   Amount: $${amount.toLocaleString()}`)
        console.log(`   Salesperson: ${salesperson.firstName} ${salesperson.lastName}`)
      } else if (clients.length > 0) {
        // Use a client directly (no project)
        client = randomItem(clients)
        console.log(`\n💼 Sale ${i + 1}/${count}:`)
        console.log(`   Client: ${client.name} (no project)`)
        console.log(`   Amount: $${amount.toLocaleString()}`)
        console.log(`   Salesperson: ${salesperson.firstName} ${salesperson.lastName}`)
      } else {
        console.log(`\n⚠️  Sale ${i + 1}/${count}: Skipping - no projects or clients available`)
        continue
      }

      // Create sale
      const saleData: any = {
        amount,
        userId: salesperson.id,
        organizationId: user.organizationId,
        transactionDate,
        description: faker.commerce.productDescription(),
        invoiceNumber: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
      }

      if (project) {
        saleData.projectId = project.id
      }
      if (client) {
        saleData.clientId = client.id
      }

      const sale = await prisma.salesTransaction.create({
        data: saleData,
      })
      sales.push(sale)
      console.log(`   ✅ Created sale: ${sale.invoiceNumber}`)

      // Find applicable plan using improved logic
      let applicablePlan
      if (project) {
        applicablePlan = findApplicablePlan(project, commissionPlans)
      } else {
        // For sales without projects, use org-wide plans
        const orgWidePlans = commissionPlans.filter(p => !p.projectId && p.isActive)
        if (orgWidePlans.length > 0) {
          applicablePlan = randomItem(orgWidePlans)
          console.log(`   ✅ Using ORG-WIDE plan: "${applicablePlan.name}"`)
        } else {
          // Fallback to any plan with rules
          const anyPlanWithRules = commissionPlans.filter(p => p.rules.length > 0)
          if (anyPlanWithRules.length > 0) {
            applicablePlan = randomItem(anyPlanWithRules)
            console.log(`   ⚠️  Using FALLBACK plan: "${applicablePlan.name}"`)
          }
        }
      }

      if (!applicablePlan) {
        console.log(`   ⚠️  No plan found - skipping commission`)
        skipped.push(sale.invoiceNumber)
        continue
      }

      // Check plan has rules
      if (applicablePlan.rules.length === 0) {
        console.log(`   ⚠️  Plan "${applicablePlan.name}" has no rules - skipping commission`)
        skipped.push(sale.invoiceNumber)
        continue
      }

      // Calculate commission
      const commissionAmount = await calculateCommission(amount, applicablePlan.id)

      // Determine status based on age
      const daysSince = (new Date().getTime() - transactionDate.getTime()) / (1000 * 60 * 60 * 24)
      let status: CommissionStatus
      let approvedAt: Date | null = null
      let paidAt: Date | null = null

      if (daysSince < 14) {
        status = CommissionStatus.PENDING
      } else if (daysSince < 30) {
        status = CommissionStatus.APPROVED
        approvedAt = new Date(transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
      } else {
        status = CommissionStatus.PAID
        approvedAt = new Date(transactionDate.getTime() + 7 * 24 * 60 * 60 * 1000)
        paidAt = new Date(transactionDate.getTime() + 21 * 24 * 60 * 60 * 1000)
      }

      const commission = await prisma.commissionCalculation.create({
        data: {
          salesTransactionId: sale.id,
          commissionPlanId: applicablePlan.id,
          userId: salesperson.id,
          organizationId: user.organizationId,
          amount: commissionAmount,
          status,
          calculatedAt: transactionDate,
          approvedAt,
          paidAt,
        },
      })
      commissions.push(commission)
      console.log(`   ✅ Created commission: $${commissionAmount} [${status}]`)
    }

    console.log('\n🎉 Summary:')
    console.log(`   - Sales created: ${sales.length}`)
    console.log(`   - Commissions created: ${commissions.length}`)
    if (skipped.length > 0) {
      console.log(`   - Skipped (no plan): ${skipped.length}`)
    }
    
    return NextResponse.json({ 
      success: true, 
      salesCount: sales.length,
      commissionsCount: commissions.length,
      skippedCount: skipped.length,
      message: skipped.length > 0 
        ? `Created ${sales.length} sales and ${commissions.length} commissions. ${skipped.length} sales had no applicable plan.`
        : `Created ${sales.length} sales and ${commissions.length} commissions.`
    })
    
  } catch (error: any) {
    console.error('❌ Error in sales route:', error)
    console.error('Error stack:', error.stack)

    // Return detailed error information
    return NextResponse.json({
      error: error.message || 'Internal server error',
      details: error.stack,
      type: error.constructor.name
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ 
    message: 'Sales endpoint is working. Use POST to create sales.',
    method: 'POST',
    requiredBody: { count: 'number' }
  })
}
