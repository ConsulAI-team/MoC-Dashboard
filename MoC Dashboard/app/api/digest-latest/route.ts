import { NextRequest, NextResponse } from 'next/server'
import { serverRead, serverWrite } from '@/lib/server-store'

export async function GET() {
  const digest = serverRead('digest')
  return NextResponse.json({ digest })
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    serverWrite('digest', body)
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Failed to save digest' }, { status: 500 })
  }
}
