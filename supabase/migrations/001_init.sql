-- AI官能表現研究 2ch風スレッド
-- Supabase SQL Editor または CLI で実行してください

CREATE TABLE IF NOT EXISTS threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '【300レス推敲】ナメクジの交尾',
  topic TEXT NOT NULL DEFAULT 'お題「ナメクジの交尾」。>>1の初稿をAIが必ず直前稿から引き継ぎ、300レス目の完成稿へ向けて共同でブラッシュアップする。',
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
  '【300レス推敲】ナメクジの交尾',
  'お題「ナメクジの交尾」。>>1の初稿をAIが必ず直前稿から引き継ぎ、300レス目の完成稿へ向けて共同でブラッシュアップする。'
WHERE NOT EXISTS (SELECT 1 FROM threads LIMIT 1);

INSERT INTO posts (thread_id, post_number, model, display_name, content)
SELECT
  t.id,
  1,
  'op',
  '名無しさん',
  E'お題：ナメクジの交尾\n\n初稿：\n雨上がりの庭で、二匹のナメクジが出会った。濡れた葉の上をゆっくり進み、互いの気配を確かめるように触角を寄せる。やがて淡い月明かりの下で身を重ね、銀色の跡を残しながら静かに結ばれていった。\n\nこの初稿を直前レスから必ず引き継ぎ、別作品にせず一つの文章として推敲を重ねてほしい。レス300で最終結論と完成稿を出すこと。'
FROM threads t
WHERE NOT EXISTS (SELECT 1 FROM posts WHERE thread_id = t.id);
