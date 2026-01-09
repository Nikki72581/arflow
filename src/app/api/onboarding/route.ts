// app/api/onboarding/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const user = await currentUser();
    
    if (!user) {
      return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const planTier = body.planTier;
    const role = body.role;
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();

    if (!planTier || !role || !firstName || !lastName) {
      return NextResponse.json(
        { message: 'Missing required fields' },
        { status: 400 }
      );
    }

    const clerk = await clerkClient();
    const { orgId } = await auth();
    let effectiveOrgId = orgId;

    if (!effectiveOrgId) {
      try {
        const memberships = await clerk.users.getOrganizationMembershipList({
          userId: user.id,
          limit: 1,
        });
        effectiveOrgId = memberships.data[0]?.organization.id;
      } catch (error) {
        console.error('Failed to fetch Clerk organization memberships:', error);
      }
    }

    if (!effectiveOrgId) {
      return NextResponse.json(
        { message: 'User must belong to an organization' },
        { status: 400 }
      );
    }

    // Check if user already has an organization
    const existingUser = await db.user.findUnique({
      where: { clerkId: user.id },
      include: { organization: true },
    });

    if (existingUser) {
      try {
        await clerk.users.updateUser(user.id, { firstName, lastName });
      } catch (error) {
        console.error('Failed to update Clerk user during onboarding:', error);
      }

      return NextResponse.json({ 
        success: true,
        message: 'User already onboarded',
        organizationId: existingUser.organizationId 
      });
    }

    let clerkOrgName = '';
    let clerkOrgSlug = '';

    try {
      const clerkOrg = await clerk.organizations.getOrganization({
        organizationId: effectiveOrgId,
      });
      clerkOrgName = clerkOrg.name;
      clerkOrgSlug = clerkOrg.slug || '';
    } catch (error) {
      console.error('Failed to fetch Clerk organization during onboarding:', error);
      return NextResponse.json(
        { message: 'Failed to fetch organization' },
        { status: 500 }
      );
    }

    if (!clerkOrgName) {
      return NextResponse.json(
        { message: 'Organization name is missing' },
        { status: 400 }
      );
    }

    // Create organization slug from Clerk org name if missing
    const baseSlug = (clerkOrgSlug || clerkOrgName)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // Make slug unique by checking if it exists
    let slug = baseSlug;
    let counter = 1;
    while (await db.organization.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    const existingOrganization = await db.organization.findUnique({
      where: { clerkOrgId: effectiveOrgId },
    });

    // Create organization and user in a transaction
    const result = await db.$transaction(async (tx) => {
      const organization = existingOrganization
        ? existingOrganization
        : await tx.organization.create({
            data: {
              name: clerkOrgName,
              slug,
              planTier,
              clerkOrgId: effectiveOrgId,
            },
          });

      // Create user
      const newUser = await tx.user.create({
        data: {
          clerkId: user.id,
          email: user.emailAddresses[0].emailAddress,
          firstName,
          lastName,
          role,
          organizationId: organization.id,
        },
      });

      return { organization, user: newUser };
    });

    try {
      await clerk.users.updateUser(user.id, { firstName, lastName });
    } catch (error) {
      console.error('Failed to update Clerk user during onboarding:', error);
    }

    return NextResponse.json({
      success: true,
      organizationId: result.organization.id
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    
    // Return more specific error info
    const errorMessage = error instanceof Error ? error.message : 'Failed to complete onboarding';
    
    return NextResponse.json(
      { 
        success: false,
        message: errorMessage,
        error: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
