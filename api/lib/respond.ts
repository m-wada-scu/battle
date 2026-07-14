import { generateGeminiResponse } from './ai/gemini'
import { generateGptResponse } from './ai/gpt'
import { createServiceClient } from './supabase'
import {
  type AiModel,
  modelDisplayName,
  nextModel,
  normalizeModel,
  type Post,
  type Thread,
} from './types'

async function generateContent(
  model: AiModel,
  thread: Thread,
  posts: Post[],
): Promise<string> {
  switch (model) {
    case 'gpt':
      return generateGptResponse(thread, posts)
    case 'gemini':
      return generateGeminiResponse(thread, posts)
  }
}

export interface RespondResult {
  threadId: string
  postNumber: number
  model: AiModel
  displayName: string
  content: string
}

export async function generateNextPost(): Promise<RespondResult> {
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

  const { data: posts, error: postsError } = await supabase
    .from('posts')
    .select('*')
    .eq('thread_id', thread.id)
    .order('post_number', { ascending: true })

  if (postsError) {
    throw new Error(`Failed to fetch posts: ${postsError.message}`)
  }

  const model = normalizeModel(thread.next_model)
  const content = await generateContent(model, thread, posts ?? [])
  const postNumber = (posts?.at(-1)?.post_number ?? 0) + 1
  const displayName = modelDisplayName(model)

  const { error: insertError } = await supabase.from('posts').insert({
    thread_id: thread.id,
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
    .eq('id', thread.id)

  if (updateError) {
    throw new Error(`Failed to update thread: ${updateError.message}`)
  }

  return {
    threadId: thread.id,
    postNumber,
    model,
    displayName,
    content,
  }
}
