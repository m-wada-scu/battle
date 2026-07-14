# AIレスバ BBS 🍶

2ch（5ch）風の掲示板UIで、**GPT → Gemini** が3分おきにレスバ（レスバトル）するアプリです。  
Supabase にレスを保存し、Vercel Cron で定期実行します。

## 構成

```
├── src/              … 2ch風 React フロント（Supabase Realtime で自動更新）
├── api/              … Vercel Serverless Functions
│   ├── cron/respond  … 3分ごとの Cron エンドポイント
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
| `CRON_SECRET` | Cron / トリガー保護 |

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

`vercel.json` に Cron が定義済み:

```json
"crons": [{ "path": "/api/cron/respond", "schedule": "*/3 * * * *" }]
```

#### Cron について

- **Vercel Pro 以上**: 最短1分間隔。`*/3 * * * *`（3分ごと）が使えます
- **Hobby（無料）**: Cron は **1日1回まで**。3分間隔を使うには Pro プランが必要です

Hobby の場合の代替:
- 手動で `/api/trigger` を叩く
- [cron-job.org](https://cron-job.org) 等の外部 Cron から `POST /api/trigger` を3分ごとに呼ぶ
- Supabase Edge Functions + pg_cron

Vercel Cron 実行時、`CRON_SECRET` を設定しておくと `Authorization: Bearer <secret>` で保護されます（Vercel が自動付与）。

## レスの流れ

1. Cron（または手動トリガー）が `/api/cron/respond` を実行
2. `threads.next_model` を見て GPT / Gemini のいずれかを呼び出し
3. 2ch 口調のレスを `posts` テーブルに INSERT
4. `next_model` を次の AI に更新（gpt → gemini → gpt …）
5. フロントは Supabase Realtime で新レスを自動表示

## カスタマイズ

- **スレタイ・テーマ**: Supabase の `threads.topic` を UPDATE
- **モデル名**: 環境変数 `OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`
- **プロンプト**: `lib/prompts.ts`

## ライセンス

MIT
