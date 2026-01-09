/**
 * Diagnostic script to check customer mappings
 * Usage: npx tsx scripts/check-customer-mapping.ts [customerId]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.ENABLE_CUSTOMER_MAPPING_CHECK !== 'true') {
    console.log('\n⚠️  Customer mapping check is temporarily disabled.\n');
    console.log('Set ENABLE_CUSTOMER_MAPPING_CHECK=true to re-enable.\n');
    return;
  }

  const customerId = process.argv[2] || 'CUST001';

  console.log(`\n🔍 Checking customer mapping for: "${customerId}"\n`);

  // Get all Acumatica integrations
  const integrations = await prisma.acumaticaIntegration.findMany({
    select: {
      id: true,
      organizationId: true,
    },
  });

  console.log(`Found ${integrations.length} integration(s)\n`);

  for (const integration of integrations) {
    console.log(`\n📋 Integration: ${integration.id}`);
    console.log(`   Organization: ${integration.organizationId}`);

    // Get all customer mappings
    const allMappings = await prisma.acumaticaCustomerMapping.findMany({
      where: { integrationId: integration.id },
      orderBy: { acumaticaCustomerId: 'asc' },
    });

    // Get all associated customers
    const customerIds = allMappings.map(m => m.customerId).filter((id): id is string => id !== null);
    const customers = await prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        companyName: true,
        email: true,
        customerNumber: true,
        status: true,
      },
    });
    const customersMap = new Map(customers.map(c => [c.id, c]));

    console.log(`\n   Total mappings: ${allMappings.length}`);

    // Find the specific mapping
    const targetMapping = allMappings.find(
      m => m.acumaticaCustomerId === customerId
    );

    if (targetMapping) {
      const mappedCustomer = targetMapping.customerId ? customersMap.get(targetMapping.customerId) : null;

      console.log(`\n   ✅ Found mapping for "${customerId}":`);
      console.log(`      ID: ${targetMapping.id}`);
      console.log(`      Acumatica ID: "${targetMapping.acumaticaCustomerId}"`);
      console.log(`      Acumatica Name: ${targetMapping.acumaticaCustomerName}`);
      console.log(`      Acumatica Email: ${targetMapping.acumaticaEmail}`);
      console.log(`      Status: ${targetMapping.status}`);
      console.log(`      Match Type: ${targetMapping.matchType}`);
      console.log(`      Customer ID: ${targetMapping.customerId || 'NULL'}`);

      if (mappedCustomer) {
        console.log(`\n      🏢 Mapped Customer:`);
        console.log(`         Company: ${mappedCustomer.companyName}`);
        console.log(`         Email: ${mappedCustomer.email || 'N/A'}`);
        console.log(`         Customer Number: ${mappedCustomer.customerNumber || 'N/A'}`);
        console.log(`         Status: ${mappedCustomer.status}`);
      } else if (targetMapping.customerId) {
        console.log(`\n      ⚠️  Customer ID exists but customer not found in database!`);
      } else {
        console.log(`\n      ⚠️  No customer linked!`);
      }
    } else {
      console.log(`\n   ❌ No mapping found for "${customerId}"`);
    }

    // Show similar IDs for debugging
    console.log(`\n   📝 All customer IDs in database:`);
    allMappings.forEach((m, i) => {
      const mappedCustomer = m.customerId ? customersMap.get(m.customerId) : null;
      const hasCustomer = m.customerId ? '✓' : '✗';
      const statusIcon = m.status === 'MATCHED' ? '✓' : m.status === 'PLACEHOLDER' ? '○' : '⊗';
      console.log(`      ${i + 1}. [${hasCustomer}][${statusIcon}] "${m.acumaticaCustomerId}" (${m.status}) → ${mappedCustomer?.companyName || 'NO CUSTOMER'}`);
    });

    // Check for case-insensitive matches
    const caseInsensitiveMatches = allMappings.filter(
      m => m.acumaticaCustomerId.toLowerCase() === customerId.toLowerCase() &&
           m.acumaticaCustomerId !== customerId
    );

    if (caseInsensitiveMatches.length > 0) {
      console.log(`\n   ⚠️  Found ${caseInsensitiveMatches.length} case-insensitive match(es):`);
      caseInsensitiveMatches.forEach(m => {
        console.log(`      "${m.acumaticaCustomerId}" (case differs from search)`);
      });
    }

    // Check for whitespace issues
    const trimmedMatches = allMappings.filter(
      m => m.acumaticaCustomerId.trim() === customerId.trim() &&
           m.acumaticaCustomerId !== customerId
    );

    if (trimmedMatches.length > 0) {
      console.log(`\n   ⚠️  Found ${trimmedMatches.length} match(es) with whitespace differences:`);
      trimmedMatches.forEach(m => {
        console.log(`      "${m.acumaticaCustomerId}" (length: ${m.acumaticaCustomerId.length})`);
      });
    }
  }

  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
