import { requestNextGeneration, toGenerationResponse } from '../lib/respond.js'

function verifyCronSecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  return authHeader === `Bearer ${secret}`
}

async function handleCronRequest(): Promise<Response> {
  try {
    return toGenerationResponse(await requestNextGeneration())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[cron/respond]', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}

export async function GET(request: Request): Promise<Response> {
  if (!verifyCronSecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return handleCronRequest()
}

export async function POST(request: Request): Promise<Response> {
  return GET(request)
}
