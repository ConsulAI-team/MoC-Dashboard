import { NextRequest, NextResponse } from 'next/server'
import { processArticles, type RawArticle } from '@/lib/process-articles'

interface ProcessRequest {
  articles: RawArticle[]
  digestPrompt: string
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ProcessRequest
    const { articles, digestPrompt } = body

    if (!articles?.length) {
      return NextResponse.json({ error: 'No articles provided' }, { status: 400 })
    }

    const digestData = await processArticles(articles, digestPrompt)
    return NextResponse.json({ digestData })
  } catch (error) {
    console.error('Process API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
