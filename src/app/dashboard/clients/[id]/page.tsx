import { Suspense } from 'react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Globe,
  Hash,
  Mail,
  MapPin,
  Phone,
  Receipt,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { EmptyState } from '@/components/ui/empty-state'
import { getClient } from '@/app/actions/clients'
import { formatCurrency, formatDate } from '@/lib/utils'
export const dynamic = 'force-dynamic'
async function ClientDetails({ clientId }: { clientId: string }) {
  const result = await getClient(clientId)

  if (!result.success || !result.data) {
    notFound()
  }

  const customer = result.data
  const billingAddress = [
    customer.billingAddress1,
    customer.billingAddress2,
    customer.billingCity,
    customer.billingState,
    customer.billingZip,
    customer.billingCountry,
  ]
    .filter(Boolean)
    .join(', ')
  const shippingAddress = [
    customer.shippingAddress1,
    customer.shippingAddress2,
    customer.shippingCity,
    customer.shippingState,
    customer.shippingZip,
    customer.shippingCountry,
  ]
    .filter(Boolean)
    .join(', ')

  const statusVariant =
    customer.status === 'ACTIVE'
      ? 'success'
      : customer.status === 'ON_HOLD'
      ? 'warning'
      : customer.status === 'COLLECTIONS'
      ? 'destructive'
      : 'secondary'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link href="/dashboard/clients">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-purple-600 to-purple-500 bg-clip-text text-transparent">
                {customer.companyName}
              </h1>
              <p className="text-muted-foreground">
                Customer since {formatDate(customer.createdAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Customer Information */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Status</p>
                <Badge variant={statusVariant}>
                  {customer.status.replace('_', ' ')}
                </Badge>
              </div>
            </div>

            {customer.customerNumber && (
              <div className="flex items-start gap-3">
                <Hash className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Customer Number</p>
                  <p className="text-sm text-muted-foreground font-mono">{customer.customerNumber}</p>
                </div>
              </div>
            )}

            {customer.contactName && (
              <div className="flex items-start gap-3">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Primary Contact</p>
                  <p className="text-sm text-muted-foreground">{customer.contactName}</p>
                </div>
              </div>
            )}

            {customer.email && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="flex items-start gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Email</p>
                    <a
                      href={`mailto:${customer.email}`}
                      className="text-sm text-muted-foreground hover:underline"
                    >
                      {customer.email}
                    </a>
                  </div>
                </div>
              </>
            )}

            {customer.phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Phone</p>
                  <a
                    href={`tel:${customer.phone}`}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    {customer.phone}
                  </a>
                </div>
              </div>
            )}

            {customer.website && (
              <div className="flex items-start gap-3">
                <Globe className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Website</p>
                  <a
                    href={customer.website}
                    className="text-sm text-muted-foreground hover:underline"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {customer.website}
                  </a>
                </div>
              </div>
            )}

            {billingAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Billing Address</p>
                  <p className="text-sm text-muted-foreground">{billingAddress}</p>
                </div>
              </div>
            )}

            {shippingAddress && (
              <div className="flex items-start gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Shipping Address</p>
                  <p className="text-sm text-muted-foreground">{shippingAddress}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <Receipt className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Balance</p>
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(customer.currentBalance)}
                </p>
                {customer.creditLimit !== null && (
                  <p className="text-xs text-muted-foreground">
                    Credit limit: {formatCurrency(customer.creditLimit || 0)}
                  </p>
                )}
              </div>
            </div>

            {customer.paymentTerms && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Payment Terms</p>
                  <p className="text-sm text-muted-foreground">{customer.paymentTerms}</p>
                </div>
              </div>
            )}

            {customer.externalSystem && (
              <div className="flex items-start gap-3">
                <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Integration Source</p>
                  <p className="text-sm text-muted-foreground">
                    {customer.externalSystem} {customer.externalId ? `(ID: ${customer.externalId})` : ''}
                  </p>
                </div>
              </div>
            )}

            {customer.notes && (
              <>
                <Separator className="bg-purple-500/20" />
                <div className="space-y-1">
                  <p className="text-sm font-medium">Notes</p>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{customer.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Invoices</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.arDocuments.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="No invoices yet"
                description="Invoices will appear here once they are created or synced."
              />
            ) : (
              <div className="space-y-3">
                {customer.arDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{doc.documentNumber}</span>
                        <Badge
                          variant={
                            doc.status === 'OPEN'
                              ? 'info'
                              : doc.status === 'PARTIAL'
                              ? 'warning'
                              : doc.status === 'PAID'
                              ? 'success'
                              : 'secondary'
                          }
                        >
                          {doc.status.replace('_', ' ')}
                        </Badge>
                        <Badge variant="outline">{doc.documentType.replace('_', ' ')}</Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(doc.documentDate)}
                        </span>
                        <span>{formatCurrency(doc.totalAmount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Recent Payments</CardTitle>
          </CardHeader>
          <CardContent>
            {customer.payments.length === 0 ? (
              <EmptyState
                icon={Receipt}
                title="No payments yet"
                description="Payments will appear here once they are recorded."
              />
            ) : (
              <div className="space-y-3">
                {customer.payments.map((payment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{payment.paymentNumber}</span>
                        <Badge
                          variant={
                            payment.status === 'APPLIED'
                              ? 'success'
                              : payment.status === 'PENDING'
                              ? 'warning'
                              : 'secondary'
                          }
                        >
                          {payment.status}
                        </Badge>
                        <Badge variant="outline">{payment.paymentMethod.replace('_', ' ')}</Badge>
                      </div>
                      {payment.notes && (
                        <p className="text-sm text-muted-foreground">{payment.notes}</p>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(payment.paymentDate)}
                        </span>
                        <span>{formatCurrency(payment.amount)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function ClientDetailsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-20 bg-muted animate-pulse rounded" />
      <div className="grid gap-6 md:grid-cols-3">
        <div className="h-96 bg-muted animate-pulse rounded" />
        <div className="md:col-span-2 h-96 bg-muted animate-pulse rounded" />
      </div>
    </div>
  )
}

export default async function ClientPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<ClientDetailsSkeleton />}>
      <ClientDetails clientId={id} />
    </Suspense>
  )
}
