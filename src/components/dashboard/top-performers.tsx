import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Trophy, Medal, Award } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { getSectionAccent, SectionAccent } from '@/lib/section-accent'
import { cn } from '@/lib/utils'

interface Performer {
  id: string
  name: string
  email: string
  totalSales: number
  totalCommissions: number
  commissionsCount: number
  conversionRate: number
  outstandingBalance: number
}

interface TopPerformersProps {
  performers: Performer[]
  title?: string
  showRank?: boolean
  accent?: SectionAccent
}

export function TopPerformers({ 
  performers, 
  title = 'Top Customers',
  showRank = true,
  accent = 'dashboard',
}: TopPerformersProps) {
  const accentStyles = getSectionAccent(accent)
  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-5 w-5 text-primary" />
      case 1:
        return <Medal className="h-5 w-5 text-muted-foreground" />
      case 2:
        return <Award className="h-5 w-5 text-primary/80" />
      default:
        return null
    }
  }

  const getRankBadge = (index: number) => {
    switch (index) {
      case 0:
        return <Badge className="bg-primary text-primary-foreground">1st</Badge>
      case 1:
        return <Badge variant="outline" className="text-muted-foreground">2nd</Badge>
      case 2:
        return <Badge variant="outline" className="text-primary">3rd</Badge>
      default:
        return <Badge variant="outline">{index + 1}th</Badge>
    }
  }

  if (performers.length === 0) {
    return (
      <Card
        className={cn(
          'border-2 bg-gradient-to-br from-card to-muted/20',
          accentStyles.cardBorder,
          accentStyles.cardHover
        )}
      >
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>No data available</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No commission data found for the selected period.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'border-2 bg-gradient-to-br from-card to-muted/20',
        accentStyles.cardBorder,
        accentStyles.cardHover
      )}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>Based on total payments received</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {performers.map((performer, index) => (
            <div
              key={performer.id}
              className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50"
            >
              {showRank && (
                <div className="flex items-center justify-center w-12">
                  {getRankIcon(index) || getRankBadge(index)}
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{performer.name}</p>
                  {index < 3 && (
                    <Badge variant="secondary" className="text-xs">
                      Top {index + 1}
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground truncate">
                  {performer.email}
                </p>
              </div>

              <div className="text-right space-y-1">
                <div className="font-bold text-lg">
                  {formatCurrency(performer.totalCommissions)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {performer.commissionsCount} invoices • {performer.conversionRate.toFixed(1)}% collected
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatCurrency(performer.totalSales)} invoiced
                </div>
              </div>
            </div>
          ))}
        </div>

        {performers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-muted-foreground">No performers to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
