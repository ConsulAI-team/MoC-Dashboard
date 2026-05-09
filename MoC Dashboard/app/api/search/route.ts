import { NextRequest, NextResponse } from 'next/server'
import { loadConfig, buildSerperSearchBatches } from '@/lib/config-store'
import { searchSerperBatch } from '@/lib/serper-api'

interface SearchRequest {
  q: string
  gl: string
  autocorrect: boolean
  tbs: string
  page: number
}

interface SearchBatchPayload {
  batchIndex: number
  batchSize: number
  totalBatches: number
  body: SearchRequest[]
}

function normalizeBatchPayload(batch: unknown): SearchBatchPayload | null {
  if (!batch || typeof batch !== 'object') return null

  const candidate = batch as Partial<SearchBatchPayload>
  if (!Array.isArray(candidate.body)) return null

  const body = candidate.body
    .map((search) => {
      if (!search || typeof search !== 'object') return null

      const item = search as Partial<SearchRequest>
      const query = typeof item.q === 'string' ? item.q.trim() : ''
      const region = typeof item.gl === 'string' ? item.gl.trim() : ''
      const page = Number(item.page)

      if (!query || !region || !Number.isFinite(page) || page < 1) return null

      return {
        q: query,
        gl: region,
        autocorrect: Boolean(item.autocorrect),
        tbs: typeof item.tbs === 'string' ? item.tbs : '',
        page,
      }
    })
    .filter((search): search is SearchRequest => Boolean(search))

  if (body.length !== candidate.body.length || body.length === 0) return null

  return {
    batchIndex: Number(candidate.batchIndex) || 1,
    batchSize: body.length,
    totalBatches: Number(candidate.totalBatches) || 1,
    body,
  }
}

export async function POST(request: NextRequest) {
  try {
    const { batchIndex, batch } = await request.json()

    if (typeof batchIndex !== 'number' || batchIndex < 1) {
      return NextResponse.json(
        { error: 'Invalid batchIndex. Must be a positive number.' },
        { status: 400 }
      )
    }

    const requestBatch = normalizeBatchPayload(batch)
    let selectedBatch = requestBatch

    if (!selectedBatch) {
      const config = loadConfig()
      const batches = buildSerperSearchBatches(config)

      if (batchIndex > batches.length) {
        return NextResponse.json(
          { error: `Batch ${batchIndex} does not exist. Total batches: ${batches.length}` },
          { status: 400 }
        )
      }

      selectedBatch = batches[batchIndex - 1]
    }

    if (!selectedBatch) {
      return NextResponse.json(
        { error: 'No valid search batch was provided.' },
        { status: 400 }
      )
    }

    // Execute the actual Serper API searches
    const searchResults = await searchSerperBatch(selectedBatch.body)

    const results = {
      batchIndex: selectedBatch.batchIndex,
      batchSize: selectedBatch.batchSize,
      totalBatches: selectedBatch.totalBatches,
      searches: selectedBatch.body.map((search, index) => ({
        query: search.q,
        region: search.gl,
        page: search.page,
        dateFilter: search.tbs,
        autocorrect: search.autocorrect,
        results: searchResults[index] || []
      })),
      totalArticles: searchResults.reduce((sum, results) => sum + results.length, 0)
    }

    return NextResponse.json(results)
  } catch (error) {
    console.error('Search API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
