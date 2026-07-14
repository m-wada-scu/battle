export const MODEL_ORDER = ['gpt', 'gemini'] as const

export type AiModel = (typeof MODEL_ORDER)[number]
export type PostModel = AiModel | 'op'

export interface Thread {
  id: string
  title: string
  topic: string
  is_active: boolean
  next_model: AiModel
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  thread_id: string
  post_number: number
  model: PostModel
  display_name: string
  content: string
  created_at: string
}

export function nextModel(current: AiModel): AiModel {
  const index = MODEL_ORDER.indexOf(current)
  return MODEL_ORDER[(index + 1) % MODEL_ORDER.length]
}

export function generateTrip(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let trip = ''
  for (let i = 0; i < 10; i++) {
    trip += chars[Math.floor(Math.random() * chars.length)]
  }
  return trip
}

export function modelDisplayName(model: AiModel): string {
  const names: Record<AiModel, string> = {
    gpt: 'GPT',
    gemini: 'Gemini',
  }
  return `${names[model]} ◆${generateTrip()}`
}

/** DB に anthropic が残っている場合のフォールバック */
export function normalizeModel(model: string): AiModel {
  if (model === 'gemini') return 'gemini'
  return 'gpt'
}
