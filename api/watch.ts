import { generateNextPostIfDue, GENERATION_MIN_INTERVAL_MS } from './lib/respond.js'

export async function POST(): Promise<Response> {
  try {
    const result = await generateNextPostIfDue(GENERATION_MIN_INTERVAL_MS)

    if ('skipped' in result) {
      return Response.json(result)
    }

    return Response.json({ ok: true, ...result })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[watch]', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
