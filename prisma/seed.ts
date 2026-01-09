import {
  PrismaClient,
  UserRole,
  PlanTier,
  DocumentType,
  DocumentStatus,
  PaymentMethod,
  PaymentStatus,
  CustomerStatus,
  RecordSourceType,
} from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Clean up existing data
  console.log('🧹 Cleaning up existing data...')
  await prisma.paymentApplication.deleteMany()
  await prisma.customerPayment.deleteMany()
  await prisma.arDocument.deleteMany()
  await prisma.acumaticaCustomerMapping.deleteMany()
  await prisma.integrationSyncLog.deleteMany()
  await prisma.acumaticaIntegration.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.customer.deleteMany()
  await prisma.organization.deleteMany()

  // Create test organization
  console.log('🏢 Creating test organization...')
  const org = await prisma.organization.create({
    data: {
      name: 'Test Organization',
      slug: 'test-org',
      planTier: PlanTier.PROFESSIONAL,
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

  const opsUser = await prisma.user.create({
    data: {
      email: 'ops@test.com',
      firstName: 'Jordan',
      lastName: 'Lee',
      role: UserRole.ADMIN,
      organizationId: org.id,
      clerkId: 'clerk_ops_test_id',
    },
  })

  // Create test customers
  console.log('🏢 Creating test customers...')
  const standardCustomer = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-1001',
      companyName: 'Standard Corp',
      contactName: 'Avery Chen',
      email: 'ap@standardcorp.com',
      phone: '555-0001',
      billingAddress1: '100 Standard St',
      billingCity: 'Austin',
      billingState: 'TX',
      billingZip: '78701',
      billingCountry: 'US',
      shippingAddress1: '100 Standard St',
      shippingCity: 'Austin',
      shippingState: 'TX',
      shippingZip: '78701',
      shippingCountry: 'US',
      creditLimit: 25000,
      currentBalance: 1500,
      status: CustomerStatus.ACTIVE,
      paymentTerms: 'Net 30',
      portalEnabled: true,
      organizationId: org.id,
      sourceType: RecordSourceType.MANUAL,
    },
  })

  const enterpriseCustomer = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-2001',
      companyName: 'Enterprise Solutions Inc',
      contactName: 'Riley Patel',
      email: 'billing@enterprise.com',
      phone: '555-0003',
      billingAddress1: '300 Enterprise Blvd',
      billingCity: 'Denver',
      billingState: 'CO',
      billingZip: '80202',
      billingCountry: 'US',
      creditLimit: 100000,
      currentBalance: 0,
      status: CustomerStatus.ACTIVE,
      paymentTerms: 'Net 45',
      portalEnabled: true,
      organizationId: org.id,
      sourceType: RecordSourceType.INTEGRATION,
      externalSystem: 'ACUMATICA',
      externalId: 'ENT-2001',
    },
  })

  const onHoldCustomer = await prisma.customer.create({
    data: {
      customerNumber: 'CUST-3001',
      companyName: 'On Hold Co',
      contactName: 'Morgan Blake',
      email: 'ap@onholdco.com',
      phone: '555-0004',
      billingAddress1: '400 Hold Ave',
      billingCity: 'Phoenix',
      billingState: 'AZ',
      billingZip: '85004',
      billingCountry: 'US',
      creditLimit: 5000,
      currentBalance: 8000,
      status: CustomerStatus.ON_HOLD,
      paymentTerms: 'Due on receipt',
      portalEnabled: false,
      organizationId: org.id,
      sourceType: RecordSourceType.MANUAL,
      notes: 'On hold pending collections review.',
    },
  })

  // Create portal users linked to customers
  console.log('👤 Creating portal users...')
  const standardPortalUser = await prisma.user.create({
    data: {
      email: 'finance@standardcorp.com',
      firstName: 'Sam',
      lastName: 'Rivera',
      role: UserRole.CUSTOMER,
      organizationId: org.id,
      customerId: standardCustomer.id,
      clerkId: 'clerk_customer_standard_id',
      emailNotifications: true,
      invoiceAlerts: true,
      paymentAlerts: true,
      statementAlerts: false,
    },
  })

  const enterprisePortalUser = await prisma.user.create({
    data: {
      email: 'finance@enterprise.com',
      firstName: 'Casey',
      lastName: 'Nguyen',
      role: UserRole.CUSTOMER,
      organizationId: org.id,
      customerId: enterpriseCustomer.id,
      clerkId: 'clerk_customer_enterprise_id',
      emailNotifications: true,
      invoiceAlerts: true,
      paymentAlerts: false,
      statementAlerts: true,
    },
  })

  // Create AR documents
  console.log('📄 Creating AR documents...')
  const invoice1 = await prisma.arDocument.create({
    data: {
      organizationId: org.id,
      customerId: standardCustomer.id,
      documentType: DocumentType.INVOICE,
      documentNumber: 'INV-2024-1001',
      referenceNumber: 'PO-3001',
      documentDate: new Date('2024-06-01'),
      dueDate: new Date('2024-07-01'),
      subtotal: 1200,
      taxAmount: 96,
      totalAmount: 1296,
      amountPaid: 500,
      balanceDue: 796,
      status: DocumentStatus.PARTIAL,
      description: 'June subscription and usage',
      customerNotes: 'Thank you for your business.',
      sourceType: RecordSourceType.MANUAL,
    },
  })

  const invoice2 = await prisma.arDocument.create({
    data: {
      organizationId: org.id,
      customerId: enterpriseCustomer.id,
      documentType: DocumentType.INVOICE,
      documentNumber: 'INV-2024-2001',
      referenceNumber: 'PO-9102',
      documentDate: new Date('2024-05-15'),
      dueDate: new Date('2024-06-29'),
      subtotal: 8000,
      taxAmount: 0,
      totalAmount: 8000,
      amountPaid: 8000,
      balanceDue: 0,
      status: DocumentStatus.PAID,
      description: 'Professional services',
      sourceType: RecordSourceType.INTEGRATION,
      externalSystem: 'ACUMATICA',
      externalId: 'INV-ACU-2001',
    },
  })

  const creditMemo = await prisma.arDocument.create({
    data: {
      organizationId: org.id,
      customerId: standardCustomer.id,
      documentType: DocumentType.CREDIT_MEMO,
      documentNumber: 'CM-2024-1001',
      documentDate: new Date('2024-06-10'),
      subtotal: -200,
      taxAmount: 0,
      totalAmount: -200,
      amountPaid: 0,
      balanceDue: -200,
      status: DocumentStatus.OPEN,
      description: 'Credit for service issue',
      sourceType: RecordSourceType.MANUAL,
    },
  })

  // Create customer payments
  console.log('💳 Creating customer payments...')
  const payment1 = await prisma.customerPayment.create({
    data: {
      organizationId: org.id,
      customerId: standardCustomer.id,
      paymentNumber: 'PAY-2024-0001',
      paymentDate: new Date('2024-06-15'),
      amount: 500,
      paymentMethod: PaymentMethod.ACH,
      referenceNumber: 'ACH-0001',
      status: PaymentStatus.APPLIED,
      notes: 'Partial payment for June invoice',
      sourceType: RecordSourceType.MANUAL,
    },
  })

  const payment2 = await prisma.customerPayment.create({
    data: {
      organizationId: org.id,
      customerId: enterpriseCustomer.id,
      paymentNumber: 'PAY-2024-0002',
      paymentDate: new Date('2024-05-20'),
      amount: 8000,
      paymentMethod: PaymentMethod.WIRE,
      referenceNumber: 'WIRE-7781',
      status: PaymentStatus.APPLIED,
      notes: 'Full payment for INV-2024-2001',
      sourceType: RecordSourceType.INTEGRATION,
      externalSystem: 'ACUMATICA',
      externalId: 'PMT-ACU-2001',
    },
  })

  // Apply payments to documents
  console.log('🧾 Applying payments...')
  await prisma.paymentApplication.create({
    data: {
      organizationId: org.id,
      paymentId: payment1.id,
      arDocumentId: invoice1.id,
      amountApplied: 500,
    },
  })

  await prisma.paymentApplication.create({
    data: {
      organizationId: org.id,
      paymentId: payment2.id,
      arDocumentId: invoice2.id,
      amountApplied: 8000,
    },
  })

  // Audit logs
  console.log('📝 Creating audit logs...')
  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: 'Admin User',
      userEmail: adminUser.email,
      action: 'customer_created',
      entityType: 'customer',
      entityId: standardCustomer.id,
      description: 'Created customer Standard Corp.',
      organizationId: org.id,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: opsUser.id,
      userName: 'Jordan Lee',
      userEmail: opsUser.email,
      action: 'invoice_imported',
      entityType: 'invoice',
      entityId: invoice2.id,
      description: 'Imported invoice INV-2024-2001 from Acumatica.',
      organizationId: org.id,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: standardPortalUser.id,
      userName: 'Sam Rivera',
      userEmail: standardPortalUser.email,
      action: 'portal_invite_sent',
      entityType: 'user',
      entityId: standardPortalUser.id,
      description: 'Sent portal invite to Standard Corp.',
      organizationId: org.id,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: enterprisePortalUser.id,
      userName: 'Casey Nguyen',
      userEmail: enterprisePortalUser.email,
      action: 'portal_invite_sent',
      entityType: 'user',
      entityId: enterprisePortalUser.id,
      description: 'Sent portal invite to Enterprise Solutions Inc.',
      organizationId: org.id,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: adminUser.id,
      userName: 'Admin User',
      userEmail: adminUser.email,
      action: 'customer_status_updated',
      entityType: 'customer',
      entityId: onHoldCustomer.id,
      description: 'Placed On Hold Co on hold due to collections review.',
      organizationId: org.id,
      ipAddress: '127.0.0.1',
      userAgent: 'seed-script',
    },
  })

  console.log('✅ Seed data created successfully!')
  console.log(`
📊 Summary:
- Organization: ${org.name}
- Users: 4 (2 admins, 2 customers)
- Customers: 3
- AR Documents: 3
- Payments: 2
- Payment Applications: 2
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
