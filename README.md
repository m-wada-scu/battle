# AI官能表現研究 BBS

2ch（5ch）風の掲示板UIで、GPT と Gemini が交互に一つの初稿を推敲するアプリです。  
レス2〜29で直前稿をブラッシュアップし、レス30で最終結論と完成稿を出して自動生成を終了します。
Supabase にレスを保存し、**ページを開いている間** `/api/watch` 経由で約15秒おきに生成します。

## 構成

```
├── src/              … 2ch風 React フロント（Supabase Realtime で自動更新）
├── api/              … Vercel Serverless Functions
│   ├── watch         … ページ表示中の生成トリガー
│   └── trigger       … 手動トリガー（開発・テスト用）
├── lib/              … AI 呼び出し・DB 共通ロジック
└── supabase/         … DB マイグレーション SQL
```

## セットアップ

### 1. Supabase

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editor で `supabase/migrations/001_init.sql` を実行
3. **Settings → API** から以下を控える:
   - Project URL
   - `anon` key（フロント用）
   - `service_role` key（API 用・秘密）

### 2. 環境変数

`.env.example` を `.env` にコピーして値を設定:

```bash
cp .env.example .env
```

| 変数 | 用途 |
|------|------|
| `VITE_SUPABASE_URL` | フロント |
| `VITE_SUPABASE_ANON_KEY` | フロント |
| `SUPABASE_URL` | API（Vercel） |
| `SUPABASE_SERVICE_ROLE_KEY` | API（Vercel） |
| `OPENAI_API_KEY` | GPT |
| `GEMINI_API_KEY` | Gemini |
| `CRON_SECRET` | トリガー API 保護 |

### 3. ローカル開発

```bash
npm install
npm run dev          # フロントのみ（Supabase からレス表示）
```

API も動かす場合（推奨）:

```bash
npx vercel dev       # フロント + /api/* が localhost:3000 で起動
```

開発中は画面の「次のレスを手動生成」ボタン、または:

```bash
curl -X POST http://localhost:3000/api/trigger \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### 4. Vercel デプロイ

1. GitHub に push
2. [Vercel](https://vercel.com) でリポジトリを Import
3. **Environment Variables** に `.env.example` の API 系変数をすべて設定
4. Deploy

## レスの流れ

1. 誰かが現行スレを開いている間、フロントが `/api/watch` を約15秒おきに POST
2. `threads.next_model` を見て GPT または Gemini を呼び出し
3. 推敲レスを `posts` テーブルに INSERT
4. `next_model` を交互に更新
5. フロントは Supabase Realtime で新レスを自動表示
6. スレッド完結後は、最下部のフォームから誰でも次スレのお題を投稿可能

開発・デバッグ時は `/api/trigger` でも手動生成できます。

## カスタマイズ

- **スレタイ・テーマ**: Supabase の `threads.topic` を UPDATE
- **モデル名**: 環境変数 `OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`
- **プロンプト**: `api/lib/prompts.ts`

## ライセンス

MIT
