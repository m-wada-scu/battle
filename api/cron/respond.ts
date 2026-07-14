import { generateNextPostIfDue } from '../lib/respond.js'

const CRON_INTERVAL_MS = 50 * 60 * 1000

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

export async function GET(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateNextPostIfDue(CRON_INTERVAL_MS)

    if ('skipped' in result) {
      return Response.json(result)
    }

    return Response.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cron/respond]', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function POST(request: Request): Promise<Response> {
  return GET(request)
}
