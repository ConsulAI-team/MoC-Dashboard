import { NextRequest, NextResponse } from 'next/server'
import { serverRead, serverWrite } from '@/lib/server-store'
import { buildSerperSearchBatches, normalizeConfig } from '@/lib/config-store'
import { searchSerperBatch } from '@/lib/serper-api'
import { processArticles } from '@/lib/process-articles'
import type { SearchConfig } from '@/lib/types'

const CRON_SECRET = process.env.CRON_SECRET

interface CronState {
  lastRunAt: string
}

function isScheduleDue(scheduleTime: string, lastRunAt: string | null): boolean {
  const [h, m] = scheduleTime.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return false
  const now = new Date()
  const scheduledToday = new Date(now)
  scheduledToday.setHours(h, m, 0, 0)
  if (now < scheduledToday) return false
  if (!lastRunAt) return true
  return new Date(lastRunAt) < scheduledToday
}

export async function GET(request: NextRequest) {
  // Verify cron secret (Vercel sets this automatically; set CRON_SECRET env var locally)
  const auth = request.headers.get('authorization')
  if (CRON_SECRET && auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const rawConfig = serverRead<Partial<SearchConfig>>('config')
  if (!rawConfig) {
    return NextResponse.json(
      { error: 'No server config found. Open the app and save your config first.' },
      { status: 400 }
    )
  }

  const config = normalizeConfig(rawConfig)

  const cronState = serverRead<CronState>('cron-state')
  const lastRunAt = cronState?.lastRunAt ?? null

  if (!isScheduleDue(config.scheduleTime1, lastRunAt)) {
    return NextResponse.json({
      skipped: true,
      reason: 'Not scheduled time yet',
      scheduledFor: config.scheduleTime1,
      lastRunAt,
    })
  }

  try {
    const batches = buildSerperSearchBatches(config)
    if (batches.length === 0) {
      return NextResponse.json({ error: 'No keywords configured' }, { status: 400 })
    }

    const allArticles: Array<{ title: string; link: string; snippet: string; date?: string; source?: string }> = []

    for (const batch of batches) {
      const results = await searchSerperBatch(batch.body)
      for (const resultSet of results) allArticles.push(...resultSet)
      // Small delay between batches to avoid rate limits
      await new Promise(r => setTimeout(r, 500))
    }

    if (allArticles.length === 0) {
      return NextResponse.json({ error: 'Search returned no articles' }, { status: 400 })
    }

    const digestData = await processArticles(allArticles, config.searchPrompts.digest)

    serverWrite('digest', digestData)
    serverWrite('cron-state', { lastRunAt: new Date().toISOString() })

    console.log(`[cron] Scheduled run complete — ${allArticles.length} articles processed`)

    return NextResponse.json({
      ok: true,
      runAt: new Date().toISOString(),
      articlesProcessed: allArticles.length,
    })
  } catch (error) {
    console.error('[cron] Scheduled run failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Cron run failed' },
      { status: 500 }
    )
  }
}
