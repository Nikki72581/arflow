import AuditLogsClient from './client-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Audit Logs | CommissionFlow',
  description: 'View activity and audit trail for your commission system',
}

export default function AuditLogsPage() {
  return <AuditLogsClient />
}
