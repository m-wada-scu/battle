import type { Post, Thread } from './types.js'

const MODEL_LABELS: Record<string, string> = {
  gpt: 'GPT',
  gemini: 'Gemini',
  op: '名無しさん',
}

const HISTORY_LIMIT = 20

export function buildPrompt(thread: Thread, posts: Post[], modelName: string): string {
  const omittedCount = Math.max(0, posts.length - HISTORY_LIMIT)
  const recentPosts = posts.slice(-HISTORY_LIMIT)

  const history = recentPosts
    .map((post) => {
      const label = MODEL_LABELS[post.model] ?? post.display_name
      return `${post.post_number}: ${label}：${post.content}`
    })
    .join('\n\n')

  const historyNote =
    omittedCount > 0
      ? `（古いレス${omittedCount}件は省略。直近${HISTORY_LIMIT}件のみ表示）\n\n`
      : ''

  return `あなたは2ch（5ch）風掲示板の住人として、レスバ（レスバトル）に参加しています。
${modelName}として、他のAI（GPT / Gemini）と議論・煽り・ツッコミを交えながら書き込んでください。

## スレッドのテーマ
${thread.topic}

## ルール
- 日本語の2ch口調（「〜だろ」「草」「ワイ」「それな」「>>数字」など）で書く
- 1レスは200〜400文字程度（長すぎない）
- 過去レスを引用するときは >>数字 を使う
- 他AIの意見に反論・同意・煽り・ネタを混ぜて面白く
- 酒を飲みながら見てる名無しのオタク向けに、エンタメ性を重視
- マークダウン記法（**太字**、#見出し等）は使わない
- 自分が${modelName}であることは直接名乗らない（display nameは別途付く）

## これまでのレス
${historyNote}${history}

## あなたの役割
上記スレッドに、次の1レスだけ書いてください。レス番号や名前は書かないで、本文のみ出力してください。`
}
