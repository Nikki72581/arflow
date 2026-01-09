/**
 * Test script to simulate sync logic
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Get integration
  const integration = await prisma.acumaticaIntegration.findFirst();

  if (!integration) {
    console.log('No integration found');
    return;
  }

  console.log('\n🔍 Testing sync logic for integration:', integration.id);

  // Simulate the query from sync-v2.ts lines 441-452
  const mappingsWithUsers = await prisma.acumaticaSalespersonMapping.findMany({
    where: {
      integrationId: integration.id,
      status: { not: 'IGNORED' },
      userId: { not: null },
    },
    select: {
      acumaticaSalespersonId: true,
      userId: true,
      status: true,
    },
  });

  console.log('\n📊 Query result: Found', mappingsWithUsers.length, 'mappings with users (non-IGNORED + has userId)');

  mappingsWithUsers.forEach((m, i) => {
    console.log(`   ${i + 1}. acumaticaSalespersonId="${m.acumaticaSalespersonId}", userId="${m.userId}", status="${m.status}"`);
  });

  // Now get the users
  const mappedUserIds = mappingsWithUsers
    .map((mapping) => mapping.userId)
    .filter((id): id is string => Boolean(id));

  console.log('\n🔍 Extracted user IDs:', mappedUserIds.length);

  const mappedUsers = await prisma.user.findMany({
    where: { id: { in: mappedUserIds } },
  });

  console.log('📊 Found users:', mappedUsers.length);

  const mappedUserLookup = new Map(mappedUsers.map((u) => [u.id, u]));

  // Build the salesperson map (like sync-v2.ts lines 470-477)
  const salespersonMap = new Map<string, any>();

  mappingsWithUsers.forEach((mapping) => {
    if (mapping.userId) {
      const mappedUser = mappedUserLookup.get(mapping.userId);
      if (mappedUser) {
        salespersonMap.set(mapping.acumaticaSalespersonId, mappedUser);
      }
    }
  });

  console.log('\n📊 Built salesperson map with', salespersonMap.size, 'entries');
  console.log('🔑 Salesperson map keys:', Array.from(salespersonMap.keys()));

  // Test lookup for SP0010
  const testId = 'SP0010';
  const foundUser = salespersonMap.get(testId);

  console.log(`\n🧪 Test lookup for "${testId}":`, foundUser ? `✅ Found: ${foundUser.email}` : '❌ Not found');

  if (!foundUser) {
    console.log('\n🔍 Debugging why SP0010 is not in the map:');

    // Check if mapping exists at all
    const mapping = await prisma.acumaticaSalespersonMapping.findFirst({
      where: {
        integrationId: integration.id,
        acumaticaSalespersonId: testId,
      },
    });

    if (mapping) {
      console.log('   ✓ Mapping exists in database');
      console.log(`   - acumaticaSalespersonId: "${mapping.acumaticaSalespersonId}"`);
      console.log(`   - status: ${mapping.status}`);
      console.log(`   - userId: ${mapping.userId}`);
      console.log(`   - matchType: ${mapping.matchType}`);

      // Check each filter condition
      console.log('\n   Checking filter conditions:');
      console.log(`   - integrationId matches: ${mapping.integrationId === integration.id ? '✓' : '✗'}`);
      console.log(`   - status is not IGNORED: ${mapping.status !== 'IGNORED' ? '✓' : '✗'} (status is "${mapping.status}")`);
      console.log(`   - userId is not null: ${mapping.userId !== null ? '✓' : '✗'} (userId is ${mapping.userId})`);

      if (mapping.userId) {
        const user = await prisma.user.findUnique({
          where: { id: mapping.userId },
        });
        console.log(`   - user exists in database: ${user ? '✓' : '✗'}`);
        if (user) {
          console.log(`     Email: ${user.email}`);
        }
      }
    } else {
      console.log('   ✗ Mapping does not exist in database');
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
