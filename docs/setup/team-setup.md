# Team Member Invitations Setup Guide

This guide will help you set up team member invitations using Clerk Organizations in your CommissionFlow app.

## Overview

The team invitation system allows admin users to:
- Invite new team members via email
- View pending invitations
- Revoke invitations
- Automatically sync new members to your database when they accept invitations

## Prerequisites

- Clerk account with Organizations feature enabled
- PostgreSQL database
- Environment variables configured

## Setup Steps

### 1. Enable Clerk Organizations

1. Go to your [Clerk Dashboard](https://dashboard.clerk.com)
2. Navigate to your application
3. Go to **Organization Settings** in the sidebar
4. Enable **Organizations** for your application
5. Configure organization settings as needed

### 2. Link Your Organization to Clerk

You need to create a Clerk organization and link it to your existing database organization. You have two options:

#### Option A: Create Clerk Organization Programmatically

Add this helper script to create a Clerk organization for your existing organization:

```typescript
// scripts/setup-clerk-org.ts
import { clerkClient } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

async function setupClerkOrganization() {
  const clerk = await clerkClient()

  // Get your organization from the database
  const organization = await db.organization.findFirst({
    where: { slug: 'your-org-slug' }, // Replace with your org slug
  })

  if (!organization) {
    throw new Error('Organization not found')
  }

  // Create Clerk organization
  const clerkOrg = await clerk.organizations.createOrganization({
    name: organization.name,
    slug: organization.slug,
    createdBy: 'your-admin-clerk-user-id', // Replace with your Clerk user ID
  })

  // Update your database with the Clerk org ID
  await db.organization.update({
    where: { id: organization.id },
    data: { clerkOrgId: clerkOrg.id },
  })

  console.log('Clerk organization created:', clerkOrg.id)
  console.log('Database updated successfully')
}

setupClerkOrganization()
```

Run with: `tsx scripts/setup-clerk-org.ts`

#### Option B: Use Clerk Dashboard

1. Create an organization in the Clerk Dashboard
2. Copy the organization ID
3. Manually update your database:

```sql
UPDATE organizations
SET "clerkOrgId" = 'org_xxxxxxxxxxxxx'
WHERE slug = 'your-org-slug';
```

### 3. Configure Clerk Webhooks

1. In your Clerk Dashboard, go to **Webhooks**
2. Click **Add Endpoint**
3. Enter your webhook URL: `https://yourdomain.com/api/webhooks/clerk`
4. Subscribe to these events:
   - `organizationMembership.created` - When a user accepts an invitation
   - `organizationMembership.deleted` - When a user is removed (optional)
5. Copy the **Signing Secret**
6. Add it to your `.env` file:

```env
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx
```

### 4. Test the Integration

1. **Log in as an admin user** to your app
2. Navigate to `/dashboard/team`
3. You should see the **"Invite Team Member"** button in the top right
4. Click it and enter an email address
5. Click **"Send Invitations"**
6. Check the invited person's email for the invitation
7. When they accept, they'll be automatically added to your database as a SALESPERSON

### 5. Environment Variables

Ensure these environment variables are set:

```env
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxxxxxxx
CLERK_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxx

# Database
DATABASE_URL=postgresql://...
```

## Features

### Admin-Only Access

The invitation functionality is restricted to users with the `ADMIN` role:
- Only admins see the "Invite Team Member" button
- Only admins can view pending invitations
- Only admins can revoke invitations
- Server actions validate admin status before processing

### Pending Invitations

Admins can see all pending invitations on the team page:
- Email address of invitee
- Date invitation was sent
- Current status (pending)
- Ability to revoke the invitation

### Automatic User Sync

When a user accepts an invitation:
1. Clerk sends a webhook to your app
2. The webhook handler creates a new user in your database
3. The user is assigned the `SALESPERSON` role by default
4. An audit log entry is created
5. The user can immediately log in and access the app

### Audit Logging

All invitation actions are logged:
- When invitations are sent (with email addresses)
- When invitations are revoked
- When new members join via invitation

## File Structure

```
src/
├── app/
│   ├── actions/
│   │   └── users.ts                    # Server actions for invitations
│   ├── api/
│   │   └── webhooks/
│   │       └── clerk/
│   │           └── route.ts            # Webhook handler
│   └── dashboard/
│       └── team/
│           └── page.tsx                # Team page with invite UI
├── components/
│   └── team/
│       ├── invite-members-dialog.tsx   # Invitation modal
│       └── pending-invitations.tsx     # Pending invitations list
└── prisma/
    └── schema.prisma                    # Updated with clerkOrgId field
```

## Server Actions

### `inviteTeamMembers(emailAddresses: string[])`
- Validates admin permissions
- Validates email formats
- Creates invitations via Clerk API
- Logs audit trail
- Returns success/error response

### `getPendingInvitations()`
- Validates admin permissions
- Fetches pending invitations from Clerk
- Returns formatted invitation list

### `revokeInvitation(invitationId: string)`
- Validates admin permissions
- Revokes invitation via Clerk API
- Logs audit trail
- Revalidates team page

## Troubleshooting

### "Organization not configured with Clerk" Error

**Cause**: The organization doesn't have a `clerkOrgId` in the database.

**Solution**: Follow Step 2 to link your organization to Clerk.

### Invitations Not Appearing

**Cause**: Webhook not properly configured or not receiving events.

**Solution**:
1. Check Clerk Dashboard > Webhooks > Your endpoint
2. Verify the webhook URL is accessible
3. Check webhook logs for errors
4. Ensure `CLERK_WEBHOOK_SECRET` is correct

### Users Not Being Created After Accepting Invitation

**Cause**: Webhook handler error or database connection issue.

**Solution**:
1. Check server logs for webhook errors
2. Verify database connection
3. Test webhook endpoint manually
4. Check that organization has correct `clerkOrgId`

### Permission Denied Errors

**Cause**: User doesn't have ADMIN role.

**Solution**:
1. Update user role in database:
```sql
UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
```
2. Log out and log back in

## Security Considerations

1. **Webhook Verification**: The webhook handler verifies signatures using Svix
2. **Admin Validation**: All invitation actions require ADMIN role
3. **Email Validation**: Email formats are validated before sending
4. **Audit Logging**: All actions are logged for compliance
5. **Rate Limiting**: Consider adding rate limiting to prevent abuse

## Next Steps

After setup, you can:
- Customize the default role for new members (currently SALESPERSON)
- Add role selection when inviting members
- Implement invitation email templates via Clerk
- Add notification preferences for invitation events
- Create bulk invitation functionality
- Add team member management (edit roles, remove members)

## Support

If you encounter issues:
1. Check the server logs for detailed error messages
2. Review the Clerk Dashboard webhook logs
3. Verify all environment variables are set correctly
4. Ensure database migrations have been applied
5. Check that your Clerk plan includes Organizations feature
