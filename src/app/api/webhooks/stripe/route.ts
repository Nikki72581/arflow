import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import { decryptGatewayCredential } from '@/lib/payment-gateway/encryption';
import {
  handleCheckoutSessionCompleted,
  handleCheckoutSessionExpired,
  handlePaymentIntentFailed,
  handlePaymentIntentSucceeded,
} from '@/lib/payment-gateway/stripe/webhook-handlers';

/**
 * Stripe Webhook Handler
 * Receives and processes webhook events from Stripe
 *
 * IMPORTANT: This endpoint must be configured in your Stripe Dashboard:
 * Dashboard → Developers → Webhooks → Add endpoint
 * URL: https://yourdomain.com/api/webhooks/stripe
 * Events: checkout.session.completed, checkout.session.expired, payment_intent.succeeded, payment_intent.payment_failed
 */
export async function POST(req: Request) {
  const body = await req.text();
  const headerPayload = await headers();
  const signature = headerPayload.get('stripe-signature');

  if (!signature) {
    console.error('Missing stripe-signature header');
    return NextResponse.json(
      { error: 'Missing stripe-signature header' },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  let stripe: Stripe;
  let webhookSecret: string;

  try {
    // Parse event to get session/payment intent data
    const eventData = JSON.parse(body);
    const eventObject = eventData.data?.object;

    const eventType = eventData.type;

    let payment: any = null;

    if (eventType.startsWith('checkout.session')) {
      const sessionId = eventObject?.id;
      if (!sessionId) {
        console.error('Could not determine session ID from event:', eventType);
        return NextResponse.json(
          { error: 'Could not determine session ID' },
          { status: 400 }
        );
      }

      payment = await prisma.customerPayment.findFirst({
        where: { stripeCheckoutSessionId: sessionId },
        include: {
          organization: {
            include: {
              stripeIntegration: true,
            },
          },
        },
      });
    } else if (eventType.startsWith('payment_intent')) {
      const paymentIntentId = eventObject?.id;
      const paymentId = eventObject?.metadata?.paymentId;

      if (!paymentIntentId && !paymentId) {
        console.error('Could not determine payment intent ID from event:', eventType);
        return NextResponse.json(
          { error: 'Could not determine payment intent ID' },
          { status: 400 }
        );
      }

      payment = await prisma.customerPayment.findFirst({
        where: {
          OR: [
            paymentIntentId ? { gatewayTransactionId: paymentIntentId } : undefined,
            paymentId ? { id: paymentId } : undefined,
          ].filter(Boolean) as any,
        },
        include: {
          organization: {
            include: {
              stripeIntegration: true,
            },
          },
        },
      });
    }

    if (!payment || !payment.organization.stripeIntegration) {
      console.error('Payment or Stripe integration not found for event:', eventType);
      return NextResponse.json(
        { error: 'Payment configuration not found' },
        { status: 404 }
      );
    }

    // Get webhook secret for this organization
    const stripeIntegration = payment.organization.stripeIntegration;

    if (!stripeIntegration.encryptedWebhookSecret) {
      console.warn('No webhook secret configured for organization:', payment.organizationId);
      // For development, you might want to continue without verification
      // In production, you should return an error here
      return NextResponse.json(
        { error: 'Webhook secret not configured' },
        { status: 400 }
      );
    }

    webhookSecret = decryptGatewayCredential(stripeIntegration.encryptedWebhookSecret);

    // Initialize Stripe client
    const secretKey = decryptGatewayCredential(stripeIntegration.encryptedSecretKey);
    stripe = new Stripe(secretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });

    // Verify webhook signature
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error('Webhook signature verification failed:', err.message);
      return NextResponse.json(
        { error: `Webhook signature verification failed: ${err.message}` },
        { status: 400 }
      );
    }

    // Log event for debugging
    console.log('Received Stripe webhook event:', event.type, event.id);

    // Handle the event
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session);
        break;

      case 'checkout.session.expired':
        await handleCheckoutSessionExpired(event.data.object as Stripe.Checkout.Session);
        break;

      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
        break;

      default:
        console.log('Unhandled event type:', event.type);
    }

    // Return success response
    return NextResponse.json({ received: true, eventType: event.type });
  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json(
      { error: `Webhook handler failed: ${err.message}` },
      { status: 500 }
    );
  }
}
