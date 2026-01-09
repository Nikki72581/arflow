'use client'

import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface ResponsiveTableProps {
  children: ReactNode
  className?: string
}

/**
 * Mobile-Responsive Table Wrapper
 * Automatically switches to card layout on mobile
 */
export function ResponsiveTable({ children, className }: ResponsiveTableProps) {
  return (
    <div className={cn('relative overflow-x-auto', className)}>
      <div className="min-w-full inline-block align-middle">
        {children}
      </div>
    </div>
  )
}

/**
 * Mobile Card View for Table Rows
 * Use this for mobile-friendly list items
 */
interface MobileCardProps {
  children: ReactNode
  className?: string
}

export function MobileCard({ children, className }: MobileCardProps) {
  return (
    <Card className={cn('p-4 space-y-3 md:hidden', className)}>
      {children}
    </Card>
  )
}

/**
 * Mobile Card Row
 * Label-value pair for mobile cards
 */
interface MobileCardRowProps {
  label: string
  value: ReactNode
  className?: string
}

export function MobileCardRow({ label, value, className }: MobileCardRowProps) {
  return (
    <div className={cn('flex justify-between items-center', className)}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  )
}

/**
 * Hybrid Table/Card Component
 * Shows table on desktop, cards on mobile
 */
interface HybridTableProps {
  headers: string[]
  rows: Array<{
    id: string
    cells: ReactNode[]
    mobileCard?: ReactNode
  }>
  emptyState?: ReactNode
}

export function HybridTable({ headers, rows, emptyState }: HybridTableProps) {
  if (rows.length === 0 && emptyState) {
    return <>{emptyState}</>
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block">
        <div className="relative overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                {headers.map((header, i) => (
                  <th
                    key={i}
                    className="h-12 px-4 text-left align-middle font-medium text-muted-foreground"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b transition-colors hover:bg-muted/50">
                  {row.cells.map((cell, i) => (
                    <td key={i} className="p-4 align-middle">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-4">
        {rows.map((row) => (
          <Card key={row.id} className="p-4">
            {row.mobileCard || (
              <div className="space-y-3">
                {row.cells.map((cell, i) => (
                  <div key={i}>
                    <div className="text-xs text-muted-foreground mb-1">{headers[i]}</div>
                    <div>{cell}</div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  )
}
