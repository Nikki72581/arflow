import { PrismaClient, UserRole, CustomerTier, ClientStatus, CommissionRuleType } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...')
  await prisma.commissionCalculation.deleteMany()
  await prisma.salesTransaction.deleteMany()
  await prisma.commissionRule.deleteMany()
  await prisma.commissionPlan.deleteMany()
  await prisma.project.deleteMany()
  await prisma.client.deleteMany()
  await prisma.user.deleteMany()
  await prisma.organization.deleteMany()

  // Create test organization
  console.log('🏢 Creating test organization...')
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      planTier: 'PROFESSIONAL',
      requireProjects: true,
    },
  })

  // Create test users
  console.log('👥 Creating test users...')
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@test.com',
      firstName: 'Admin',
      lastName: 'User',
      role: UserRole.ADMIN,
      organizationId: org.id,
      clerkId: 'clerk_admin_test_id',
    },
  })

  const salesUser1 = await prisma.user.create({
    data: {
      email: 'sales1@test.com',
      firstName: 'John',
      lastName: 'Smith',
      role: UserRole.SALESPERSON,
      organizationId: org.id,
      clerkId: 'clerk_sales1_test_id',
    },
  })

  const salesUser2 = await prisma.user.create({
    data: {
      email: 'sales2@test.com',
      firstName: 'Jane',
      lastName: 'Doe',
      role: UserRole.SALESPERSON,
      organizationId: org.id,
      clerkId: 'clerk_sales2_test_id',
    },
  })

  // Create test clients with different tiers
  console.log('🏢 Creating test clients...')
  const standardClient = await prisma.client.create({
    data: {
      name: 'Standard Corp',
      email: 'contact@standardcorp.com',
      phone: '555-0001',
      address: '100 Standard St',
      tier: CustomerTier.STANDARD,
      status: ClientStatus.ACTIVE,
      organizationId: org.id,
    },
  })

  const vipClient = await prisma.client.create({
    data: {
      name: 'VIP Industries',
      email: 'contact@vipindustries.com',
      phone: '555-0002',
      address: '200 VIP Ave',
      tier: CustomerTier.VIP,
      status: ClientStatus.ACTIVE,
      organizationId: org.id,
    },
  })

  const enterpriseClient = await prisma.client.create({
    data: {
      name: 'Enterprise Solutions Inc',
      email: 'contact@enterprise.com',
      phone: '555-0003',
      address: '300 Enterprise Blvd',
      tier: CustomerTier.ENTERPRISE,
      status: ClientStatus.ACTIVE,
      organizationId: org.id,
    },
  })

  const newClient = await prisma.client.create({
    data: {
      name: 'New Startup LLC',
      email: 'hello@newstartup.com',
      phone: '555-0004',
      tier: CustomerTier.NEW,
      status: ClientStatus.ACTIVE,
      organizationId: org.id,
    },
  })

  const inactiveClient = await prisma.client.create({
    data: {
      name: 'Inactive Company',
      email: 'contact@inactive.com',
      tier: CustomerTier.STANDARD,
      status: ClientStatus.INACTIVE,
      organizationId: org.id,
    },
  })

  // Create test projects
  console.log('📋 Creating test projects...')
  const project1 = await prisma.project.create({
    data: {
      name: 'Website Redesign',
      description: 'Complete website redesign project',
      clientId: standardClient.id,
      organizationId: org.id,
      status: 'active',
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-06-30'),
    },
  })

  const project2 = await prisma.project.create({
    data: {
      name: 'Mobile App Development',
      description: 'iOS and Android app development',
      clientId: vipClient.id,
      organizationId: org.id,
      status: 'active',
      startDate: new Date('2024-02-01'),
      endDate: new Date('2024-12-31'),
    },
  })

  const project3 = await prisma.project.create({
    data: {
      name: 'Cloud Migration',
      description: 'Migrate infrastructure to cloud',
      clientId: enterpriseClient.id,
      organizationId: org.id,
      status: 'in-progress',
      startDate: new Date('2024-03-01'),
    },
  })

  const project4 = await prisma.project.create({
    data: {
      name: 'Brand Identity',
      description: 'Logo and brand guidelines',
      clientId: newClient.id,
      organizationId: org.id,
      status: 'active',
      startDate: new Date('2024-04-01'),
    },
  })

  const completedProject = await prisma.project.create({
    data: {
      name: 'Completed Project',
      description: 'This project is completed',
      clientId: standardClient.id,
      organizationId: org.id,
      status: 'completed',
      startDate: new Date('2023-01-01'),
      endDate: new Date('2023-12-31'),
    },
  })

  // Create commission plans with various rule types
  console.log('💰 Creating commission plans...')

  // Standard 10% plan
  const standardPlan = await prisma.commissionPlan.create({
    data: {
      name: 'Standard Sales Plan',
      description: 'Standard 10% commission on all sales',
      organizationId: org.id,
      isActive: true,
    },
  })

  await prisma.commissionRule.create({
    data: {
      commissionPlanId: standardPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 10.0,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // VIP tier plan (15%)
  const vipPlan = await prisma.commissionPlan.create({
    data: {
      name: 'VIP Client Plan',
      description: 'Enhanced 15% commission for VIP clients',
      organizationId: org.id,
      isActive: true,
    },
  })

  await prisma.commissionRule.create({
    data: {
      commissionPlanId: vipPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 15.0,
      customerTier: CustomerTier.VIP,
      scope: 'CUSTOMER_TIER',
      priority: 'CUSTOMER_TIER',
    },
  })

  // Flat amount plan
  const flatPlan = await prisma.commissionPlan.create({
    data: {
      name: 'Flat Bonus Plan',
      description: '$500 per sale',
      organizationId: org.id,
      isActive: true,
    },
  })

  await prisma.commissionRule.create({
    data: {
      commissionPlanId: flatPlan.id,
      ruleType: CommissionRuleType.FLAT_AMOUNT,
      flatAmount: 500.0,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // Tiered plan
  const tieredPlan = await prisma.commissionPlan.create({
    data: {
      name: 'Tiered Accelerator Plan',
      description: 'Progressive commission rates based on sale amount',
      organizationId: org.id,
      isActive: true,
    },
  })

  // Tier 1: 5% for sales $0-$10,000
  await prisma.commissionRule.create({
    data: {
      commissionPlanId: tieredPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 5.0,
      minSaleAmount: 0,
      maxSaleAmount: 10000,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // Tier 2: 7% for sales $10,001-$50,000
  await prisma.commissionRule.create({
    data: {
      commissionPlanId: tieredPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 7.0,
      minSaleAmount: 10001,
      maxSaleAmount: 50000,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // Tier 3: 10% for sales over $50,000
  await prisma.commissionRule.create({
    data: {
      commissionPlanId: tieredPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 10.0,
      minSaleAmount: 50001,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // Capped plan (with min/max)
  const cappedPlan = await prisma.commissionPlan.create({
    data: {
      name: 'Capped Commission Plan',
      description: '10% commission with $200 min and $5,000 max',
      organizationId: org.id,
      isActive: true,
    },
  })

  await prisma.commissionRule.create({
    data: {
      commissionPlanId: cappedPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 10.0,
      minAmount: 200.0,
      maxAmount: 5000.0,
      scope: 'GLOBAL',
      priority: 'DEFAULT',
    },
  })

  // Project-specific plan
  const projectPlan = await prisma.commissionPlan.create({
    data: {
      name: 'Mobile App Project Plan',
      description: 'Custom plan for mobile app project',
      organizationId: org.id,
      projectId: project2.id,
      isActive: true,
    },
  })

  await prisma.commissionRule.create({
    data: {
      commissionPlanId: projectPlan.id,
      ruleType: CommissionRuleType.PERCENTAGE,
      percentage: 12.0,
      scope: 'GLOBAL',
      priority: 'PROJECT_SPECIFIC',
    },
  })

  // Create some test sales transactions
  console.log('💵 Creating sales transactions...')
  await prisma.salesTransaction.create({
    data: {
      amount: 5000,
      projectId: project1.id,
      clientId: standardClient.id,
      userId: salesUser1.id,
      organizationId: org.id,
      transactionType: 'SALE',
      transactionDate: new Date('2024-05-01'),
      description: 'Website design deposit',
      invoiceNumber: 'INV-2024-001',
    },
  })

  await prisma.salesTransaction.create({
    data: {
      amount: 15000,
      projectId: project2.id,
      clientId: vipClient.id,
      userId: salesUser1.id,
      organizationId: org.id,
      transactionType: 'SALE',
      transactionDate: new Date('2024-05-15'),
      description: 'Mobile app milestone 1',
      invoiceNumber: 'INV-2024-002',
    },
  })

  await prisma.salesTransaction.create({
    data: {
      amount: 75000,
      projectId: project3.id,
      clientId: enterpriseClient.id,
      userId: salesUser2.id,
      organizationId: org.id,
      transactionType: 'SALE',
      transactionDate: new Date('2024-05-20'),
      description: 'Cloud migration phase 1',
      invoiceNumber: 'INV-2024-003',
    },
  })

  await prisma.salesTransaction.create({
    data: {
      amount: 3500,
      projectId: project4.id,
      clientId: newClient.id,
      userId: salesUser2.id,
      organizationId: org.id,
      transactionType: 'SALE',
      transactionDate: new Date('2024-05-25'),
      description: 'Brand identity package',
      invoiceNumber: 'INV-2024-004',
    },
  })

  console.log('✅ Seed data created successfully!')
  console.log(`
📊 Summary:
- Organization: ${org.name}
- Users: 3 (1 admin, 2 salespeople)
- Clients: 5 (across all tiers)
- Projects: 5 (various statuses)
- Commission Plans: 6 (with various rule types)
- Sales Transactions: 4
  `)
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
