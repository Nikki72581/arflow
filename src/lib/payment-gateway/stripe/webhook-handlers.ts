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

  // Safely extract payment intent ID
  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id;

  if (!paymentIntentId) {
    console.error('No payment intent ID found for session:', sessionId);
    return;
  }

  // Validate metadata exists and has required fields
  if (!session.metadata?.documentIds) {
    console.error('Missing metadata or documentIds for session:', sessionId);
    return;
  }

  const metadata = session.metadata;

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
    // Parse and validate document IDs
    const documentIds = metadata.documentIds.split(',').filter(id => id.trim());

    if (documentIds.length === 0) {
      throw new Error('No valid document IDs found in metadata');
    }

    // Use a transaction to ensure all updates are atomic
    await prisma.$transaction(async (tx) => {
      // Update payment record to APPLIED status
      // Note: Card details (last4, brand) are set during checkout session creation
      await tx.customerPayment.update({
        where: { id: payment.id },
        data: {
          status: 'APPLIED',
          checkoutSessionStatus: 'complete',
          gatewayTransactionId: paymentIntentId,
          gatewayResponse: JSON.parse(JSON.stringify(session)),
        },
      });

      // Apply payment to documents
      let remainingAmount = payment.amount;

      for (const documentId of documentIds) {
        if (remainingAmount <= 0) break;

        const document = await tx.arDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          console.warn('Document not found:', documentId);
          continue;
        }

        const amountToApply = Math.min(remainingAmount, document.balanceDue);

        if (amountToApply <= 0) {
          continue;
        }

        // Create payment application
        await tx.paymentApplication.create({
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

        // Determine new status
        let newStatus = document.status;
        if (newBalance === 0) {
          newStatus = 'PAID';
        } else if (newAmountPaid > 0) {
          newStatus = 'PARTIAL';
        }

        await tx.arDocument.update({
          where: { id: documentId },
          data: {
            balanceDue: newBalance,
            amountPaid: newAmountPaid,
            status: newStatus,
            ...(newBalance === 0 && { paidDate: new Date() }),
          },
        });

        remainingAmount -= amountToApply;
      }
    });

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
    // Build search criteria - use gateway transaction ID or metadata
    const whereConditions = [
      { gatewayTransactionId: paymentIntentId },
      paymentIntent.metadata?.paymentId ? { id: paymentIntent.metadata.paymentId } : null,
    ].filter(Boolean) as any[];

    // Find payment by gateway transaction ID or checkout session
    const payment = await prisma.customerPayment.findFirst({
      where: {
        OR: whereConditions,
      },
    });

    if (!payment) {
      console.error('Payment not found for intent:', paymentIntentId);
      return;
    }

    // Prevent voiding already applied payments
    if (payment.status === 'APPLIED') {
      console.warn('Cannot void already applied payment:', payment.id);
      return;
    }

    // Mark payment as VOID
    await prisma.customerPayment.update({
      where: { id: payment.id },
      data: {
        status: 'VOID',
        gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)),
        gatewayTransactionId: paymentIntentId,
      },
    });

    console.log('Payment intent failed, payment voided:', payment.id);
  } catch (error) {
    console.error('Error processing payment intent failed:', error);
    throw error;
  }
}

/**
 * Handle payment intent success
 * This is called when a Payment Element payment succeeds
 */
export async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent
) {
  const paymentIntentId = paymentIntent.id;

  console.log('Processing payment_intent.succeeded:', paymentIntentId);

  if (!paymentIntent.metadata?.documentIds) {
    console.error('Missing metadata or documentIds for payment intent:', paymentIntentId);
    return;
  }

  const payment = await prisma.customerPayment.findFirst({
    where: {
      OR: [
        { gatewayTransactionId: paymentIntentId },
        paymentIntent.metadata?.paymentId ? { id: paymentIntent.metadata.paymentId } : null,
      ].filter(Boolean) as any[],
    },
  });

  if (!payment) {
    console.error('Payment not found for intent:', paymentIntentId);
    return;
  }

  if (payment.status === 'APPLIED' && payment.gatewayTransactionId) {
    console.log('Payment already processed (idempotent):', payment.id);
    return;
  }

  try {
    const documentIds = paymentIntent.metadata.documentIds
      .split(',')
      .filter((id) => id.trim());

    if (documentIds.length === 0) {
      throw new Error('No valid document IDs found in metadata');
    }

    await prisma.$transaction(async (tx) => {
      await tx.customerPayment.update({
        where: { id: payment.id },
        data: {
          status: 'APPLIED',
          checkoutSessionStatus: paymentIntent.status,
          gatewayTransactionId: paymentIntentId,
          gatewayResponse: JSON.parse(JSON.stringify(paymentIntent)),
        },
      });

      let remainingAmount = payment.amount;

      for (const documentId of documentIds) {
        if (remainingAmount <= 0) break;

        const document = await tx.arDocument.findUnique({
          where: { id: documentId },
        });

        if (!document) {
          console.warn('Document not found:', documentId);
          continue;
        }

        const amountToApply = Math.min(remainingAmount, document.balanceDue);

        if (amountToApply <= 0) {
          continue;
        }

        await tx.paymentApplication.create({
          data: {
            organizationId: payment.organizationId,
            paymentId: payment.id,
            arDocumentId: documentId,
            amountApplied: amountToApply,
          },
        });

        const newBalance = document.balanceDue - amountToApply;
        const newAmountPaid = document.amountPaid + amountToApply;

        let newStatus = document.status;
        if (newBalance === 0) {
          newStatus = 'PAID';
        } else if (newAmountPaid > 0) {
          newStatus = 'PARTIAL';
        }

        await tx.arDocument.update({
          where: { id: documentId },
          data: {
            balanceDue: newBalance,
            amountPaid: newAmountPaid,
            status: newStatus,
            ...(newBalance === 0 && { paidDate: new Date() }),
          },
        });

        remainingAmount -= amountToApply;
      }
    });

    console.log('Payment intent succeeded:', paymentIntentId);
  } catch (error) {
    console.error('Error processing payment intent succeeded:', error);
    throw error;
  }
}
