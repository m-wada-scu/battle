import { generateNextPost } from './lib/respond.js'

function verifySecret(request: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    return process.env.NODE_ENV !== 'production'
  }

  const authHeader = request.headers.get('authorization')
  const querySecret = new URL(request.url).searchParams.get('secret')
  return authHeader === `Bearer ${secret}` || querySecret === secret
}

export async function POST(request: Request): Promise<Response> {
  if (!verifySecret(request)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await generateNextPost()
    return Response.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[trigger]', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
