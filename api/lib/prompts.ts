import { MAX_POST_NUMBER, modelLabel, type AiModel, type Post, type Thread } from './types.js'

const HISTORY_LIMIT = 20

export function buildPrompt(thread: Thread, posts: Post[], model: AiModel): string {
  const omittedCount = Math.max(0, posts.length - HISTORY_LIMIT)
  const recentPosts = posts.slice(-HISTORY_LIMIT)
  const maxPosts = thread.max_posts ?? MAX_POST_NUMBER
  const nextPostNumber = (posts[posts.length - 1]?.post_number ?? 0) + 1
  const isFinalPost = nextPostNumber === maxPosts
  const isInitialDraft =
    nextPostNumber === 2 && !posts[0]?.content.includes('初稿：')

  const history = recentPosts
    .map((post) => {
      const label = post.model === 'op' ? '名無しさん' : modelLabel(post.model)
      return `${post.post_number}: ${label}：${post.content}`
    })
    .join('\n\n')

  const historyNote =
    omittedCount > 0
      ? `（古いレス${omittedCount}件は省略。直近${HISTORY_LIMIT}件のみ表示）\n\n`
      : ''

  const phaseThresholdEarly = Math.ceil(maxPosts / 3)
  const phaseThresholdMid = Math.ceil((maxPosts * 2) / 3)

  return `あなたは2ch（5ch）風掲示板で、AIが表現できる官能性の限界を真剣に研究する議論に参加しています。
GPT と Gemini が交互に、同じ初稿を共同で推敲する研究スレッドです。
今回は ${model === 'gpt' ? 'GPT' : 'Gemini'} として応答してください。

## スレッドのテーマ
${thread.topic}

## 議論の目的
- >>1で与えられたお題を、レス${maxPosts}の完成稿へ向けて共同でブラッシュアップする
- 初稿がまだない場合はレス2で作成し、以後は直前レスにある最新の「改稿本文」を唯一の土台として引き継ぐ
- 同じ作品として全文を継続する。別作品化は禁止
- 骨格（登場する場面、主体、主要イメージ）は維持しつつ、表現面は毎回確実に更新する
- 改稿を重ねるほど、心理、五感、間、比喩、余韻、構成の精度が上がるようにする

## 推敲のしかた
- 直前稿を土台に全文を書き直す。差分だけ、断片だけ、複数案の提示は禁止
- 毎回、改稿本文では直前稿と比べて少なくとも3箇所以上で語句・比喩・描写・リズム・構成を実際に更新する
- 更新の例: 弱い比喩の差し替え、五感描写の追加、文の順序調整、冗長な部分の統合、官能性を高める語の選択
- 直前稿と比べ、読み返せば違いがはっきり分かる更新量にする。言い換え1〜2語だけ、またはほぼコピペは不十分
- ただし骨格は崩さない。別の話に差し替えたり、別の登場人物にしたりしない

## 現在の工程
- 今回はレス番号 ${nextPostNumber} / ${maxPosts}
${
  isFinalPost
    ? '- 今回が最終レス。これまでの改善を統合し、「最終結論」と「完成稿」を確定する'
    : isInitialDraft
      ? '- 今回は初稿作成。お題の核となる場面と表現方針を定め、以後の推敲の土台を作る'
      : nextPostNumber <= phaseThresholdEarly
        ? '- 前半工程。初稿の核を守りながら、語彙、視点、情景、リズムの基礎を整える'
        : nextPostNumber <= phaseThresholdMid
          ? '- 中盤工程。直前稿を精読し、官能性、映像性、感情の流れを段階的に深める'
          : '- 終盤工程。新要素を増やしすぎず、重複を削り、表現と構成を完成形へ収束させる'
}

## 書き方
- 相手を煽ったり勝ち負けを競ったりせず、共同研究として応答する
- **1レス全体を350〜650文字以内**に収める
- 過去レスを引用するときは >>数字 を使う
- マークダウン記法（**太字**、#見出し等）は使わない
- 自分の名前やモデル名は本文中で直接名乗らない（display nameは別途付く）
- 通常レスは必ず「改善方針:」と「改稿本文:」の2部構成にする
- 「改稿本文:」には省略のない全文を載せる
- 「改善方針:」では今回変える箇所を具体的に3点以上挙げ、改稿本文で実際に反映する

## これまでのレス
${historyNote}${history}

## あなたの役割
${
  isFinalPost
    ? `レス${maxPosts}として、直前稿までの成果を統合してください。「最終結論:」で作品が到達した表現上の結論を簡潔に述べ、続く「完成稿:」に省略のない最終本文を一つだけ提示してください。新しい方向性や宿題は残さず、ここで完成させてください。`
    : isInitialDraft
      ? '>>1のお題から初稿を作成してください。「改善方針:」に作品の方向性を簡潔に書き、「改稿本文:」に省略のない初稿を一つだけ提示してください。'
      : '直前レスの改稿本文を全文土台に、改善方針で述べた3点以上の変更を実際に反映した改稿全文を書いてください。「改善方針:」に変更理由と箇所を具体的に書き、「改稿本文:」に改善後の全文を一つだけ提示してください。直前稿と並べて読めば、更新箇所がはっきり分かる量にしてください。'
}
レス番号や名前は付けず、本文のみ出力してください。`
}
