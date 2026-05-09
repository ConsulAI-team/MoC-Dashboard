"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, AlertCircle } from "lucide-react"
import { loadConfig, buildSerperSearchBatches } from "@/lib/config-store"

interface SearchResult {
  batchIndex: number
  batchSize: number
  totalBatches: number
  searches: Array<{
    query: string
    region: string
    page: number
    dateFilter: string
    autocorrect: boolean
    results: Array<{
      title: string
      link: string
      snippet: string
      date?: string
      source?: string
    }>
  }>
  totalArticles: number
}

export function SearchExecutor() {
  const [isSearching, setIsSearching] = useState(false)
  const [results, setResults] = useState<SearchResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const config = loadConfig()
  const batches = buildSerperSearchBatches(config)

  const executeSearch = async (batchIndex: number) => {
    setIsSearching(true)
    setError(null)

    try {
      const batch = batches.find((item) => item.batchIndex === batchIndex)
      if (!batch) {
        throw new Error(`Batch ${batchIndex} does not exist`)
      }

      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchIndex, batch }),
      })

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => null)
        throw new Error(errorPayload?.error || `Search failed: ${response.status}`)
      }

      const data: SearchResult = await response.json()
      setResults(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed')
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Execute Search
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 text-sm">
            <div className="flex justify-between">
              <span>Total Batches:</span>
              <Badge variant="secondary">{batches.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Keywords:</span>
              <Badge variant="secondary">{config.keywords.length}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Search Pages:</span>
              <Badge variant="secondary">{config.searchPages.join(', ')}</Badge>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {batches.map((batch) => (
              <Button
                key={batch.batchIndex}
                onClick={() => executeSearch(batch.batchIndex)}
                disabled={isSearching}
                variant="outline"
                size="sm"
              >
                {isSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Search className="h-4 w-4 mr-2" />
                )}
                Batch {batch.batchIndex}
              </Button>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-destructive/10 text-destructive rounded-md">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {results && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results - Batch {results.batchIndex}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2 text-sm mb-4">
              <div className="flex justify-between">
                <span>Articles Found:</span>
                <Badge>{results.totalArticles}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Searches Executed:</span>
                <Badge>{results.batchSize}</Badge>
              </div>
            </div>

            <div className="space-y-4">
              {results.searches.map((search, index) => (
                <div key={index} className="border rounded-lg p-3">
                  <div className="font-medium text-sm mb-2">
                    "{search.query}" - Page {search.page}
                  </div>
                  <div className="text-xs text-muted-foreground mb-2">
                    Results: {search.results.length}
                  </div>
                  {search.results.length > 0 && (
                    <div className="space-y-2">
                      {search.results.slice(0, 3).map((article, articleIndex) => (
                        <div key={articleIndex} className="text-xs border-l-2 border-muted pl-2">
                          <div className="font-medium truncate">{article.title}</div>
                          <div className="text-muted-foreground truncate">{article.snippet}</div>
                          {article.source && (
                            <div className="text-muted-foreground">{article.source}</div>
                          )}
                        </div>
                      ))}
                      {search.results.length > 3 && (
                        <div className="text-xs text-muted-foreground">
                          ... and {search.results.length - 3} more articles
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
