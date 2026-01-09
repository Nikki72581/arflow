/**
 * Manual script to update clerkOrgId for an organization
 * Run with: npx tsx --env-file=.env.local scripts/update-clerk-org-id.ts <orgSlug> <clerkOrgId>
 * Example: npx tsx --env-file=.env.local scripts/update-clerk-org-id.ts new-test-org org_2abc123xyz
 */

import { db } from '@/lib/db';

async function updateClerkOrgId() {
  const args = process.argv.slice(2);

  if (args.length !== 2) {
    console.error('Usage: npx tsx --env-file=.env.local scripts/update-clerk-org-id.ts <orgSlug> <clerkOrgId>');
    console.error('Example: npx tsx --env-file=.env.local scripts/update-clerk-org-id.ts new-test-org org_2abc123xyz');
    process.exit(1);
  }

  const [orgSlug, clerkOrgId] = args;

  try {
    // Find the organization
    const org = await db.organization.findUnique({
      where: { slug: orgSlug },
    });

    if (!org) {
      console.error(`❌ Organization with slug "${orgSlug}" not found`);
      process.exit(1);
    }

    // Update with Clerk org ID
    await db.organization.update({
      where: { slug: orgSlug },
      data: { clerkOrgId },
    });

    console.log(`✅ Updated "${org.name}" with Clerk org ID: ${clerkOrgId}`);
  } catch (error) {
    console.error('❌ Error updating organization:', error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

updateClerkOrgId();
