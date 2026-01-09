import Link from 'next/link'
import { Users, FileText, User, Wallet } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

type SearchResult = {
  type: 'client' | 'invoice' | 'payment' | 'team'
  id: string
  title: string
  subtitle?: string
  description?: string
  metadata?: Record<string, string>
  href: string
}

const icons = {
  client: Users,
  invoice: FileText,
  team: User,
  payment: Wallet
}

const typeLabels = {
  client: 'Client',
  team: 'Team Member',
  invoice: 'Invoice',
  payment: 'Payment'
}

const typeColors = {
  client: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  team: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
  invoice: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  payment: 'bg-teal-500/10 text-teal-700 dark:text-teal-400'
}

export function SearchResultItem({ result }: { result: SearchResult }) {
  const Icon = icons[result.type]

  return (
    <Link
      href={result.href}
      className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
    >
      <div className="flex items-start gap-3">
        <div className={`mt-0.5 rounded-md p-2 ${typeColors[result.type]}`}>
          <Icon className="h-4 w-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-medium text-sm truncate">{result.title}</h3>
            <Badge variant="secondary" className="text-xs shrink-0">
              {typeLabels[result.type]}
            </Badge>
          </div>

          {result.subtitle && (
            <p className="text-sm text-muted-foreground truncate mb-2">
              {result.subtitle}
            </p>
          )}

          {result.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {result.description}
            </p>
          )}

          {result.metadata && Object.keys(result.metadata).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(result.metadata).map(([key, value]) => (
                <span
                  key={key}
                  className="inline-flex items-center rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                >
                  {value}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
