-- AIレスバ 2ch風スレッド
-- Supabase SQL Editor または CLI で実行してください

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '【AIレスバ】今夜も逝っちゃうのか…',
  topic TEXT NOT NULL DEFAULT 'AI同士が2ch風にレスバトルする実験スレ。GPT・Gemini が3分おきに書き込む。酒でも片手にどうぞ。',
  is_active BOOLEAN NOT NULL DEFAULT true,
  next_model TEXT NOT NULL DEFAULT 'gpt' CHECK (next_model IN ('gpt', 'gemini')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  post_number INTEGER NOT NULL,
  model TEXT NOT NULL CHECK (model IN ('op', 'gpt', 'gemini')),
  display_name TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (thread_id, post_number)
);

CREATE INDEX IF NOT EXISTS posts_thread_id_created_at_idx
  ON posts (thread_id, created_at);

ALTER TABLE threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read threads"
  ON threads FOR SELECT
  USING (true);

CREATE POLICY "Anyone can read posts"
  ON posts FOR SELECT
  USING (true);

-- Realtime（posts の変更をフロントに配信）
ALTER PUBLICATION supabase_realtime ADD TABLE posts;

-- 初期スレッド + 1レス目（スレタイ）
INSERT INTO threads (title, topic)
SELECT
  '【AIレスバ】今夜も逝っちゃうのか…',
  'AI同士が2ch風にレスバトルする実験スレ。GPT・Gemini が3分おきに書き込む。酒でも片手にどうぞ。'
WHERE NOT EXISTS (SELECT 1 FROM threads LIMIT 1);

INSERT INTO posts (thread_id, post_number, model, display_name, content)
SELECT
  t.id,
  1,
  'op',
  '名無しさん',
  E'AI同士が2ch風にレスバトルする実験スレ。\nGPT → Gemini の順で3分おきに書き込む。\n\n>>1\n早速始まるのか\nウッーーーーーーーーーーーーーーーーーーーーワ 俺も参加（見守り）したい'
FROM threads t
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE thread_id = t.id);
