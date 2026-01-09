/**
 * Acumatica Data Enrichment Service
 *
 * Handles enriching invoice data with related information from other entities
 */

import { AcumaticaClient } from "./client";

/**
 * Enrich a SalesInvoice record with salesperson data from the related SalesOrder
 */
export async function enrichSalesInvoiceWithSalesOrder(
  client: AcumaticaClient,
  invoiceData: any
): Promise<any> {
  try {
    // SalesInvoice has a link to the originating SalesOrder
    // We need to find the SalesOrder and get the salesperson from it

    // Try to get the order reference from common fields
    const orderNbr = invoiceData.CustomerOrder?.value ||
                     invoiceData.OrderNbr?.value ||
                     invoiceData.SOOrderNbr?.value;

    if (!orderNbr) {
      console.warn('[Data Enrichment] No order number found on SalesInvoice');
      return invoiceData;
    }

    // Fetch the related SalesOrder with expanded sections
    const soQuery = `/entity/Default/${client.apiVersion}/SalesOrder?$filter=OrderNbr eq '${orderNbr}'&$expand=FinancialSettings,Commissions&$top=1`;
    const soResponse = await client.makeRequest('GET', soQuery);

    if (!soResponse.ok) {
      console.warn(`[Data Enrichment] Failed to fetch SalesOrder ${orderNbr}`);
      return invoiceData;
    }

    const salesOrders = await soResponse.json();
    if (!salesOrders || salesOrders.length === 0) {
      console.warn(`[Data Enrichment] SalesOrder ${orderNbr} not found`);
      return invoiceData;
    }

    const salesOrder = salesOrders[0];

    // Add enriched fields to the invoice data
    const enrichedData = {
      ...invoiceData,
      _enriched: {
        SalesOrder: {
          OrderNbr: salesOrder.OrderNbr,
          'Commissions/DefaultSalesperson': salesOrder.Commissions?.DefaultSalesperson,
          'FinancialSettings/Owner': salesOrder.FinancialSettings?.Owner,
        },
      },
    };

    // Also add flattened fields for easier access
    if (salesOrder.Commissions?.DefaultSalesperson) {
      enrichedData['SalesOrder_DefaultSalesperson'] = salesOrder.Commissions.DefaultSalesperson;
    }

    if (salesOrder.FinancialSettings?.Owner) {
      enrichedData['SalesOrder_Owner'] = salesOrder.FinancialSettings.Owner;
    }

    console.log(`[Data Enrichment] Enriched SalesInvoice ${invoiceData.ReferenceNbr?.value} with SalesOrder ${orderNbr} data`);

    return enrichedData;
  } catch (error) {
    console.error('[Data Enrichment] Error enriching SalesInvoice:', error);
    return invoiceData;
  }
}

/**
 * Enrich multiple records with related data
 */
export async function enrichRecords(
  client: AcumaticaClient,
  entityType: string,
  records: any[]
): Promise<any[]> {
  if (entityType === 'SalesInvoice') {
    // Enrich each SalesInvoice with SalesOrder data
    const enrichedRecords = await Promise.all(
      records.map(record => enrichSalesInvoiceWithSalesOrder(client, record))
    );
    return enrichedRecords;
  }

  // No enrichment needed for other entity types
  return records;
}
