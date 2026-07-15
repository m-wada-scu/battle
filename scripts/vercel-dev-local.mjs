import { readFileSync } from 'node:fs'
import { spawn } from 'node:child_process'

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
    // .env.local が無くても vercel dev は起動できる
  }
}

loadEnvFile('.env')
loadEnvFile('.env.local')

const child = spawn('npx', ['vercel', 'dev', '--local', '--listen', '3000'], {
  stdio: 'inherit',
  env: process.env,
  shell: true,
})

child.on('exit', (code) => {
  process.exit(code ?? 1)
})
