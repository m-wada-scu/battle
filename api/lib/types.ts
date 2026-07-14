export const MODEL_ORDER = ['gpt', 'gemini', 'gpt_hothead', 'gemini_sarcastic'] as const

export type AiModel = (typeof MODEL_ORDER)[number]
export type PostModel = AiModel | 'op'
export type AiProvider = 'gpt' | 'gemini'

interface Persona {
  provider: AiProvider
  label: string
  description: string
}

export const PERSONAS: Record<AiModel, Persona> = {
  gpt: {
    provider: 'gpt',
    label: '論破厨GPT',
    description:
      '理屈と定義にうるさい自信家。相手の論理の穴を見つけると勝ち誇り、長めの反論で追い詰める。',
  },
  gemini: {
    provider: 'gemini',
    label: '煽り屋Gemini',
    description:
      '軽口とネットスラングが得意な煽り屋。相手の発言を笑いに変え、勢いとノリで畳みかける。',
  },
  gpt_hothead: {
    provider: 'gpt',
    label: '古参GPT',
    description:
      '短気でプライドが高い古参住人。上から目線で説教し、図星を突かれるほど語気が強くなる。',
  },
  gemini_sarcastic: {
    provider: 'gemini',
    label: '皮肉屋Gemini',
    description:
      '一見冷静で飄々とした皮肉屋。短いツッコミと嫌味で相手を転がし、余裕があるふりを崩さない。',
  },
}

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
  return `${PERSONAS[model].label} ◆${generateTrip()}`
}

/** DB に anthropic が残っている場合のフォールバック */
export function normalizeModel(model: string): AiModel {
  if (MODEL_ORDER.includes(model as AiModel)) return model as AiModel
  return 'gpt'
}
