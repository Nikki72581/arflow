/**
 * Diagnostic script to check salesperson mappings
 * Usage: npx tsx scripts/check-salesperson-mapping.ts [salespersonId]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  if (process.env.ENABLE_SALESPERSON_MAPPING_CHECK !== 'true') {
    console.log('\n⚠️  Salesperson mapping check is temporarily disabled.\n');
    console.log('Set ENABLE_SALESPERSON_MAPPING_CHECK=true to re-enable.\n');
    return;
  }

  const salespersonId = process.argv[2] || 'SP0010';

  console.log(`\n🔍 Checking salesperson mapping for: "${salespersonId}"\n`);

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

    // Get all salesperson mappings
    const allMappings = await prisma.acumaticaSalespersonMapping.findMany({
      where: { integrationId: integration.id },
      orderBy: { acumaticaSalespersonId: 'asc' },
    });

    // Get all associated users
    const userIds = allMappings.map(m => m.userId).filter((id): id is string => id !== null);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isPlaceholder: true,
      },
    });
    const usersMap = new Map(users.map(u => [u.id, u]));

    console.log(`\n   Total mappings: ${allMappings.length}`);

    // Find the specific mapping
    const targetMapping = allMappings.find(
      m => m.acumaticaSalespersonId === salespersonId
    );

    if (targetMapping) {
      const mappedUser = targetMapping.userId ? usersMap.get(targetMapping.userId) : null;

      console.log(`\n   ✅ Found mapping for "${salespersonId}":`);
      console.log(`      ID: ${targetMapping.id}`);
      console.log(`      Acumatica ID: "${targetMapping.acumaticaSalespersonId}"`);
      console.log(`      Acumatica Name: ${targetMapping.acumaticaSalespersonName}`);
      console.log(`      Acumatica Email: ${targetMapping.acumaticaEmail}`);
      console.log(`      Status: ${targetMapping.status}`);
      console.log(`      Match Type: ${targetMapping.matchType}`);
      console.log(`      User ID: ${targetMapping.userId || 'NULL'}`);

      if (mappedUser) {
        console.log(`\n      👤 Mapped User:`);
        console.log(`         Email: ${mappedUser.email}`);
        console.log(`         Name: ${mappedUser.firstName} ${mappedUser.lastName}`);
        console.log(`         Is Placeholder: ${mappedUser.isPlaceholder}`);
      } else if (targetMapping.userId) {
        console.log(`\n      ⚠️  User ID exists but user not found in database!`);
      } else {
        console.log(`\n      ⚠️  No user linked!`);
      }
    } else {
      console.log(`\n   ❌ No mapping found for "${salespersonId}"`);
    }

    // Show similar IDs for debugging
    console.log(`\n   📝 All salesperson IDs in database:`);
    allMappings.forEach((m, i) => {
      const mappedUser = m.userId ? usersMap.get(m.userId) : null;
      const hasUser = m.userId ? '✓' : '✗';
      const statusIcon = m.status === 'MATCHED' ? '✓' : m.status === 'PLACEHOLDER' ? '○' : '⊗';
      console.log(`      ${i + 1}. [${hasUser}][${statusIcon}] "${m.acumaticaSalespersonId}" (${m.status}) → ${mappedUser?.email || 'NO USER'}`);
    });

    // Check for case-insensitive matches
    const caseInsensitiveMatches = allMappings.filter(
      m => m.acumaticaSalespersonId.toLowerCase() === salespersonId.toLowerCase() &&
           m.acumaticaSalespersonId !== salespersonId
    );

    if (caseInsensitiveMatches.length > 0) {
      console.log(`\n   ⚠️  Found ${caseInsensitiveMatches.length} case-insensitive match(es):`);
      caseInsensitiveMatches.forEach(m => {
        console.log(`      "${m.acumaticaSalespersonId}" (case differs from search)`);
      });
    }

    // Check for whitespace issues
    const trimmedMatches = allMappings.filter(
      m => m.acumaticaSalespersonId.trim() === salespersonId.trim() &&
           m.acumaticaSalespersonId !== salespersonId
    );

    if (trimmedMatches.length > 0) {
      console.log(`\n   ⚠️  Found ${trimmedMatches.length} match(es) with whitespace differences:`);
      trimmedMatches.forEach(m => {
        console.log(`      "${m.acumaticaSalespersonId}" (length: ${m.acumaticaSalespersonId.length})`);
      });
    }
  }

  console.log('\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
