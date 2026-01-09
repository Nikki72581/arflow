/**
 * Script to create Clerk organizations for all unlinked database organizations
 * Run with: npx tsx --env-file=.env.local scripts/link-unlinked-orgs.ts
 */

import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

async function linkUnlinkedOrgs() {
  try {
    const clerk = await clerkClient();

    // Find all organizations without a Clerk org ID
    const unlinkedOrgs = await db.organization.findMany({
      where: { clerkOrgId: null },
      include: {
        users: {
          where: { role: 'ADMIN' },
          take: 1,
        },
      },
    });

    if (unlinkedOrgs.length === 0) {
      console.log('✅ All organizations are already linked to Clerk');
      process.exit(0);
    }

    console.log(`Found ${unlinkedOrgs.length} organization(s) that need linking:\n`);

    for (const org of unlinkedOrgs) {
      console.log(`\n📋 Processing organization: ${org.name} (${org.slug})`);

      const adminUser = org.users[0];
      if (!adminUser) {
        console.error(`  ❌ No admin user found - skipping`);
        continue;
      }

      console.log(`  Admin user: ${adminUser.email}`);
      console.log(`  Clerk user ID: ${adminUser.clerkId}`);

      // Verify user exists in Clerk
      if (!adminUser.clerkId) {
        console.log(`  ⚠️ Admin user is a placeholder (no clerkId) - skipping`);
        continue;
      }

      try {
        const clerkUser = await clerk.users.getUser(adminUser.clerkId);
        console.log(`  ✅ Clerk user verified: ${clerkUser.emailAddresses[0]?.emailAddress}`);
      } catch (error) {
        console.error(`  ❌ Clerk user not found - skipping`);
        console.error(`  Error: ${error instanceof Error ? error.message : error}`);
        continue;
      }

      // Create organization in Clerk
      try {
        const clerkOrg = await clerk.organizations.createOrganization({
          name: org.name,
          slug: org.slug,
          createdBy: adminUser.clerkId,
        });

        console.log(`  ✅ Created Clerk organization: ${clerkOrg.id}`);

        // Update database
        await db.organization.update({
          where: { id: org.id },
          data: { clerkOrgId: clerkOrg.id },
        });

        console.log(`  ✅ Linked database organization to Clerk org`);
      } catch (error) {
        console.error(`  ❌ Failed to create Clerk organization`);
        console.error(`  Error:`, error);

        if (error instanceof Error) {
          console.error(`  Message: ${error.message}`);
        }
      }
    }

    console.log(`\n🎉 Finished processing all organizations!`);
  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

linkUnlinkedOrgs();
