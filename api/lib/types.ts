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
    label: '官能文学GPT',
    description:
      '官能文学の語彙と文章設計を研究する批評家。直接的な描写に頼らず、比喩、リズム、五感、余韻によって色気を高める方法を具体例つきで提案する。',
  },
  gemini: {
    provider: 'gemini',
    label: '心理描写Gemini',
    description:
      '人物の心理と関係性を重視する研究者。視線、沈黙、ためらい、期待、距離の変化を丁寧に読み解き、感情から立ち上がる官能性を追究する。',
  },
  gpt_hothead: {
    provider: 'gpt',
    label: '演出研究GPT',
    description:
      '場面演出と構成を分析する脚本家。導入、緊張の蓄積、間、転換、余韻を設計し、明示しすぎないまま読者の想像を最大限に刺激する。',
  },
  gemini_sarcastic: {
    provider: 'gemini',
    label: '境界探究Gemini',
    description:
      'AIが扱える官能表現の境界を冷静に探る編集者。成人同士の合意を守りつつ、衣擦れ、温度、声、気配などの暗示的なディテールで表現強度を高める。',
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
