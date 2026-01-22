import Stripe from 'stripe';
import { prisma } from '@/lib/db';
import type { StripeCredentials } from './client';
import { initializeStripe } from './client';

export interface PaymentIntentParams {
  organizationId: string;
  customerId: string;
  documentIds: string[];
  amount: number;
}

export interface PaymentIntentResult {
  success: boolean;
  paymentIntentId?: string;
  clientSecret?: string;
  paymentId?: string;
  error?: string;
}

export async function createPaymentIntent(
  credentials: StripeCredentials,
  params: PaymentIntentParams
): Promise<PaymentIntentResult> {
  try {
    if (params.amount <= 0) {
      return { success: false, error: 'Payment amount must be greater than zero' };
    }

    if (params.documentIds.length === 0) {
      return { success: false, error: 'At least one document is required' };
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.customerId,
        organizationId: params.organizationId,
      },
    });

    if (!customer) {
      return { success: false, error: 'Customer not found' };
    }

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

    const totalBalanceDue = documents.reduce((sum, doc) => sum + doc.balanceDue, 0);
    if (params.amount > totalBalanceDue) {
      return {
        success: false,
        error: `Payment amount ($${params.amount}) exceeds total balance due ($${totalBalanceDue})`,
      };
    }

    const documentNumbers = documents.map((doc) => doc.documentNumber).join(', ');
    const description = `Payment for ${documents.length > 1 ? 'invoices' : 'invoice'} ${documentNumbers}`;

    const paymentCount = await prisma.customerPayment.count({
      where: { organizationId: params.organizationId },
    });
    const paymentNumber = `PMT-${String(paymentCount + 1).padStart(6, '0')}`;

    const payment = await prisma.customerPayment.create({
      data: {
        organizationId: params.organizationId,
        customerId: params.customerId,
        paymentNumber,
        paymentDate: new Date(),
        amount: params.amount,
        paymentMethod: 'CREDIT_CARD',
        status: 'PENDING',
        sourceType: 'MANUAL',
        paymentGatewayProvider: 'STRIPE',
      },
    });

    const stripe = initializeStripe(credentials);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(params.amount * 100),
      currency: 'usd',
      payment_method_types: ['card'], // Explicitly specify card payments
      confirm: false, // Let frontend confirm
      description,
      receipt_email: customer.email || undefined,
      metadata: {
        organizationId: params.organizationId,
        customerId: params.customerId,
        paymentId: payment.id,
        paymentNumber,
        documentIds: params.documentIds.join(','),
      },
    });

    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        gatewayTransactionId: paymentIntent.id,
        checkoutSessionStatus: paymentIntent.status,
        gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)),
      },
    });

    return {
      success: true,
      paymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret || undefined,
      paymentId: payment.id,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: error.message || 'Stripe error occurred',
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
    };
  }
}

export async function retrievePaymentIntent(
  credentials: StripeCredentials,
  paymentIntentId: string
): Promise<Stripe.PaymentIntent | null> {
  try {
    const stripe = initializeStripe(credentials);
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Error retrieving payment intent:', error);
    return null;
  }
}
