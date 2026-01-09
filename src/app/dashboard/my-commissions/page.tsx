import MyCommissionsClient from './client-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Commissions | CommissionFlow',
  description: 'View your personal commission earnings and sales performance',
}

export default function MyCommissionsPage() {
  return <MyCommissionsClient />
}
