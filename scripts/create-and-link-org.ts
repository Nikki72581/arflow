/**
 * Script to create Clerk organization and link to database org
 * Run with: npx tsx --env-file=.env.local scripts/create-and-link-org.ts
 */

import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

async function createAndLinkOrg() {
  try {
    const clerk = await clerkClient();

    // Get the organization that needs linking (the one with the admin)
    const org = await db.organization.findUnique({
      where: { slug: 'new-test-org' },
      include: {
        users: {
          where: { role: 'ADMIN' },
        },
      },
    });

    if (!org) {
      console.error('❌ Organization "new-test-org" not found');
      process.exit(1);
    }

    if (org.clerkOrgId) {
      console.log(`✅ Organization "${org.name}" is already linked to Clerk org: ${org.clerkOrgId}`);
      process.exit(0);
    }

    const adminUser = org.users[0];
    if (!adminUser) {
      console.error('❌ No admin user found for this organization');
      process.exit(1);
    }

    console.log(`Creating Clerk organization for: ${org.name}`);
    console.log(`Admin user: ${adminUser.email}`);
    console.log(`Clerk user ID: ${adminUser.clerkId}`);

    // Check if user exists in Clerk
    if (adminUser.clerkId) {
      try {
        const clerkUser = await clerk.users.getUser(adminUser.clerkId);
        console.log(`✅ Clerk user found: ${clerkUser.emailAddresses[0]?.emailAddress}`);
      } catch (error) {
        console.error('❌ Clerk user not found. Error:', error instanceof Error ? error.message : error);
        process.exit(1);
      }
    } else {
      console.log('⚠️ User is a placeholder (no clerkId). Skipping Clerk verification.');
    }

    // Create organization in Clerk
    if (!adminUser.clerkId) {
      console.error('❌ Cannot create Clerk organization: admin user has no clerkId (is placeholder)');
      process.exit(1);
    }

    try {
      const clerkOrg = await clerk.organizations.createOrganization({
        name: org.name,
        createdBy: adminUser.clerkId,
      });

      console.log(`✅ Created Clerk organization: ${clerkOrg.id}`);

      // Update database
      await db.organization.update({
        where: { id: org.id },
        data: { clerkOrgId: clerkOrg.id },
      });

      console.log(`✅ Linked database organization to Clerk org`);
      console.log(`\n🎉 Success! You can now invite team members.`);

    } catch (error) {
      console.error('❌ Failed to create Clerk organization');
      console.error('Error:', error);

      if (error instanceof Error) {
        console.error('Message:', error.message);
        console.error('Stack:', error.stack);
      }

      process.exit(1);
    }

  } catch (error) {
    console.error('❌ Script failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

createAndLinkOrg();
