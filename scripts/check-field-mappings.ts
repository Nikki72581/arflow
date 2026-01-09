/**
 * Check field mappings configuration
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const integration = await prisma.acumaticaIntegration.findFirst();

  if (!integration) {
    console.log('No integration found');
    return;
  }

  console.log('\n📋 Integration Configuration\n');
  console.log('Integration ID:', integration.id);
  console.log('Data Source Type:', integration.dataSourceType);
  console.log('Data Source Entity:', integration.dataSourceEntity);
  console.log('API Version:', integration.apiVersion);

  console.log('\n🗺️  Field Mappings:\n');
  const fieldMappings = integration.fieldMappings as any;

  if (fieldMappings) {
    console.log('Salesperson mapping:');
    console.log('  - sourceField:', fieldMappings.salesperson?.sourceField);
    console.log('  - sourceLevel:', fieldMappings.salesperson?.sourceLevel);
    console.log('  - Full config:', JSON.stringify(fieldMappings.salesperson, null, 2));

    console.log('\nUnique ID mapping:');
    console.log('  - sourceField:', fieldMappings.uniqueId?.sourceField);
    console.log('  - compositeFields:', fieldMappings.uniqueId?.compositeFields);

    console.log('\nCustomer mapping:');
    console.log('  - idField:', fieldMappings.customer?.idField);
    console.log('  - nameField:', fieldMappings.customer?.nameField);

    console.log('\nAmount mapping:');
    console.log('  - sourceField:', fieldMappings.amount?.sourceField);

    console.log('\nDate mapping:');
    console.log('  - sourceField:', fieldMappings.date?.sourceField);

    console.log('\nImport level:', fieldMappings.importLevel);
  } else {
    console.log('No field mappings configured!');
  }

  console.log('\n🔧 Filter Configuration:\n');
  const filterConfig = integration.filterConfig as any;

  if (filterConfig) {
    console.log('Status filter:', filterConfig.status);
    console.log('Document type filter:', filterConfig.documentType);
    console.log('Date range filter:', filterConfig.dateRange);
  } else {
    console.log('No filter configuration!');
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
