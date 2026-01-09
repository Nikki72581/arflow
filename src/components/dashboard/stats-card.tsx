import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getSectionAccent, SectionAccent } from '@/lib/section-accent'
import { cn } from '@/lib/utils'

interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  format?: 'currency' | 'number' | 'percentage'
  accent?: SectionAccent
}

export function StatsCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  format = 'number',
  accent = 'dashboard',
}: StatsCardProps) {
  const accentStyles = getSectionAccent(accent)
  const formattedValue = () => {
    if (typeof value === 'string') return value

    switch (format) {
      case 'currency':
        return formatCurrency(value)
      case 'percentage':
        return `${value.toFixed(2)}%`
      case 'number':
      default:
        return value.toLocaleString()
    }
  }

  return (
    <Card
      className={cn(
        'border-2 transition-all hover:shadow-lg bg-gradient-to-br from-card to-muted/20',
        accentStyles.cardBorder,
        accentStyles.cardHover
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <div
            className={cn(
              'h-10 w-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
              accentStyles.iconBg
            )}
          >
            <Icon className="h-5 w-5 text-white" />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div
          className={cn(
            'text-2xl font-bold bg-gradient-to-r bg-clip-text text-transparent',
            accentStyles.valueGradient
          )}
        >
          {formattedValue()}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <div className="mt-1 flex items-center text-xs">
            <span
              className={
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              }
            >
              {trend.isPositive ? '+' : ''}
              {trend.value.toFixed(1)}%
            </span>
            <span className="text-muted-foreground ml-1">from last period</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
