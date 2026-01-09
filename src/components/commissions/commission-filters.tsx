'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface User {
  id: string
  firstName: string
  lastName: string
}

interface CommissionFiltersProps {
  users?: User[]
}

export function CommissionFilters({ users = [] }: CommissionFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const currentSearch = searchParams.get('search') || ''
  const currentStatus = searchParams.get('status') || 'all'
  const currentUserId = searchParams.get('userId') || 'all'

  const handleStatusChange = (status: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (status === 'all') {
      params.delete('status')
    } else {
      params.set('status', status)
    }
    router.push(`/dashboard/commissions?${params.toString()}`)
  }

  const handleUserChange = (userId: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (userId === 'all') {
      params.delete('userId')
    } else {
      params.set('userId', userId)
    }
    router.push(`/dashboard/commissions?${params.toString()}`)
  }

  const handleSearchSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const search = formData.get('search') as string
    const params = new URLSearchParams(searchParams.toString())

    if (search) {
      params.set('search', search)
    } else {
      params.delete('search')
    }

    router.push(`/dashboard/commissions?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-4">
      <form className="flex-1" onSubmit={handleSearchSubmit}>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            placeholder="Search commissions..."
            defaultValue={currentSearch}
            className="pl-9"
          />
        </div>
      </form>

      {users.length > 0 && (
        <Select value={currentUserId} onValueChange={handleUserChange}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by salesperson" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Salespeople</SelectItem>
            {users.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.firstName} {user.lastName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Select value={currentStatus} onValueChange={handleStatusChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Filter by status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          <SelectItem value="pending">Pending</SelectItem>
          <SelectItem value="calculated">Calculated</SelectItem>
          <SelectItem value="approved">Approved</SelectItem>
          <SelectItem value="paid">Paid</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
