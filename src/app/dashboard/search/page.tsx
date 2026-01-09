'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/ui/empty-state'
import { SearchResultItem } from '@/components/search/search-result-item'

type SearchResult = {
  type: 'client' | 'project' | 'sale' | 'commission' | 'plan' | 'team' | 'payout'
  id: string
  title: string
  subtitle?: string
  description?: string
  metadata?: Record<string, string>
  href: string
}

type GroupedResults = {
  [key: string]: SearchResult[]
}

const typeLabels: Record<string, string> = {
  client: 'Clients',
  project: 'Projects',
  sale: 'Sales',
  commission: 'Commissions',
  plan: 'Commission Plans',
  team: 'Team Members',
  payout: 'Payouts'
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [searchQuery, setSearchQuery] = useState(initialQuery)
  const [results, setResults] = useState<SearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery)
    }
  }, [initialQuery])

  const performSearch = async (query: string) => {
    if (!query || query.length < 2) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setError(null)
    setHasSearched(true)

    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await response.json()

      if (data.success) {
        setResults(data.data || [])
      } else {
        setError(data.error || 'Search failed')
        setResults([])
      }
    } catch (err) {
      console.error('Search error:', err)
      setError('An error occurred while searching')
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(searchQuery)

    // Update URL without navigation
    const url = new URL(window.location.href)
    if (searchQuery) {
      url.searchParams.set('q', searchQuery)
    } else {
      url.searchParams.delete('q')
    }
    window.history.replaceState({}, '', url)
  }

  // Group results by type
  const groupedResults: GroupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = []
    }
    acc[result.type].push(result)
    return acc
  }, {} as GroupedResults)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
          Search
        </h1>
        <p className="text-muted-foreground">
          Search across clients, projects, sales, commissions, and more
        </p>
      </div>

      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search for clients, projects, sales, team members..."
          className="pl-9"
          autoFocus
        />
      </form>

      {error && (
        <div className="rounded-md bg-destructive/15 p-4 text-sm text-destructive">
          {error}
        </div>
      )}

      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {!isLoading && !error && (
        <>
          {!hasSearched && (
            <EmptyState
              icon={Search}
              title="Start searching"
              description="Enter a search query to find clients, projects, sales, and more"
            />
          )}

          {hasSearched && results.length === 0 && (
            <EmptyState
              icon={Search}
              title="No results found"
              description={`No results found for "${searchQuery}". Try different search terms.`}
            />
          )}

          {hasSearched && results.length > 0 && (
            <div className="space-y-6">
              <div className="text-sm text-muted-foreground">
                Found {results.length} result{results.length !== 1 ? 's' : ''} for "{searchQuery}"
              </div>

              {Object.entries(groupedResults).map(([type, typeResults]) => (
                <div key={type} className="space-y-3">
                  <h2 className="text-lg font-semibold">
                    {typeLabels[type] || type}
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      ({typeResults.length})
                    </span>
                  </h2>
                  <div className="grid gap-3">
                    {typeResults.map((result) => (
                      <SearchResultItem key={result.id} result={result} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
