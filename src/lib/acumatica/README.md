# Acumatica Integration

This directory contains the integration code for connecting ARFlow to Acumatica ERP.

## Version Compatibility

**Developed and Tested With:** Acumatica 2025 R1 (25.101.0153.5)

### Important Notes

This integration was built specifically against Acumatica version 2025 R1. Different versions of Acumatica may have:

- **Different field availability** - Some endpoints may not have certain fields
- **Different OData capabilities** - Filter and select query support may vary
- **Different data structures** - Field names, types, or response formats may change
- **Different API behaviors** - Authentication, session management, or endpoint behavior may differ

### Known Version-Specific Issues

1. **IsActive Filtering**: Some versions may not support OData filtering on the `IsActive` field.

2. **API Version Compatibility**: The integration supports API versions from 23.200.001 to 25.100.001, but testing was primarily done on 24.200.001 and 25.100.001.

## Integration Architecture

### Key Components

- **`client.ts`** - Main Acumatica API client with authentication and HTTP methods
- **`types.ts`** - TypeScript type definitions for Acumatica entities
- **`crypto.ts`** - Credential encryption/decryption utilities
- **`schema-discovery.ts`** - Default field mappings for SalesOrder and SalesInvoice
- **`field-extractor.ts`** - Extracts data from Acumatica records based on field mappings

### Supported Endpoints

- **SalesInvoice** - For importing sales invoices with amount and balance
- **SalesOrder** - For importing sales orders with amount and balance
- **Customer** - For customer data synchronization
- **Project** - For project-based tracking
- **Branch** - For multi-branch organization support
- **ItemClass** - For product categorization

## Document Type Selection

The integration supports three document type configurations:

1. **Sales Orders Only** - Collects payments on SalesOrder documents
   - Amount field: `OrderTotal`
   - Balance field: `UnpaidBalance`
   - Unique ID: `OrderNbr`

2. **Sales Invoices Only** - Collects payments on SalesInvoice documents
   - Amount field: `Amount`
   - Balance field: `Balance`
   - Unique ID: `ReferenceNbr`

3. **Both** - Collects payments on both document types (Sales Orders as primary)

## Testing Against Different Versions

If you need to connect to a different Acumatica version:

1. **Verify Endpoint Availability**
   ```bash
   # Test the Customer endpoint
   GET https://your-instance.acumatica.com/entity/Default/25.100.001/Customer

   # Check available fields
   GET https://your-instance.acumatica.com/entity/Default/25.100.001/$metadata
   ```

2. **Test OData Queries**
   ```bash
   # Test filtering
   GET https://your-instance.acumatica.com/entity/Default/25.100.001/SalesInvoice?$filter=Status eq 'Open'

   # Test field selection
   GET https://your-instance.acumatica.com/entity/Default/25.100.001/SalesInvoice?$select=ReferenceNbr,Amount,Balance
   ```

3. **Verify Authentication**
   - Confirm cookie-based session management works
   - Test login/logout endpoints
   - Verify company selection behavior

4. **Update Type Definitions**
   - If field structures differ, update `types.ts`
   - Add new fallback logic in `client.ts` if needed
   - Update tests to reflect new behavior

## Future Considerations

When upgrading or supporting new Acumatica versions:

1. Review Acumatica release notes for API changes
2. Test all endpoints against the new version
3. Update type definitions if data structures changed
4. Add new fallback logic for deprecated features
5. Update the version compatibility documentation
6. Consider maintaining version-specific client variations if differences are significant

## Support

For issues related to specific Acumatica versions, please include:
- Your Acumatica version (found in System → About Acumatica ERP)
- API version being used
- Specific endpoint or field causing issues
- Error messages from server logs
