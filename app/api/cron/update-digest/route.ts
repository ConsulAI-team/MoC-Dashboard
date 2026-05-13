import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

// This endpoint is designed to be called by a cron job at 8AM daily
// Vercel Cron: Add to vercel.json: { "crons": [{ "path": "/api/cron/update-digest", "schedule": "0 8 * * *" }] }

const CONFIG_TABLE = 'digest_config'
const DATA_TABLE = 'digest_data'
const SCHEDULE_TABLE = 'digest_schedule'

function createSupabaseAdmin() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {
          // No-op for server-side admin client
        },
      },
    }
  )
}

export async function GET(request: Request) {
  // Verify the request is from Vercel Cron (in production)
  const authHeader = request.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = createSupabaseAdmin()

    // Update the schedule record to mark that the cron ran
    const { error: scheduleError } = await supabase
      .from(SCHEDULE_TABLE)
      .upsert({
        id: 'default',
        last_run_at: new Date().toISOString(),
        scheduled_time: '08:00'
      }, { onConflict: 'id' })

    if (scheduleError) {
      console.error('Failed to update schedule:', scheduleError)
    }

    // Get the current config
    const { data: configData } = await supabase
      .from(CONFIG_TABLE)
      .select('config')
      .eq('id', 'default')
      .single()

    // Get the current digest data 
    const { data: digestData } = await supabase
      .from(DATA_TABLE)
      .select('data, generated_at')
      .eq('id', 'latest')
      .single()

    // In a real implementation, this would trigger the n8n workflow
    // or call an external API to refresh the digest data
    // For now, we just update the timestamp to indicate the cron ran

    return NextResponse.json({
      success: true,
      message: 'Cron job executed successfully',
      lastRunAt: new Date().toISOString(),
      hasConfig: !!configData,
      hasDigestData: !!digestData,
      nextScheduledRun: '08:00 tomorrow'
    })
  } catch (error) {
    console.error('Cron job error:', error)
    return NextResponse.json(
      { error: 'Failed to execute cron job' },
      { status: 500 }
    )
  }
}

// Also allow POST for manual triggers
export async function POST(request: Request) {
  return GET(request)
}
