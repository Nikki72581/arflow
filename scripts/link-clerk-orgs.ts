/**
 * Script to link existing organizations to Clerk
 * Run with: npx tsx --env-file=.env.local scripts/link-clerk-orgs.ts
 */

import { clerkClient } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

async function linkClerkOrganizations() {
  try {
    // Get all organizations without a clerkOrgId
    const organizations = await db.organization.findMany({
      where: {
        clerkOrgId: null,
      },
      include: {
        users: {
          where: {
            role: 'ADMIN',
          },
          take: 1,
        },
      },
    });

    if (organizations.length === 0) {
      console.log('✅ All organizations are already linked to Clerk');
      return;
    }

    console.log(`Found ${organizations.length} organization(s) to link`);

    const clerk = await clerkClient();

    for (const org of organizations) {
      console.log(`\nProcessing: ${org.name} (${org.slug})`);

      // Get an admin user to be the creator
      const adminUser = org.users[0];

      if (!adminUser) {
        console.log(`⚠️  No admin user found for ${org.name}, skipping...`);
        continue;
      }

      if (!adminUser.clerkId) {
        console.log(`⚠️  Admin user is a placeholder (no clerkId) for ${org.name}, skipping...`);
        continue;
      }

      try {
        // Create Clerk organization
        const clerkOrg = await clerk.organizations.createOrganization({
          name: org.name,
          slug: org.slug,
          createdBy: adminUser.clerkId,
        });

        // Update database with Clerk org ID
        await db.organization.update({
          where: { id: org.id },
          data: { clerkOrgId: clerkOrg.id },
        });

        console.log(`✅ Created Clerk org ${clerkOrg.id} for ${org.name}`);

        // Add existing users to the Clerk organization
        const allUsers = await db.user.findMany({
          where: { organizationId: org.id },
        });

        console.log(`   Adding ${allUsers.length} existing user(s) to Clerk org...`);

        for (const user of allUsers) {
          try {
            // Skip placeholder users (no clerkId)
            if (!user.clerkId) {
              console.log(`   ⚠️  Skipping placeholder user ${user.email}`);
              continue;
            }

            // Skip the creator as they're already a member
            if (user.clerkId === adminUser.clerkId) {
              continue;
            }

            // Add user to Clerk organization
            await clerk.organizations.createOrganizationMembership({
              organizationId: clerkOrg.id,
              userId: user.clerkId,
              role: user.role === 'ADMIN' ? 'org:admin' : 'org:member',
            });

            console.log(`   ✅ Added ${user.email} to Clerk org`);
          } catch (userError) {
            console.error(`   ⚠️  Failed to add ${user.email}:`, userError instanceof Error ? userError.message : userError);
          }
        }

      } catch (error) {
        console.error(`❌ Failed to create Clerk org for ${org.name}:`, error instanceof Error ? error.message : error);

        // If slug is taken, try with a suffix
        if (error instanceof Error && error.message.includes('slug')) {
          console.log(`   Retrying with modified slug...`);
          try {
            const clerkOrg = await clerk.organizations.createOrganization({
              name: org.name,
              slug: `${org.slug}-${org.id.slice(0, 8)}`,
              createdBy: adminUser.clerkId,
            });

            await db.organization.update({
              where: { id: org.id },
              data: { clerkOrgId: clerkOrg.id },
            });

            console.log(`   ✅ Created Clerk org with modified slug`);
          } catch (retryError) {
            console.error(`   ❌ Retry failed:`, retryError instanceof Error ? retryError.message : retryError);
          }
        }
      }
    }

    console.log('\n✅ Migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

// Run the migration
linkClerkOrganizations();
