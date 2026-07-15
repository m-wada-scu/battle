import { POST as watchPOST } from './watch.js'

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

  // watch と同じ DB ガード経路（claim_post_generation + 15s）を通す
  return watchPOST()
}
