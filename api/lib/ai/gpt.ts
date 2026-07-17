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
  const prompt = buildPrompt(thread, posts, 'gpt')

  const response = await client.responses.create({
    model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    input: prompt,
    tools: [{ type: 'web_search' }],
    tool_choice: 'required',
    temperature: 0.95,
    max_output_tokens: 1200,
  })

  const content = response.output_text?.trim()
  if (!content) {
    throw new Error('GPT returned empty response')
  }

  return content
}
