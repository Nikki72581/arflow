import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/db';
import { getDecryptedStripeCredentials } from '@/app/actions/stripe';
import { retrievePaymentIntent } from '@/lib/payment-gateway/stripe/payment-intent';
import { handlePaymentIntentSucceeded } from '@/lib/payment-gateway/stripe/webhook-handlers';

export async function POST(req: Request) {
  try {
    const { paymentIntentId } = await req.json();
    
    if (!paymentIntentId) {
      return NextResponse.json({ error: 'Payment intent ID is required' }, { status: 400 });
    }
    
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const payment = await prisma.customerPayment.findFirst({
      where: {
        gatewayTransactionId: paymentIntentId,
        organizationId: user.organizationId,
      },
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.status === 'APPLIED') {
      return NextResponse.json({ success: true, alreadyApplied: true });
    }

    const credentials = await getDecryptedStripeCredentials(user.organizationId);
    if (!credentials) {
      return NextResponse.json({ error: 'Stripe not configured' }, { status: 400 });
    }

    const paymentIntent = await retrievePaymentIntent(credentials, paymentIntentId);
    if (!paymentIntent) {
      return NextResponse.json({ error: 'Payment intent not found' }, { status: 404 });
    }

    if (paymentIntent.status === 'succeeded') {
      await handlePaymentIntentSucceeded(paymentIntent);
      return NextResponse.json({ success: true, applied: true });
    }

    return NextResponse.json({ 
      success: false, 
      status: paymentIntent.status,
      message: 'Payment not successful'
    });

  } catch (error: any) {
    console.error('Immediate payment verification failed:', error);
    return NextResponse.json(
      { error: error.message || 'Verification failed' },
      { status: 500 }
    );
  }
}