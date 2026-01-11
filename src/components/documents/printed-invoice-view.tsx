'use client'

import { formatCurrency, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import Image from 'next/image'
import { ArDocumentWithLineItems } from '@/lib/types'

interface PrintedInvoiceViewProps {
  document: ArDocumentWithLineItems
  showPayButton?: boolean
  onPayClick?: () => void
}

export function PrintedInvoiceView({ document, showPayButton = false, onPayClick }: PrintedInvoiceViewProps) {
  const org = document.organization
  const customer = document.customer
  const lineItems = document.lineItems?.sort((a, b) => a.lineNumber - b.lineNumber) || []

  const hasDiscount = lineItems.some(item => item.discountPercent > 0)
  const hasTax = lineItems.some(item => item.taxPercent > 0)

  return (
    <div className="max-w-5xl mx-auto bg-white dark:bg-gray-900 shadow-lg print:shadow-none">
      {/* Header with Organization Branding */}
      <div className="p-8 border-b print:border-gray-300">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            {org.logoUrl && (
              <Image
                src={org.logoUrl}
                alt={org.name}
                width={200}
                height={80}
                className="mb-4 object-contain"
              />
            )}
            <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent print:text-black">
              {org.name}
            </h1>
            {org.address1 && (
              <div className="text-sm text-muted-foreground print:text-gray-600">
                <p>{org.address1}</p>
                {org.address2 && <p>{org.address2}</p>}
                {(org.city || org.state || org.zipCode) && (
                  <p>
                    {org.city && `${org.city}, `}
                    {org.state && `${org.state} `}
                    {org.zipCode}
                  </p>
                )}
              </div>
            )}
            {(org.phone || org.email || org.website) && (
              <div className="text-sm text-muted-foreground print:text-gray-600 mt-2">
                {org.phone && <p>Phone: {org.phone}</p>}
                {org.email && <p>Email: {org.email}</p>}
                {org.website && <p>Website: {org.website}</p>}
              </div>
            )}
          </div>

          <div className="text-right">
            <h2 className="text-4xl font-bold text-purple-600 print:text-black">INVOICE</h2>
            <div className="mt-4 space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground print:text-gray-600">Invoice #:</span>
                <span className="font-semibold">{document.documentNumber}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground print:text-gray-600">Date:</span>
                <span>{formatDate(document.documentDate)}</span>
              </div>
              {document.dueDate && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground print:text-gray-600">Due Date:</span>
                  <span className="font-semibold">{formatDate(document.dueDate)}</span>
                </div>
              )}
              {document.referenceNumber && (
                <div className="flex justify-between gap-4">
                  <span className="text-muted-foreground print:text-gray-600">Reference:</span>
                  <span>{document.referenceNumber}</span>
                </div>
              )}
              <div className="mt-2">
                <Badge
                  variant={
                    document.status === 'PAID' ? 'default' :
                    document.status === 'PARTIAL' ? 'secondary' :
                    'outline'
                  }
                  className="print:border-gray-400"
                >
                  {document.status}
                </Badge>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bill To Section */}
      <div className="p-8 border-b print:border-gray-300">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2 print:text-gray-600">
              Bill To
            </h3>
            <div className="text-sm">
              <p className="font-bold text-lg">{customer.companyName}</p>
              {customer.contactName && <p className="mt-1">{customer.contactName}</p>}
              {customer.billingAddress1 && (
                <div className="mt-2">
                  <p>{customer.billingAddress1}</p>
                  {customer.billingAddress2 && <p>{customer.billingAddress2}</p>}
                  {(customer.billingCity || customer.billingState || customer.billingZip) && (
                    <p>
                      {customer.billingCity && `${customer.billingCity}, `}
                      {customer.billingState && `${customer.billingState} `}
                      {customer.billingZip}
                    </p>
                  )}
                </div>
              )}
              {customer.email && <p className="mt-2">{customer.email}</p>}
              {customer.phone && <p>{customer.phone}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Line Items Table */}
      <div className="p-8">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-b-2 border-purple-200 print:border-gray-400">
                <TableHead className="font-bold">Description</TableHead>
                <TableHead className="font-bold text-center">Quantity</TableHead>
                <TableHead className="font-bold text-right">Unit Price</TableHead>
                {hasDiscount && (
                  <TableHead className="font-bold text-right">Discount</TableHead>
                )}
                {hasTax && (
                  <TableHead className="font-bold text-right">Tax</TableHead>
                )}
                <TableHead className="font-bold text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lineItems.map((item) => (
                <TableRow key={item.id} className="print:border-gray-300">
                  <TableCell className="py-4">
                    <div className="font-medium">{item.description}</div>
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  {hasDiscount && (
                    <TableCell className="text-right font-mono text-green-600 print:text-green-700">
                      {item.discountPercent > 0
                        ? `-${formatCurrency(item.discountAmount)} (${item.discountPercent}%)`
                        : '-'}
                    </TableCell>
                  )}
                  {hasTax && (
                    <TableCell className="text-right font-mono">
                      {item.taxPercent > 0
                        ? `${formatCurrency(item.taxAmount)} (${item.taxPercent}%)`
                        : '-'}
                    </TableCell>
                  )}
                  <TableCell className="text-right font-mono font-semibold">
                    {formatCurrency(item.lineTotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Totals Section */}
      <div className="p-8 border-t print:border-gray-300">
        <div className="max-w-sm ml-auto space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground print:text-gray-600">Subtotal</span>
            <span className="font-mono">{formatCurrency(document.subtotal)}</span>
          </div>

          {document.taxAmount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground print:text-gray-600">Tax</span>
              <span className="font-mono">{formatCurrency(document.taxAmount)}</span>
            </div>
          )}

          <Separator />

          <div className="flex justify-between text-xl font-bold">
            <span>Total</span>
            <span className="font-mono">{formatCurrency(document.totalAmount)}</span>
          </div>

          {document.amountPaid > 0 && (
            <>
              <div className="flex justify-between text-sm text-green-600 print:text-green-700">
                <span>Amount Paid</span>
                <span className="font-mono">-{formatCurrency(document.amountPaid)}</span>
              </div>

              <Separator />

              <div className="flex justify-between text-xl font-bold text-orange-600 print:text-orange-700">
                <span>Balance Due</span>
                <span className="font-mono">{formatCurrency(document.balanceDue)}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Payment Terms Info */}
      {document.earlyPaymentDeadline && document.discountAvailable && document.discountAvailable > 0 && (
        <div className="px-8 pb-4">
          <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-md p-4 text-sm print:bg-green-50">
            <p className="font-semibold text-green-900 dark:text-green-100 print:text-green-900">
              Early Payment Discount Available
            </p>
            <p className="text-green-700 dark:text-green-300 print:text-green-700 mt-1">
              Save {formatCurrency(document.discountAvailable)} ({document.discountPercentage}%) if paid by {formatDate(document.earlyPaymentDeadline)}
            </p>
          </div>
        </div>
      )}

      {/* Customer Notes */}
      {document.customerNotes && (
        <div className="p-8 border-t print:border-gray-300 bg-muted/50 print:bg-gray-50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase mb-2 print:text-gray-600">
            Notes
          </h3>
          <p className="text-sm whitespace-pre-wrap">{document.customerNotes}</p>
        </div>
      )}

      {/* Payment Button (web only) */}
      {showPayButton && document.balanceDue > 0 && onPayClick && (
        <div className="p-8 border-t print:hidden">
          <Button
            onClick={onPayClick}
            size="lg"
            className="w-full bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white font-semibold"
          >
            Pay {formatCurrency(document.balanceDue)} Now
          </Button>
        </div>
      )}

      {/* Print Footer */}
      <div className="hidden print:block p-8 border-t text-center text-xs text-gray-500">
        <p className="font-semibold">Thank you for your business!</p>
        {org.email && <p className="mt-1">Questions? Contact us at {org.email}</p>}
      </div>
    </div>
  )
}
