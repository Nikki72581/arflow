import Stripe from 'stripe';
import type { PaymentData, TransactionResult } from '../types';

export interface StripeCredentials {
  secretKey: string;
  publishableKey: string;
  isProduction: boolean;
}

/**
 * Initialize Stripe client with credentials
 */
export function initializeStripe(credentials: StripeCredentials): Stripe {
  return new Stripe(credentials.secretKey, {
    apiVersion: '2024-12-18.acacia',
    typescript: true,
  });
}

/**
 * Test Stripe connection by retrieving account information
 */
export async function testStripeConnection(
  credentials: StripeCredentials
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripe = initializeStripe(credentials);

    // Retrieve account to verify credentials
    const account = await stripe.account.retrieve();

    // Verify we got valid account data
    if (!account || !account.id) {
      return {
        success: false,
        error: 'Failed to retrieve account information',
      };
    }

    // Check if the key mode matches the expected environment
    const isLiveMode = account.charges_enabled && !credentials.secretKey.includes('test');
    if (isLiveMode !== credentials.isProduction) {
      return {
        success: false,
        error: `API key mode mismatch: Expected ${credentials.isProduction ? 'live' : 'test'} mode`,
      };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof Stripe.errors.StripeAuthenticationError) {
      return {
        success: false,
        error: 'Invalid API key',
      };
    }

    if (error instanceof Stripe.errors.StripeError) {
      return {
        success: false,
        error: error.message,
      };
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Process a payment through Stripe
 */
export async function processStripePayment(
  credentials: StripeCredentials,
  paymentData: PaymentData
): Promise<TransactionResult> {
  try {
    const stripe = initializeStripe(credentials);

    // Create payment method from card data
    const paymentMethod = await stripe.paymentMethods.create({
      type: 'card',
      card: {
        number: paymentData.creditCard.cardNumber.replace(/\s/g, ''),
        exp_month: parseInt(paymentData.creditCard.expirationMonth, 10),
        exp_year: parseInt(paymentData.creditCard.expirationYear, 10),
        cvc: paymentData.creditCard.cvv,
      },
      billing_details: paymentData.billingAddress ? {
        name: `${paymentData.billingAddress.firstName} ${paymentData.billingAddress.lastName}`,
        email: paymentData.customerEmail,
        address: {
          line1: paymentData.billingAddress.address,
          city: paymentData.billingAddress.city,
          state: paymentData.billingAddress.state,
          postal_code: paymentData.billingAddress.zip,
          country: paymentData.billingAddress.country || 'US',
        },
      } : undefined,
    });

    // Create payment intent with automatic confirmation
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100), // Convert to cents
      currency: 'usd',
      payment_method: paymentMethod.id,
      confirm: true,
      description: paymentData.description,
      return_url: 'https://example.com/return', // Required for some card types
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never', // For direct charges only
      },
    });

    // Check payment status
    if (paymentIntent.status === 'succeeded') {
      // Get card details from payment method
      const cardDetails = paymentMethod.card;

      return {
        success: true,
        transactionId: paymentIntent.id,
        cardType: cardDetails?.brand ? cardDetails.brand.toUpperCase() : undefined,
        rawResponse: paymentIntent,
      };
    } else if (paymentIntent.status === 'requires_action') {
      return {
        success: false,
        error: 'Payment requires additional authentication (3D Secure). This is not currently supported.',
        rawResponse: paymentIntent,
      };
    } else {
      return {
        success: false,
        error: `Payment ${paymentIntent.status}`,
        rawResponse: paymentIntent,
      };
    }
  } catch (error) {
    return mapStripeError(error);
  }
}

/**
 * Map Stripe errors to standard format
 */
export function mapStripeError(error: unknown): TransactionResult {
  if (error instanceof Stripe.errors.StripeCardError) {
    // Card was declined or had an error
    return {
      success: false,
      error: error.message || 'Card was declined',
      rawResponse: error,
    };
  }

  if (error instanceof Stripe.errors.StripeInvalidRequestError) {
    return {
      success: false,
      error: `Invalid request: ${error.message}`,
      rawResponse: error,
    };
  }

  if (error instanceof Stripe.errors.StripeAuthenticationError) {
    return {
      success: false,
      error: 'Authentication failed with Stripe API',
      rawResponse: error,
    };
  }

  if (error instanceof Stripe.errors.StripeConnectionError) {
    return {
      success: false,
      error: 'Network error connecting to Stripe',
      rawResponse: error,
    };
  }

  if (error instanceof Stripe.errors.StripeError) {
    return {
      success: false,
      error: error.message || 'Payment processing error',
      rawResponse: error,
    };
  }

  return {
    success: false,
    error: error instanceof Error ? error.message : 'Unknown error occurred',
    rawResponse: error,
  };
}
