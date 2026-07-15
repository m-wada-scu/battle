import { generateGeminiResponse } from './ai/gemini.js'
import { generateGptResponse } from './ai/gpt.js'
import { createServiceClient } from './supabase.js'
import {
  type AiModel,
  modelDisplayName,
  nextModel,
  normalizeModel,
  type Post,
  type Thread,
} from './types.js'

export const MAX_POST_NUMBER = 300

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

interface LatestPostState {
  created_at: string
  post_number: number
}

async function getLatestPostState(): Promise<LatestPostState | null> {
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('posts')
    .select('created_at, post_number')
    .order('post_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    throw new Error(`Failed to fetch latest post: ${error.message}`)
  }

  return (data as LatestPostState | null) ?? null
}

export async function generateNextPostIfDue(
  minIntervalMs: number,
): Promise<RespondResult | SkippedResult> {
  const latestPost = await getLatestPostState()

  if (latestPost) {
    if (latestPost.post_number >= MAX_POST_NUMBER) {
      return {
        ok: true,
        skipped: true,
        reason: 'thread_complete',
      }
    }

    const ageMs = Date.now() - new Date(latestPost.created_at).getTime()
    if (ageMs < minIntervalMs) {
      return {
        ok: true,
        skipped: true,
        reason: 'too_soon',
        retryAfterMs: minIntervalMs - ageMs,
      }
    }
  }

  return generateNextPost()
}

export async function generateNextPost(): Promise<RespondResult | SkippedResult> {
  const supabase = createServiceClient()

  const { data: thread, error: threadError } = await supabase
    .from('threads')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (threadError) {
    throw new Error(`Failed to fetch thread: ${threadError.message}`)
  }

  if (!thread) {
    throw new Error('No active thread found. Run supabase/migrations/001_init.sql first.')
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
  const postNumber = (lastPost?.post_number ?? 0) + 1

  if (postNumber > MAX_POST_NUMBER) {
    return {
      ok: true,
      skipped: true,
      reason: 'thread_complete',
    }
  }

  const model = normalizeModel(activeThread.next_model)
  const content = await generateContent(model, activeThread, postList)
  const displayName = modelDisplayName(model)

  const { error: insertError } = await supabase.from('posts').insert({
    thread_id: activeThread.id,
    post_number: postNumber,
    model,
    display_name: displayName,
    content,
  })

  if (insertError) {
    throw new Error(`Failed to insert post: ${insertError.message}`)
  }

  const { error: updateError } = await supabase
    .from('threads')
    .update({
      next_model: nextModel(model),
      updated_at: new Date().toISOString(),
    })
    .eq('id', activeThread.id)

  if (updateError) {
    throw new Error(`Failed to update thread: ${updateError.message}`)
  }

  return {
    threadId: activeThread.id,
    postNumber,
    model,
    displayName,
    content,
  }
}
