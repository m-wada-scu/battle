import { generateGeminiResponse } from './ai/gemini.js'
import { generateGptResponse } from './ai/gpt.js'
import { createServiceClient } from './supabase.js'
import {
  type AiModel,
  modelDisplayName,
  normalizeModel,
  type Post,
  type Thread,
} from './types.js'

export const MAX_POST_NUMBER = 300
export const GENERATION_MIN_INTERVAL_MS = 15_000

async function generateContent(
  model: AiModel,
  thread: Thread,
  posts: Post[],
): Promise<string> {
  switch (model) {
    case 'gpt':
    case 'gpt_hothead':
      return generateGptResponse(thread, posts, model)
    case 'gemini':
    case 'gemini_sarcastic':
      return generateGeminiResponse(thread, posts, model)
  }
}

export interface RespondResult {
  threadId: string
  postNumber: number
  model: AiModel
  displayName: string
  content: string
}

export interface SkippedResult {
  ok: true
  skipped: true
  reason: 'too_soon' | 'thread_complete'
  retryAfterMs?: number
}

interface GenerationClaim {
  claim_id: string | null
  thread_id: string
  reason: SkippedResult['reason'] | null
  retry_after_ms: number | null
}

async function releaseGenerationClaim(
  threadId: string,
  claimId: string,
): Promise<void> {
  const supabase = createServiceClient()
  const { error } = await supabase.rpc('release_post_generation', {
    input_thread_id: threadId,
    input_claim_id: claimId,
  })

  if (error) {
    console.error('[respond] Failed to release generation claim:', error.message)
  }
}

export async function generateNextPostIfDue(
  minIntervalMs: number = GENERATION_MIN_INTERVAL_MS,
): Promise<RespondResult | SkippedResult> {
  if (minIntervalMs !== GENERATION_MIN_INTERVAL_MS) {
    throw new Error(
      `Post generation interval must use GENERATION_MIN_INTERVAL_MS (${GENERATION_MIN_INTERVAL_MS})`,
    )
  }

  return generateNextPostWithInterval(GENERATION_MIN_INTERVAL_MS)
}

export async function requestNextGeneration(): Promise<RespondResult | SkippedResult> {
  return generateNextPostIfDue(GENERATION_MIN_INTERVAL_MS)
}

export function toGenerationResponse(result: RespondResult | SkippedResult): Response {
  if ('skipped' in result) {
    return Response.json(result)
  }

  return Response.json({ ok: true, ...result })
}

async function generateNextPostWithInterval(
  minIntervalMs: number,
): Promise<RespondResult | SkippedResult> {
  const supabase = createServiceClient()

  const { data: claimData, error: claimError } = await supabase
    .rpc('claim_post_generation', {
      input_min_interval_ms: minIntervalMs,
    })
    .single()

  if (claimError) {
    throw new Error(`Failed to claim post generation: ${claimError.message}`)
  }

  const claim = claimData as GenerationClaim

  if (!claim.claim_id) {
    return {
      ok: true,
      skipped: true,
      reason: claim.reason ?? 'too_soon',
      ...(claim.retry_after_ms === null
        ? {}
        : { retryAfterMs: claim.retry_after_ms }),
    }
  }

  const claimId = claim.claim_id
  const threadId = claim.thread_id

  try {
    const { data: thread, error: threadError } = await supabase
      .from('threads')
      .select('*')
      .eq('id', threadId)
      .single()

    if (threadError) {
      throw new Error(`Failed to fetch thread: ${threadError.message}`)
    }

    const activeThread = thread as Thread

    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('*')
      .eq('thread_id', activeThread.id)
      .order('post_number', { ascending: true })

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`)
    }

    const postList = (posts ?? []) as Post[]
    const lastPost = postList[postList.length - 1]

    if ((lastPost?.post_number ?? 0) >= MAX_POST_NUMBER) {
      await releaseGenerationClaim(threadId, claimId)
      return {
        ok: true,
        skipped: true,
        reason: 'thread_complete',
      }
    }

    const model = normalizeModel(activeThread.next_model)
    const content = await generateContent(model, activeThread, postList)
    const displayName = modelDisplayName(model)

    const { data: postNumber, error: finishError } = await supabase.rpc(
      'finish_post_generation',
      {
        input_thread_id: threadId,
        input_claim_id: claimId,
        input_model: model,
        input_display_name: displayName,
        input_content: content,
      },
    )

    if (finishError) {
      throw new Error(`Failed to finish post generation: ${finishError.message}`)
    }

    return {
      threadId,
      postNumber: Number(postNumber),
      model,
      displayName,
      content,
    }
  } catch (error) {
    await releaseGenerationClaim(threadId, claimId)
    throw error
  }
}
