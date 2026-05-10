// Serper API integration for news search
const SERPER_API_KEY = process.env.SERPER_API_KEY
const SERPER_BASE_URL = process.env.SERPER_API_URL || 'https://google.serper.dev'

export interface SerperSearchResult {
  title: string
  link: string
  snippet: string
  date?: string
  source?: string
}

export interface SerperResponse {
  searchParameters: {
    q: string
    gl: string
    hl: string
    autocorrect: boolean
    page: number
    type: string
    engine: string
  }
  news: Array<{
    title: string
    link: string
    snippet: string
    date?: string
    source?: string
    imageUrl?: string
  }>
}

export async function searchSerperNews(query: string, options: {
  gl?: string
  autocorrect?: boolean
  tbs?: string
  page?: number
} = {}): Promise<SerperSearchResult[]> {
  const [results] = await searchSerperBatch([{
    q: query,
    gl: options.gl || 'us',
    autocorrect: Boolean(options.autocorrect),
    tbs: options.tbs || '',
    page: options.page || 1,
  }])

  return results || []
}

export async function searchSerperBatch(searches: Array<{
  q: string
  gl: string
  autocorrect: boolean
  tbs: string
  page: number
}>): Promise<SerperSearchResult[][]> {
  if (!SERPER_API_KEY) {
    throw new Error('SERPER_API_KEY environment variable is not set')
  }

  if (!searches.length) {
    return []
  }

  const response = await fetch(`${SERPER_BASE_URL}/search/news`, {
    method: 'POST',
    headers: {
      'X-API-KEY': SERPER_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(searches),
  })

  if (!response.ok) {
    const details = await response.text().catch(() => '')
    throw new Error(
      `Serper API error: ${response.status} ${response.statusText}${details ? ` - ${details}` : ''}`
    )
  }

  const data = await response.json()
  const responses: SerperResponse[] = Array.isArray(data) ? data : [data]

  return searches.map((_, index) => {
    const responseItem = responses[index]
    const news = Array.isArray(responseItem?.news) ? responseItem.news : []

    return news.map((item) => ({
      title: item.title,
      link: item.link,
      snippet: item.snippet,
      date: item.date,
      source: item.source,
    }))
  })
}
