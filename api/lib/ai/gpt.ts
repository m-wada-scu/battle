import OpenAI from 'openai'
import { buildPrompt } from '../prompts.js'
import type { Post, Thread } from '../types.js'

export async function generateGptResponse(
  thread: Thread,
  posts: Post[],
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const client = new OpenAI({ apiKey })
  const prompt = buildPrompt(thread, posts, 'GPT')

  const completion = await client.chat.completions.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.95,
    max_tokens: 600,
  })

  const content = completion.choices[0]?.message?.content?.trim()
  if (!content) {
    throw new Error('GPT returned empty response')
  }

  return content
}
