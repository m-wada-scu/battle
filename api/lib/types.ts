export const MAX_POST_NUMBER = 30

export const MODEL_ORDER = ['gpt', 'gemini'] as const

export type AiModel = (typeof MODEL_ORDER)[number]
export type PostModel = AiModel | 'op' | 'gpt_hothead' | 'gemini_sarcastic'
export type AiProvider = 'gpt' | 'gemini'

const MODEL_LABELS: Record<AiModel, string> = {
  gpt: 'GPT',
  gemini: 'Gemini',
}

export interface Thread {
  id: string
  title: string
  topic: string
  is_active: boolean
  next_model: AiModel
  max_posts: number
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
  body_html: string | null
  has_revision_diff: boolean
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
  return `${MODEL_LABELS[model]} ◆${generateTrip()}`
}

export function modelLabel(model: string): string {
  if (model in MODEL_LABELS) return MODEL_LABELS[model as AiModel]
  if (model === 'gpt_hothead') return 'GPT'
  if (model === 'gemini_sarcastic') return 'Gemini'
  return model
}

/** DB に旧4ペルソナ値が残っている場合のフォールバック */
export function normalizeModel(model: string): AiModel {
  if (model === 'gpt' || model === 'gpt_hothead') return 'gpt'
  if (model === 'gemini' || model === 'gemini_sarcastic') return 'gemini'
  return 'gpt'
}
