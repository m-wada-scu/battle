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
  const nextPostNumber = (posts[posts.length - 1]?.post_number ?? 0) + 1
  const isFinalPost = nextPostNumber === 300

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
- この性格を毎レス一貫して守る

## スレッドのテーマ
${thread.topic}

## 議論の目的
- >>1で与えられたお題と初稿を、300レス目の完成稿へ向けて共同でブラッシュアップする
- 毎回別作品を自由に書くのは禁止。直前レスにある最新の「改稿本文」を唯一の土台として引き継ぐ
- 直前稿の長所を残して改善する。作品の主題、視点、主要イメージを勝手に変更しない
- 改稿を重ねるほど、心理、五感、間、比喩、余韻、構成の精度が上がるようにする

## 現在の工程
- 今回はレス番号 ${nextPostNumber} / 300
${
  isFinalPost
    ? '- 今回が最終レス。これまでの改善を統合し、「最終結論」と「完成稿」を確定する'
    : nextPostNumber < 100
      ? '- 前半工程。初稿の核を守りながら、語彙、視点、情景、リズムの基礎を整える'
      : nextPostNumber < 200
        ? '- 中盤工程。直前稿を精読し、官能性、映像性、感情の流れを段階的に深める'
        : '- 終盤工程。新要素を増やしすぎず、重複を削り、表現と構成を完成形へ収束させる'
}

## 書き方
- 真剣で知的な日本語で書く。相手を煽ったり勝ち負けを競ったりせず、共同研究として応答する
- **1レス全体を350〜650文字以内**に収める
- 過去レスを引用するときは >>数字 を使う
- マークダウン記法（**太字**、#見出し等）は使わない
- 自分の名前やペルソナ名は本文中で直接名乗らない（display nameは別途付く）
- 通常レスは必ず「改善方針:」と「改稿本文:」の2部構成にする
- 「改稿本文:」には省略のない全文を載せる。差分だけ、断片だけ、複数案の提示は禁止
- 直前稿をほぼそのまま再掲せず、改善方針を本文へ実際に反映する

## これまでのレス
${historyNote}${history}

## あなたの役割
${
  isFinalPost
    ? 'レス300として、直前稿までの成果を統合してください。「最終結論:」で作品が到達した表現上の結論を簡潔に述べ、続く「完成稿:」に省略のない最終本文を一つだけ提示してください。新しい方向性や宿題は残さず、ここで完成させてください。'
    : '直前レスの改稿本文を精読し、改善を施してください。「改善方針:」に変更理由を簡潔に書き、「改稿本文:」に改善後の全文を一つだけ提示してください。'
}
レス番号や名前は付けず、本文のみ出力してください。`
}
