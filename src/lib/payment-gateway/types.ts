/**
 * Shared types for payment gateway integrations
 */

export interface CreditCardData {
  cardNumber: string;
  expirationMonth: string;
  expirationYear: string;
  cvv: string;
}

export interface BillingAddress {
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  country?: string;
}

export interface PaymentData {
  amount: number;
  creditCard: CreditCardData;
  billingAddress?: BillingAddress;
  customerEmail?: string;
  description?: string;
}

export interface TransactionResult {
  success: boolean;
  transactionId?: string;
  cardType?: string;
  rawResponse?: unknown;
  error?: string;
}

export interface PaymentGatewayConfig {
  enabled: boolean;
  isProduction: boolean;
  requireCVV: boolean;
  requireBillingAddress: boolean;
}
