/**
 * Acumatica Data Enrichment Service
 *
 * Handles enriching invoice data with related information from other entities.
 * Note: Salesperson enrichment has been removed - we focus on customer data only.
 */

import { AcumaticaClient } from "./client";

/**
 * Enrich multiple records with related data
 * Currently a pass-through as salesperson enrichment has been removed.
 */
export async function enrichRecords(
  client: AcumaticaClient,
  entityType: string,
  records: any[],
): Promise<any[]> {
  // No enrichment needed - salesperson data is no longer collected
  // Customer data is already available directly on the document
  return records;
}
