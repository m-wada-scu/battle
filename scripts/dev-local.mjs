import { execSync, spawn } from 'node:child_process'
import { readFileSync } from 'node:fs'

const WEB_PORT = 3000
const API_PORT = 3001
const PORTS_TO_CLEAR = [3000, 3001, 3002, 3003, 5173]

function loadEnvFile(path) {
  try {
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

      process.env[key] = value
    }
  } catch {
    // optional
  }
}

function run(command, options = {}) {
  execSync(command, { stdio: 'inherit', shell: true, ...options })
}

function tryRun(command) {
  try {
    execSync(command, { stdio: 'ignore', shell: true })
    return true
  } catch {
    return false
  }
}

function clearPorts() {
  for (const port of PORTS_TO_CLEAR) {
    tryRun(`npx --yes kill-port ${port}`)
  }
}

function ensureSupabase() {
  if (tryRun('npx supabase status')) return
  console.log('Starting local Supabase...')
  run('npx supabase start')
}

function spawnProcess(label, command, args, extraEnv = {}) {
  const child = spawn(command, args, {
    stdio: 'inherit',
    env: { ...process.env, ...extraEnv },
    shell: true,
  })

  child.on('exit', (code, signal) => {
    if (signal) {
      console.error(`${label} stopped (${signal})`)
    } else if (code && code !== 0) {
      console.error(`${label} exited with code ${code}`)
    }
    process.exit(code ?? 1)
  })

  return child
}

loadEnvFile('.env')
loadEnvFile('.env.local')
process.env.LOCAL_API_PORT = String(API_PORT)
process.env.NODE_ENV = 'development'

console.log('Clearing dev ports...')
clearPorts()

console.log('Ensuring Supabase is up...')
ensureSupabase()

if (process.env.SEED_COMPLETE === '1') {
  console.log('Seeding 30-complete thread...')
  run('npx supabase db query --local --file scripts/seed-complete-thread.sql')
}

console.log(`Starting local app at http://127.0.0.1:${WEB_PORT}`)

const api = spawnProcess('Local API', 'npx', ['tsx', 'scripts/local-api-server.ts'])
const web = spawnProcess('Vite', 'npx', [
  'vite',
  '--port',
  String(WEB_PORT),
  '--strictPort',
  '--host',
  '127.0.0.1',
])

console.log('Open http://localhost:3000 (or http://127.0.0.1:3000)')

process.on('SIGINT', () => {
  api.kill('SIGINT')
  web.kill('SIGINT')
  process.exit(0)
})

process.on('SIGTERM', () => {
  api.kill('SIGTERM')
  web.kill('SIGTERM')
  process.exit(0)
})
