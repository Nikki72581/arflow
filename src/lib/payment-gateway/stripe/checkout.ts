import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import type { StripeCredentials } from './client';
import { initializeStripe } from './client';

export interface CheckoutSessionParams {
  organizationId: string;
  customerId: string;
  documentIds: string[];
  amount: number;
  mode: 'pay_now' | 'generate_link';
}

export interface CheckoutSessionResult {
  success: boolean;
  sessionId?: string;
  sessionUrl?: string;
  clientSecret?: string; // For embedded checkout
  paymentId?: string;
  error?: string;
}

/**
 * Create a Stripe Checkout Session for payment
 * Creates a PENDING payment record first, then generates the checkout session
 */
export async function createCheckoutSession(
  credentials: StripeCredentials,
  params: CheckoutSessionParams
): Promise<CheckoutSessionResult> {
  try {
    // Validate inputs
    if (params.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero' };
    }

    if (params.documentIds.length === 0) {
      return { success: false, error: 'At least one document is required' };
    }

    // Get customer details
    const customer = await prisma.customer.findFirst({
      where: {
        id: params.customerId,
        organizationId: params.organizationId,
      },
    });

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

    // Get documents to validate and build description
    const documents = await prisma.arDocument.findMany({
      where: {
        id: { in: params.documentIds },
        organizationId: params.organizationId,
        customerId: params.customerId,
      },
    });

    if (documents.length !== params.documentIds.length) {
      return { success: false, error: 'One or more documents not found' };
    }

    // Calculate total balance due to validate payment amount
    const totalBalanceDue = documents.reduce((sum, doc) => sum + doc.balanceDue, 0);
    if (params.amount > totalBalanceDue) {
      return {
        success: false,
        error: `Payment amount ($${params.amount}) exceeds total balance due ($${totalBalanceDue})`,
      };
    }

    // Build description for Stripe
    const documentNumbers = documents.map((doc) => doc.documentNumber).join(', ');
    const description = `Payment for ${documents.length > 1 ? 'invoices' : 'invoice'} ${documentNumbers}`;

    // Generate payment number
    const paymentCount = await prisma.customerPayment.count({
      where: { organizationId: params.organizationId },
    });
    const paymentNumber = `PMT-${String(paymentCount + 1).padStart(6, '0')}`;

    // Calculate session expiration (24 hours from now)
    const sessionExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Create PENDING payment record
    const payment = await prisma.customerPayment.create({
      data: {
        organizationId: params.organizationId,
        customerId: params.customerId,
        paymentNumber,
        paymentDate: new Date(),
        amount: params.amount,
        paymentMethod: 'CREDIT_CARD',
        status: 'PENDING', // Will be updated to APPLIED by webhook
        sourceType: 'MANUAL',
        paymentGatewayProvider: 'STRIPE',
        checkoutMode: params.mode,
        sessionExpiresAt,
        checkoutSessionStatus: 'open',
      },
    });

    // Initialize Stripe client
    const stripe = initializeStripe(credentials);

    // Get base URL from environment
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Create Checkout Session
    // Use embedded mode for "pay_now", hosted mode for "generate_link"
    const sessionConfig: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `Payment for ${customer.companyName}`,
              description: description,
            },
            unit_amount: Math.round(params.amount * 100), // Convert to cents
          },
          quantity: 1,
        },
      ],
      customer_email: customer.email || undefined,
      expires_at: Math.floor(sessionExpiresAt.getTime() / 1000), // Unix timestamp
      metadata: {
        organizationId: params.organizationId,
        customerId: params.customerId,
        paymentId: payment.id,
        documentIds: params.documentIds.join(','),
        checkoutMode: params.mode,
        paymentNumber: paymentNumber,
      },
    };

    // Configure based on checkout mode
    if (params.mode === 'pay_now') {
      // Embedded mode - no redirect URLs needed
      sessionConfig.ui_mode = 'embedded';
      sessionConfig.return_url = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      // Hosted mode - uses success/cancel URLs
      sessionConfig.ui_mode = 'hosted';
      sessionConfig.success_url = `${baseUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`;
      sessionConfig.cancel_url = `${baseUrl}/payment/cancel?session_id={CHECKOUT_SESSION_ID}`;
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);

    // Update payment record with session details
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        stripeCheckoutSessionId: session.id,
        checkoutSessionUrl: session.url,
      },
    });

    return {
      success: true,
      sessionId: session.id,
      sessionUrl: session.url || undefined,
      clientSecret: session.client_secret || undefined, // For embedded mode
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('Error creating checkout session:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: error.message || 'Stripe error occurred',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create checkout session',
    };
  }
}

/**
 * Retrieve a checkout session from Stripe
 */
export async function retrieveCheckoutSession(
  credentials: StripeCredentials,
  sessionId: string
): Promise<Stripe.Checkout.Session | null> {
  try {
    const stripe = initializeStripe(credentials);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['payment_intent'],
    });
    return session;
  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return null;
  }
}
