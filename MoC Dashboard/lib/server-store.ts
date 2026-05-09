import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

function resolveDataDir(): string {
  const local = join(process.cwd(), 'data')
  try {
    if (!existsSync(local)) mkdirSync(local, { recursive: true })
    writeFileSync(join(local, '.test'), 'ok')
    return local
  } catch { /* fallthrough to /tmp for read-only environments */ }
  try {
    if (!existsSync('/tmp')) mkdirSync('/tmp', { recursive: true })
  } catch { /* ignore */ }
  return '/tmp'
}

let _dir: string | null = null
function dataDir(): string {
  if (!_dir) _dir = resolveDataDir()
  return _dir
}

export function serverRead<T = unknown>(key: string): T | null {
  try {
    const file = join(dataDir(), `${key}.json`)
    if (!existsSync(file)) return null
    return JSON.parse(readFileSync(file, 'utf-8')) as T
  } catch { return null }
}

export function serverWrite(key: string, value: unknown): void {
  try {
    writeFileSync(join(dataDir(), `${key}.json`), JSON.stringify(value))
  } catch { /* silent — environments without writable FS */ }
}
