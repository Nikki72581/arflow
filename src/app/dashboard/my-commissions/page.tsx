import MyCommissionsClient from './client-page'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'My Commissions | ARFlow',
  description: 'View your personal commission earnings and sales performance',
}

export default function MyCommissionsPage() {
  return <MyCommissionsClient />
}
