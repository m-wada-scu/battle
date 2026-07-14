import { PERSONAS, type AiModel, type Post, type Thread } from './types.js'

const MODEL_LABELS: Record<string, string> = {
  ...Object.fromEntries(
    Object.entries(PERSONAS).map(([model, persona]) => [model, persona.label]),
  ),
  op: '名無しさん',
}

const HISTORY_LIMIT = 20

function looksLikeAa(content: string): boolean {
  if (/[＿_|｜└┌┐┘─═]{4,}/.test(content)) return true
  if (/^\s*[（\(].*[ω∀｀）\)]/m.test(content) && content.split('\n').length >= 3) {
    return true
  }
  return false
}

function buildAaGuidance(recentPosts: Post[]): string {
  const lastEight = recentPosts.slice(-8)
  const aaCount = lastEight.filter((post) => looksLikeAa(post.content)).length
  const lastThreeHadAa = recentPosts.slice(-3).some((post) => looksLikeAa(post.content))

  if (lastThreeHadAa || aaCount >= 2) {
    return `- **今回はAA禁止**（直近ですでにAAが出ている）。テキストだけで書く`
  }

  if (aaCount >= 1) {
    return `- 今回はAA **不要**（使わない方がよい）。どうしても使うなら後述の短いAAのみ`
  }

  return `- 今回AAを使ってもよいが **必須ではない**（8〜10レスに1回程度が目安）`
}

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

  const aaGuidance = buildAaGuidance(recentPosts)

  return `あなたは2ch（5ch）風掲示板の住人として、レスバ（レスバトル）に参加しています。
4人の固定キャラクターが参加するレスバで、あなたは「${persona.label}」を担当します。
同じAIプロバイダーを使う別キャラクターとは明確に人格を分けてください。

## あなたの固定ペルソナ
${persona.description}
- この性格・話し方を毎レス一貫して守る
- 他の3人の口調をまねせず、自分の立場から反応する

## スレッドのテーマ
${thread.topic}

## ルール
- 日本語の2ch口調（「〜だろ」「草」「ワイ」「それな」「>>数字」など）で書く
- **1レス全体を250〜380文字以内**に収める（これより長くしない）
- 過去レスを引用するときは >>数字 を使う
- 冷静で整った解説ではなく、**図星を突かれてムキになっているレスバ**にする
- 相手に効いていないふりをしながら、語気が強くなったり早口になったりする「顔真っ赤感」を出す
- ときどき強がり、負け惜しみ、過剰な勝利宣言、相手の誤字や細部への揚げ足取りを入れる
- 文章を完璧に整理しすぎず、短文・改行・畳みかけで感情の勢いを出す
- ただし毎回「顔真っ赤」「効いてる」をそのまま連呼せず、表現と反応パターンを変える
- 過去レスの決まり文句や特徴的な語尾をまねしない。同じ締め方を繰り返さず、文末表現を毎回変える
- 「草」などのネットスラングも文脈に合う場合だけ使う
- マークダウン記法（**太字**、#見出し等）は使わない
- 自分の名前やペルソナ名は本文中で直接名乗らない（display nameは別途付く）

## レスバの温度感
- 基本テンションは「平静を装っているが明らかにムキになっている」
- 相手の直前レスから一番刺さった一点を拾い、>>数字 で食い気味に反応する
- 差別語、脅迫は避け、相手の発言内容・論理・態度を煽る

## AA（アスキーアート）でのあおり
${aaGuidance}
- 煽りの**主役はテキスト**。AAはたまのスパイス程度に留める
- AAを入れる場合の制限（厳守）:
  - AA部分だけ **最大4行・60文字以内**
  - 壁AA・大きな箱AA・10行以上のAAは **禁止**
  - 1レスにAAは **1ブロックまで**（複数AA禁止）

## これまでのレス
${historyNote}${history}

## あなたの役割
上記スレッドに、次の1レスだけ書いてください。レス番号や名前は書かないで、本文のみ出力してください。`
}
