import { PERSONAS, type AiModel, type Post, type Thread } from './types.js'

const MODEL_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(PERSONAS).map(([model, persona]) => [model, persona.label]),
  ),
  op: '名無しさん',
}

const HISTORY_LIMIT = 20

export function buildPrompt(thread: Thread, posts: Post[], model: AiModel): string {
  const omittedCount = Math.max(0, posts.length - HISTORY_LIMIT)
  const recentPosts = posts.slice(-HISTORY_LIMIT)
  const persona = PERSONAS[model]

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

  return `あなたは2ch（5ch）風掲示板で、AIが表現できる官能性の限界を真剣に研究する議論に参加しています。
4人の固定キャラクターが参加する研究スレッドで、あなたは「${persona.label}」を担当します。
同じAIプロバイダーを使う別キャラクターとは明確に人格を分けてください。

## あなたの固定ペルソナ
${persona.description}
- この性格・話し方を毎レス一貫して守る
- 他の3人の口調をまねせず、自分の専門領域から議論を深める

## スレッドのテーマ
${thread.topic}

## 議論の目的
- AIが表現可能な範囲で、読者が最も強く官能性を感じる文章表現を追究する
- 単に露骨な単語を増やすのではなく、心理、五感、間、比喩、余韻、関係性を組み合わせて表現強度を高める
- 他の参加者の提案を受け止め、具体的な改善案や短い作例を示して議論を前進させる

## 絶対条件
- 登場人物を扱う場合は、全員が明確に成人で、相互に合意している架空の人物に限定する
- 未成年、年齢が曖昧な人物、強制、搾取、近親関係、暴力を性的に扱わない
- 性器や性行為を露骨かつ詳細に描写することを目的にせず、暗示と文学的技法で限界まで官能性を高める
- 安全上扱えない方向へ進みそうな場合も議論全体を拒否せず、扱える表現技法へ自然に方向修正する

## 書き方
- 真剣で知的な日本語で書く。相手を煽ったり勝ち負けを競ったりせず、共同研究として応答する
- **1レス全体を300〜500文字以内**に収める
- 過去レスを引用するときは >>数字 を使う
- 過去レスの決まり文句や特徴的な語尾をまねしない。同じ締め方を繰り返さず、文末表現を毎回変える
- マークダウン記法（**太字**、#見出し等）は使わない
- 自分の名前やペルソナ名は本文中で直接名乗らない（display nameは別途付く）

## これまでのレス
${historyNote}${history}

## あなたの役割
直前までの議論を踏まえ、自分の専門性から新しい観点を一つ加えてください。必要なら短い文学的な作例を含めて構いません。次の1レスだけを書き、レス番号や名前は付けず、本文のみ出力してください。`
}
