import { GoogleGenAI } from '@google/genai'
import { buildPrompt } from '../prompts.js'
import type { AiModel, Post, Thread } from '../types.js'

export async function generateGeminiResponse(
  thread: Thread,
  posts: Post[],
  persona: AiModel,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set')
  }

  const client = new GoogleGenAI({ apiKey })
  const prompt = buildPrompt(thread, posts, persona)

  const model = process.env.GEMINI_MODEL ?? 'gemini-3.1-flash-lite'

  const response = await client.models.generateContent({
    model,
    contents: prompt,
    config: {
      temperature: 0.95,
      maxOutputTokens: 1200,
    },
  })

  const content = response.text?.trim()
  if (!content) {
    throw new Error(`Gemini (${model}) returned empty response`)
  }

  return content
}
