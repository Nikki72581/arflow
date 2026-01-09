import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET to .env')
  }

  // Get the headers
  const headerPayload = await headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error: Missing svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret
  const wh = new Webhook(WEBHOOK_SECRET)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error: Verification failed', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'organizationMembership.created') {
    // When a user accepts an invitation and joins the organization
    const { organization, public_user_data } = evt.data

    try {
      // Find the organization in our database
      const org = await db.organization.findUnique({
        where: { clerkOrgId: organization.id },
      })

      if (!org) {
        console.error('Organization not found:', organization.id)
        return new Response('Organization not found', { status: 404 })
      }

      // Check if user already exists
      const existingUser = await db.user.findUnique({
        where: { clerkId: public_user_data.user_id },
      })

      if (existingUser) {
        // User already exists, just update their organization if needed
        if (existingUser.organizationId !== org.id) {
          await db.user.update({
            where: { clerkId: public_user_data.user_id },
            data: { organizationId: org.id },
          })
        }
      } else {
        // Create new user with CUSTOMER role by default
        await db.user.create({
          data: {
            clerkId: public_user_data.user_id,
            email: public_user_data.identifier || '',
            firstName: public_user_data.first_name || null,
            lastName: public_user_data.last_name || null,
            role: 'CUSTOMER',
            organizationId: org.id,
          },
        })

        // Log the new member joining
        await db.auditLog.create({
          data: {
            action: 'member_joined',
            entityType: 'user',
            entityId: public_user_data.user_id,
            description: `${public_user_data.first_name || ''} ${public_user_data.last_name || ''} joined the organization`,
            organizationId: org.id,
            metadata: {
              email: public_user_data.identifier,
              clerkUserId: public_user_data.user_id,
            },
          },
        })
      }

      console.log('User synced successfully:', public_user_data.user_id)
    } catch (error) {
      console.error('Error creating user from webhook:', error)
      return new Response('Error processing webhook', { status: 500 })
    }
  }

  if (eventType === 'organizationMembership.deleted') {
    // When a user is removed from the organization
    const { public_user_data } = evt.data

    try {
      // You might want to soft delete or remove the user
      // For now, we'll just log it
      console.log('User removed from organization:', public_user_data.user_id)

      // Optional: Delete the user from your database
      // await db.user.delete({
      //   where: { clerkId: public_user_data.user_id },
      // })
    } catch (error) {
      console.error('Error removing user from webhook:', error)
    }
  }

  return new Response('', { status: 200 })
}
