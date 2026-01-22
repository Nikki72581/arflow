/**
 * Acumatica API response types
 * All fields are wrapped in { value: T } objects
 */

export interface AcumaticaValue<T> {
  value: T;
}

export interface AcumaticaInvoice {
  ReferenceNbr: AcumaticaValue<string>;
  Type: AcumaticaValue<string>;
  Status: AcumaticaValue<string>;
  Date: AcumaticaValue<string>;
  CustomerID: AcumaticaValue<string>;
  Amount: AcumaticaValue<number>;
  Balance: AcumaticaValue<number>; // Remaining balance due
  DocTotal: AcumaticaValue<number>;
  Details: AcumaticaInvoiceLine[];
  FinancialDetails?: AcumaticaInvoiceFinancialDetails; // Expanded - contains branch data
}

export interface AcumaticaInvoiceLine {
  InventoryID: AcumaticaValue<string>;
  Description: AcumaticaValue<string>;
  ExtendedPrice: AcumaticaValue<number>;
  Amount: AcumaticaValue<number>;
  ItemClass: AcumaticaValue<string>;
  Account: AcumaticaValue<string>;
  Qty: AcumaticaValue<number>;
  UnitPrice: AcumaticaValue<number>;
}

export interface AcumaticaInvoiceFinancialDetails {
  BatchNbr?: AcumaticaValue<string>;
  Branch?: AcumaticaValue<string>;
  CustomerTaxZone?: AcumaticaValue<string>;
}

export interface AcumaticaSalesOrder {
  OrderNbr: AcumaticaValue<string>;
  OrderType: AcumaticaValue<string>;
  Status: AcumaticaValue<string>;
  Date: AcumaticaValue<string>;
  CustomerID: AcumaticaValue<string>;
  OrderTotal: AcumaticaValue<number>;
  UnpaidBalance: AcumaticaValue<number>; // Remaining balance due
  Description?: AcumaticaValue<string>;
}

export interface AcumaticaBranch {
  BranchID: AcumaticaValue<string>;
  BranchName: AcumaticaValue<string>;
}

export interface AcumaticaItemClass {
  ClassID: AcumaticaValue<string>;
  Description: AcumaticaValue<string>;
}

export interface AcumaticaCustomer {
  CustomerID: AcumaticaValue<string>;
  CustomerName: AcumaticaValue<string>;
  CustomerCD: AcumaticaValue<string>;
}

export interface AcumaticaProject {
  ProjectID: AcumaticaValue<string>;
  ProjectCD: AcumaticaValue<string>;
  Description: AcumaticaValue<string>;
}

export interface AcumaticaCompany {
  CompanyID: AcumaticaValue<string>;
  CompanyName: AcumaticaValue<string>;
}

/**
 * OAuth token response
 */
export interface AcumaticaTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

/**
 * API error response
 */
export interface AcumaticaErrorResponse {
  message?: string;
  exceptionMessage?: string;
  error?: string;
  error_description?: string;
}

/**
 * Credentials for authentication
 */
export interface AcumaticaPasswordCredentials {
  type: "password";
  username: string;
  password: string;
}

export interface AcumaticaOAuthCredentials {
  type: "oauth";
  accessToken: string;
  refreshToken?: string;
  expiresAt?: number;
}

export type AcumaticaCredentials =
  | AcumaticaPasswordCredentials
  | AcumaticaOAuthCredentials;

/**
 * Connection configuration
 */
export interface AcumaticaConnectionConfig {
  instanceUrl: string;
  apiVersion: string;
  companyId: string;
  credentials: AcumaticaCredentials;
}

/**
 * Invoice query filters
 */
export interface InvoiceQueryFilters {
  startDate: Date;
  endDate?: Date;
  branches?: string[];
  includeInvoices: boolean;
  includeCreditMemos: boolean;
  includeDebitMemos: boolean;
}

/**
 * Sync result from invoice processing
 */
export interface ProcessResult {
  skipped: boolean;
  skipReason?: string;
  salesCreated?: number;
  clientCreated?: boolean;
  projectCreated?: boolean;
}

/**
 * Overall sync result
 */
export interface SyncResult {
  processed: number;
  skipped: Array<{ invoiceRef: string; reason: string }>;
  errors: Array<{ invoiceRef: string; error: string }>;
  salesCreated: number;
  clientsCreated: number;
  projectsCreated: number;
}

/**
 * AR Payment entity
 */
export interface AcumaticaPayment {
  ReferenceNbr: AcumaticaValue<string>;
  Type: AcumaticaValue<string>;
  Status: AcumaticaValue<string>;
  CustomerID: AcumaticaValue<string>;
  PaymentAmount: AcumaticaValue<number>;
  PaymentMethod: AcumaticaValue<string>;
  CashAccount: AcumaticaValue<string>;
  PaymentRef?: AcumaticaValue<string>;
  ApplicationDate?: AcumaticaValue<string>;
  CurrencyID?: AcumaticaValue<string>;
  Description?: AcumaticaValue<string>;
  Hold?: AcumaticaValue<boolean>;
  DocumentsToApply?: AcumaticaPaymentApplication[];
  OrdersToApply?: AcumaticaOrderApplication[];
}

/**
 * Payment application to invoices/credit memos/debit memos
 */
export interface AcumaticaPaymentApplication {
  DocType: AcumaticaValue<string>;
  ReferenceNbr: AcumaticaValue<string>;
  AmountPaid: AcumaticaValue<number>;
  DocLineNbr?: AcumaticaValue<number>; // Required if Pay by Line is enabled
}

/**
 * Payment application to sales orders
 */
export interface AcumaticaOrderApplication {
  OrderType: AcumaticaValue<string>;
  OrderNbr: AcumaticaValue<string>;
  AmountPaid?: AcumaticaValue<number>;
}

/**
 * Request parameters for creating a payment
 */
export interface CreatePaymentRequest {
  type: string;
  customerId: string;
  paymentMethod: string;
  cashAccount: string;
  paymentAmount: number;
  paymentRef?: string;
  applicationDate?: Date;
  currencyId?: string;
  description?: string;
  hold?: boolean;
  documentsToApply?: PaymentApplicationInput[];
  ordersToApply?: OrderApplicationInput[];
}

/**
 * Payment application input (not wrapped in AcumaticaValue)
 */
export interface PaymentApplicationInput {
  docType: "Invoice" | "Credit Memo" | "Debit Memo";
  referenceNbr: string;
  amountPaid: number;
  docLineNbr?: number;
}

/**
 * Order application input (not wrapped in AcumaticaValue)
 */
export interface OrderApplicationInput {
  orderType: string;
  orderNbr: string;
  amountPaid?: number;
}

/**
 * Payment Method entity from Acumatica
 * Used for configuring which payment method to use when creating AR Payments
 */
export interface AcumaticaPaymentMethodEntity {
  PaymentMethodID: AcumaticaValue<string>;
  Description: AcumaticaValue<string>;
  IsActive: AcumaticaValue<boolean>;
  UseInAR?: AcumaticaValue<boolean>;
  UseInAP?: AcumaticaValue<boolean>;
}

/**
 * Cash Account entity from Acumatica
 * Used for configuring which cash account to use when creating AR Payments
 */
export interface AcumaticaCashAccountEntity {
  CashAccountCD: AcumaticaValue<string>;
  Description: AcumaticaValue<string>;
  Active: AcumaticaValue<boolean>;
  CashAccountID?: AcumaticaValue<number>;
  Branch?: AcumaticaValue<string>;
}
