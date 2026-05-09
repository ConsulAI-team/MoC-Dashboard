import { NextRequest, NextResponse } from 'next/server'
import { serverRead, serverWrite } from '@/lib/server-store'

export async function GET() {
  const config = serverRead('config')
  return NextResponse.json({ config })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    serverWrite('config', body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save config' }, { status: 500 })
  }
}
