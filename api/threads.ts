import { createServiceClient } from './lib/supabase.js'
import type { Thread } from './lib/types.js'

const MAX_TOPIC_LENGTH = 100

export async function POST(request: Request): Promise<Response> {
  let body: { topic?: unknown }

  try {
    body = (await request.json()) as { topic?: unknown }
  } catch {
    return Response.json({ ok: false, error: 'お題を入力してください' }, { status: 400 })
  }

  const topic = typeof body.topic === 'string' ? body.topic.trim().replace(/\s+/g, ' ') : ''

  if (!topic) {
    return Response.json({ ok: false, error: 'お題を入力してください' }, { status: 400 })
  }

  if (topic.length > MAX_TOPIC_LENGTH) {
    return Response.json(
      { ok: false, error: `お題は${MAX_TOPIC_LENGTH}文字以内で入力してください` },
      { status: 400 },
    )
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .rpc('start_next_thread', { input_topic: topic })
    .single()

  if (error) {
    const isIncomplete = error.message.includes('active thread is not complete')
    const isAlreadyStarted = error.message.includes('No active thread found')

    console.error('[threads]', error.message)
    return Response.json(
      {
        ok: false,
        error: isIncomplete
          ? '現在のスレッドはまだ完結していません'
          : isAlreadyStarted
            ? '次のスレッドはすでに開始されています。再読み込みしてください'
            : '次のスレッドを開始できませんでした',
      },
      { status: isIncomplete ? 409 : isAlreadyStarted ? 409 : 500 },
    )
  }

  return Response.json({ ok: true, thread: data as Thread }, { status: 201 })
}
