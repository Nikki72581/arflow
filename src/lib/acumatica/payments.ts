import { AcumaticaClient } from "./client";
import type {
  AcumaticaPayment,
  AcumaticaPaymentApplication,
  AcumaticaOrderApplication,
  CreatePaymentRequest,
  PaymentApplicationInput,
  OrderApplicationInput,
  AcumaticaValue,
} from "./types";

/**
 * Helper function to wrap values in Acumatica's required format
 */
function wrapValue<T>(value: T): AcumaticaValue<T> {
  return { value };
}

/**
 * Create an AR Payment in Acumatica
 *
 * @param client - Authenticated Acumatica client
 * @param request - Payment creation parameters
 * @returns Created payment with reference number
 *
 * @example
 * ```typescript
 * const payment = await createPayment(client, {
 *   type: 'Payment',
 *   customerId: 'CUST001',
 *   paymentMethod: 'CHECK',
 *   // cashAccount is optional - Acumatica uses the default for the payment method if not specified
 *   paymentAmount: 500.00,
 *   paymentRef: 'CHK-12345',
 *   documentsToApply: [
 *     {
 *       docType: 'Invoice',
 *       referenceNbr: 'INV001234',
 *       amountPaid: 500.00
 *     }
 *   ]
 * });
 * ```
 */
export async function createPayment(
  client: AcumaticaClient,
  request: CreatePaymentRequest,
): Promise<AcumaticaPayment> {
  // Note: Client should already be authenticated by the caller
  // The caller is responsible for calling client.logout() when done

  // Build the payment body with wrapped values
  const paymentBody: Partial<AcumaticaPayment> = {
    Type: wrapValue(request.type),
    CustomerID: wrapValue(request.customerId),
    PaymentMethod: wrapValue(request.paymentMethod),
    PaymentAmount: wrapValue(request.paymentAmount),
  };

  // Only include CashAccount if explicitly provided
  // If not provided, Acumatica will use the default cash account for the payment method
  if (request.cashAccount) {
    paymentBody.CashAccount = wrapValue(request.cashAccount);
  }

  // Add optional fields
  if (request.paymentRef) {
    paymentBody.PaymentRef = wrapValue(request.paymentRef);
  }

  if (request.applicationDate) {
    // Format date as ISO string
    paymentBody.ApplicationDate = wrapValue(
      request.applicationDate.toISOString(),
    );
  }

  if (request.currencyId) {
    paymentBody.CurrencyID = wrapValue(request.currencyId);
  }

  if (request.description) {
    paymentBody.Description = wrapValue(request.description);
  }

  if (request.hold !== undefined) {
    paymentBody.Hold = wrapValue(request.hold);
  }

  // Add document applications if provided
  if (request.documentsToApply && request.documentsToApply.length > 0) {
    paymentBody.DocumentsToApply = request.documentsToApply.map(
      (doc: PaymentApplicationInput): AcumaticaPaymentApplication => {
        const application: AcumaticaPaymentApplication = {
          DocType: wrapValue(doc.docType),
          ReferenceNbr: wrapValue(doc.referenceNbr),
          AmountPaid: wrapValue(doc.amountPaid),
        };

        if (doc.docLineNbr !== undefined) {
          application.DocLineNbr = wrapValue(doc.docLineNbr);
        }

        return application;
      },
    );
  }

  // Add order applications if provided
  if (request.ordersToApply && request.ordersToApply.length > 0) {
    paymentBody.OrdersToApply = request.ordersToApply.map(
      (order: OrderApplicationInput): AcumaticaOrderApplication => {
        const application: AcumaticaOrderApplication = {
          OrderType: wrapValue(order.orderType),
          OrderNbr: wrapValue(order.orderNbr),
        };

        if (order.amountPaid !== undefined) {
          application.AmountPaid = wrapValue(order.amountPaid);
        }

        return application;
      },
    );
  }

  console.log("[Acumatica Payments] Creating payment:", {
    customerId: request.customerId,
    amount: request.paymentAmount,
    documentsCount: request.documentsToApply?.length || 0,
    ordersCount: request.ordersToApply?.length || 0,
  });

  // Make the PUT request to create the payment
  // Use the private put method from AcumaticaClient
  const createdPayment = (await (client as any).put(
    "Payment",
    paymentBody,
  )) as AcumaticaPayment;

  console.log("[Acumatica Payments] Payment created successfully:", {
    referenceNbr: createdPayment.ReferenceNbr.value,
    status: createdPayment.Status.value,
  });

  return createdPayment;
}

/**
 * Release an AR Payment in Acumatica
 * This changes the payment status from "Balanced" to "Released"
 *
 * @param client - Authenticated Acumatica client
 * @param referenceNbr - Payment reference number to release
 * @returns Released payment
 */
export async function releasePayment(
  client: AcumaticaClient,
  referenceNbr: string,
): Promise<AcumaticaPayment> {
  // Note: Client should already be authenticated by the caller
  // The caller is responsible for calling client.logout() when done

  console.log("[Acumatica Payments] Releasing payment:", referenceNbr);

  // Build the release request body
  const releaseBody = {
    entity: {
      Type: wrapValue("Payment"),
      ReferenceNbr: wrapValue(referenceNbr),
    },
    parameters: {},
  };

  // Make the POST request to release the payment
  const releasedPayment = (await (client as any).post(
    "Payment/ReleasePayment",
    releaseBody,
  )) as AcumaticaPayment;

  console.log("[Acumatica Payments] Payment released successfully:", {
    referenceNbr: releasedPayment.ReferenceNbr.value,
    status: releasedPayment.Status.value,
  });

  return releasedPayment;
}

/**
 * Map ARFlow document type to Acumatica document type
 */
export function mapDocumentType(
  arflowType: string,
): "Invoice" | "Credit Memo" | "Debit Memo" {
  switch (arflowType.toUpperCase()) {
    case "INVOICE":
      return "Invoice";
    case "CREDIT_MEMO":
      return "Credit Memo";
    case "DEBIT_MEMO":
      return "Debit Memo";
    default:
      return "Invoice"; // Default to invoice
  }
}
