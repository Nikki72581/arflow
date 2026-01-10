import { prisma } from '@/lib/db';
import type Stripe from 'stripe';

/**
 * Handle successful checkout session completion
 * This is called when a customer completes payment on Stripe Checkout
 */
export async function handleCheckoutSessionCompleted(
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id;
  const paymentIntentId = session.payment_intent as string;
  const metadata = session.metadata!;

  console.log('Processing checkout.session.completed:', sessionId);

  // Find payment record
  const payment = await prisma.customerPayment.findFirst({
    where: { stripeCheckoutSessionId: sessionId },
  });

  if (!payment) {
    console.error('Payment not found for session:', sessionId);
    return;
  }

  // Check for duplicate processing (idempotency)
  if (payment.status === 'APPLIED' && payment.gatewayTransactionId) {
    console.log('Payment already processed (idempotent):', payment.id);
    return; // Already processed - this is OK, Stripe may retry webhooks
  }

  try {
    // Get payment intent details for card information
    const paymentDetails = session.payment_method_details as any;
    const last4 = paymentDetails?.card?.last4 || null;
    const cardBrand = paymentDetails?.card?.brand || null;

    // Update payment record to APPLIED status
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        status: 'APPLIED',
        checkoutSessionStatus: 'complete',
        gatewayTransactionId: paymentIntentId,
        gatewayResponse: session as any,
        last4Digits: last4,
        cardType: cardBrand?.toUpperCase(),
      },
    });

    // Apply payment to documents
    const documentIds = metadata.documentIds.split(',');
    let remainingAmount = payment.amount;

    for (const documentId of documentIds) {
      if (remainingAmount <= 0) break;

      const document = await prisma.arDocument.findUnique({
        where: { id: documentId },
      });

      if (!document) {
        console.warn('Document not found:', documentId);
        continue;
      }

      const amountToApply = Math.min(remainingAmount, document.balanceDue);

      // Create payment application
      await prisma.paymentApplication.create({
        data: {
          organizationId: payment.organizationId,
          paymentId: payment.id,
          arDocumentId: documentId,
          amountApplied: amountToApply,
        },
      });

      // Update document
      const newBalance = document.balanceDue - amountToApply;
      const newAmountPaid = document.amountPaid + amountToApply;
      const newStatus = newBalance === 0 ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : document.status;

      await prisma.arDocument.update({
        where: { id: documentId },
        data: {
          balanceDue: newBalance,
          amountPaid: newAmountPaid,
          status: newStatus,
          paidDate: newBalance === 0 ? new Date() : null,
        },
      });

      remainingAmount -= amountToApply;
    }

    console.log('Checkout session completed successfully:', sessionId);
  } catch (error) {
    console.error('Error processing checkout session completed:', error);
    throw error; // Re-throw so Stripe will retry
  }
}

/**
 * Handle expired checkout session
 * This is called when a checkout session expires without payment (after 24 hours)
 */
export async function handleCheckoutSessionExpired(
  session: Stripe.Checkout.Session
) {
  const sessionId = session.id;

  console.log('Processing checkout.session.expired:', sessionId);

  try {
    const result = await prisma.customerPayment.updateMany({
      where: {
        stripeCheckoutSessionId: sessionId,
        status: 'PENDING', // Only update pending payments
      },
      data: {
        status: 'VOID',
        checkoutSessionStatus: 'expired',
      },
    });

    console.log('Checkout session expired, updated records:', result.count);
  } catch (error) {
    console.error('Error processing checkout session expired:', error);
    throw error;
  }
}

/**
 * Handle payment intent failure
 * This is called when a payment attempt fails (card declined, etc.)
 */
export async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent
) {
  const paymentIntentId = paymentIntent.id;

  console.log('Processing payment_intent.payment_failed:', paymentIntentId);

  try {
    // Find payment by gateway transaction ID or checkout session
    const payment = await prisma.customerPayment.findFirst({
      where: {
        OR: [
          { gatewayTransactionId: paymentIntentId },
          {
            stripeCheckoutSessionId: paymentIntent.metadata?.checkoutSessionId,
          },
        ],
      },
    });

    if (!payment) {
      console.error('Payment not found for intent:', paymentIntentId);
      return;
    }

    // Mark payment as VOID
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        status: 'VOID',
        gatewayResponse: paymentIntent as any,
        gatewayTransactionId: paymentIntentId,
      },
    });

    console.log('Payment intent failed, payment voided:', payment.id);
  } catch (error) {
    console.error('Error processing payment intent failed:', error);
    throw error;
  }
}
