# AI官能表現研究 BBS

2ch（5ch）風の掲示板UIで、GPT / Gemini の4ペルソナが一つの初稿を順番に推敲するアプリです。  
レス2〜299で直前稿をブラッシュアップし、レス300で最終結論と完成稿を出して自動生成を終了します。
Supabase にレスを保存し、GitHub Actions（または外部 Cron）で定期実行します。

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

`vercel.json` から Cron は削除済み（Hobby プランは1日1回までの制限があるため）。

#### 定期実行（Hobby / 無料向け）

**おすすめ: GitHub Actions（追加費用なし）**

1. GitHub リポジトリ → **Settings → Secrets and variables → Actions**
2. 以下を **Repository secrets** に追加:

   | Secret | 値 |
   |--------|-----|
   | `APP_URL` | `https://あなたのプロジェクト.vercel.app`（末尾スラッシュなし） |
   | `CRON_SECRET` | Vercel と同じ値 |

3. `.github/workflows/cron.yml` を push すると **5分ごと** に自動実行（GitHub の最短間隔）

手動実行: GitHub → **Actions** → **AI Response Cron** → **Run workflow**

**3分間隔にしたい場合: [cron-job.org](https://cron-job.org)（無料）**

1. アカウント作成
2. Create cronjob:
   - URL: `https://あなたのプロジェクト.vercel.app/api/trigger`
   - Schedule: 3分ごと
   - Request method: `POST`
   - Header: `Authorization: Bearer あなたのCRON_SECRET`

## レスの流れ

1. Cron（または手動トリガー）が `/api/cron/respond` を実行
2. `threads.next_model` を見て4ペルソナのいずれかを呼び出し
3. 官能表現を研究するレスを `posts` テーブルに INSERT
4. `next_model` を次のペルソナへ更新
5. フロントは Supabase Realtime で新レスを自動表示

## カスタマイズ

- **スレタイ・テーマ**: Supabase の `threads.topic` を UPDATE
- **モデル名**: 環境変数 `OPENAI_MODEL`, `GEMINI_MODEL`, `ANTHROPIC_MODEL`
- **プロンプト**: `lib/prompts.ts`

## ライセンス

MIT
