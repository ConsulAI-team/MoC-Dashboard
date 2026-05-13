import { createClient } from './supabase/client'
import type { SearchConfig, DigestData } from './types'
import { normalizeConfig, defaultConfig } from './config-store'

// Supabase table names
const CONFIG_TABLE = 'digest_config'
const DATA_TABLE = 'digest_data'
const SCHEDULE_TABLE = 'digest_schedule'

// Check if Supabase is configured
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Create a singleton Supabase client for browser-side operations
let supabaseClient: ReturnType<typeof createClient> | null = null

function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('Supabase client can only be used in the browser')
  }
  if (!isSupabaseConfigured()) {
    throw new Error('Supabase is not configured. Please add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.')
  }
  if (!supabaseClient) {
    supabaseClient = createClient()
  }
  return supabaseClient
}

// Config operations
export async function saveConfigToSupabase(config: SearchConfig): Promise<void> {
  const supabase = getSupabaseClient()
  const normalizedConfig = normalizeConfig(config)
  
  const { error } = await supabase
    .from(CONFIG_TABLE)
    .upsert({
      id: 'default',
      config: normalizedConfig,
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  
  if (error) {
    console.error('Failed to save config to Supabase:', error)
    throw error
  }
}

export async function loadConfigFromSupabase(): Promise<SearchConfig> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from(CONFIG_TABLE)
    .select('config')
    .eq('id', 'default')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No config found, return default
      return defaultConfig
    }
    console.error('Failed to load config from Supabase:', error)
    return defaultConfig
  }
  
  return normalizeConfig(data?.config as Partial<SearchConfig>)
}

// Digest data operations
export async function saveDigestDataToSupabase(data: DigestData): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from(DATA_TABLE)
    .upsert({
      id: 'latest',
      data: data,
      generated_at: data.generatedAt || new Date().toISOString(),
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' })
  
  if (error) {
    console.error('Failed to save digest data to Supabase:', error)
    throw error
  }
}

export async function loadDigestDataFromSupabase(): Promise<DigestData | null> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from(DATA_TABLE)
    .select('data, generated_at')
    .eq('id', 'latest')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      // No data found
      return null
    }
    console.error('Failed to load digest data from Supabase:', error)
    return null
  }
  
  return data?.data as DigestData | null
}

// Schedule operations
export async function getLastRunTime(): Promise<string | null> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from(SCHEDULE_TABLE)
    .select('last_run_at')
    .eq('id', 'default')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Failed to get last run time:', error)
    return null
  }
  
  return data?.last_run_at as string | null
}

export async function updateLastRunTime(): Promise<void> {
  const supabase = getSupabaseClient()
  
  const { error } = await supabase
    .from(SCHEDULE_TABLE)
    .upsert({
      id: 'default',
      last_run_at: new Date().toISOString(),
      scheduled_time: '08:00'
    }, { onConflict: 'id' })
  
  if (error) {
    console.error('Failed to update last run time:', error)
    throw error
  }
}

export async function getScheduleInfo(): Promise<{ lastRunAt: string | null; scheduledTime: string }> {
  const supabase = getSupabaseClient()
  
  const { data, error } = await supabase
    .from(SCHEDULE_TABLE)
    .select('last_run_at, scheduled_time')
    .eq('id', 'default')
    .single()
  
  if (error) {
    if (error.code === 'PGRST116') {
      return { lastRunAt: null, scheduledTime: '08:00' }
    }
    console.error('Failed to get schedule info:', error)
    return { lastRunAt: null, scheduledTime: '08:00' }
  }
  
  return {
    lastRunAt: data?.last_run_at as string | null,
    scheduledTime: (data?.scheduled_time as string) || '08:00'
  }
}

// Real-time subscription for digest data updates
export function subscribeToDigestUpdates(callback: (data: DigestData) => void) {
  const supabase = getSupabaseClient()
  
  const subscription = supabase
    .channel('digest-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: DATA_TABLE,
        filter: 'id=eq.latest'
      },
      (payload) => {
        if (payload.new && 'data' in payload.new) {
          callback(payload.new.data as DigestData)
        }
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(subscription)
  }
}

// Real-time subscription for config updates
export function subscribeToConfigUpdates(callback: (config: SearchConfig) => void) {
  const supabase = getSupabaseClient()
  
  const subscription = supabase
    .channel('config-updates')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: CONFIG_TABLE,
        filter: 'id=eq.default'
      },
      (payload) => {
        if (payload.new && 'config' in payload.new) {
          callback(normalizeConfig(payload.new.config as Partial<SearchConfig>))
        }
      }
    )
    .subscribe()
  
  return () => {
    supabase.removeChannel(subscription)
  }
}
