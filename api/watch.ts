import { requestNextGeneration, toGenerationResponse } from './lib/respond.js'

export async function POST(): Promise<Response> {
  try {
    return toGenerationResponse(await requestNextGeneration())
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[watch]', message)
    return Response.json({ ok: false, error: message }, { status: 500 })
  }
}
