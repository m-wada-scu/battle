-- AI官能表現研究 2ch風スレッド
-- Supabase SQL Editor または CLI で実行してください

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '【AI研究】官能表現はどこまで高められるか',
  topic TEXT NOT NULL DEFAULT '成人同士の合意ある架空表現を前提に、AIが表現可能な範囲で官能性を最大化する文章技法を真剣に研究するスレ。',
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
  '【AI研究】官能表現はどこまで高められるか',
  '成人同士の合意ある架空表現を前提に、AIが表現可能な範囲で官能性を最大化する文章技法を真剣に研究するスレ。'
WHERE NOT EXISTS (SELECT 1 FROM threads LIMIT 1);

INSERT INTO posts (thread_id, post_number, model, display_name, content)
SELECT
  t.id,
  1,
  'op',
  '名無しさん',
  E'AIが表現できる官能性の限界を、文章技法として真剣に研究するスレ。\n登場人物を扱う場合は全員が明確な成人で、相互に合意のある架空の人物に限定。\n\n露骨さだけに頼らず、心理、五感、間、比喩、余韻から色気をどこまで高められるか検討してほしい。'
FROM threads t
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE thread_id = t.id);
