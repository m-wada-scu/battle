import { createClient } from '@supabase/supabase-js'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

function readDevEnvFiles(): Record<string, string> {
  if (process.env.VERCEL_ENV === 'production') return {}

  const values: Record<string, string> = {}
  for (const fileName of ['.env', '.env.local']) {
    const path = resolve(process.cwd(), fileName)
    if (!existsSync(path)) continue

    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue

      const eq = trimmed.indexOf('=')
      if (eq === -1) continue

      const key = trimmed.slice(0, eq).trim()
      let value = trimmed.slice(eq + 1).trim()
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }

      values[key] = value
    }
  }

  return values
}

function localEnv(): Record<string, string> {
  return readDevEnvFiles()
}

export function createServiceClient() {
  const fileEnv = localEnv()
  const url =
    fileEnv.SUPABASE_URL ?? process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL
  const key = fileEnv.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

function pickEnv(key: string): string | undefined {
  const fileEnv = localEnv()
  return fileEnv[key] ?? process.env[key]
}

export function createAnonClient() {
  const url =
    pickEnv('VITE_SUPABASE_URL') ?? pickEnv('SUPABASE_URL')
  const key = pickEnv('VITE_SUPABASE_ANON_KEY')

  if (!url || !key) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required')
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
