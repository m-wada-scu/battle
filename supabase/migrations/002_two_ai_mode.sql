-- 2 AI モードへ移行（001 を既に実行済みの場合に実行）
-- Supabase SQL Editor で実行してください

UPDATE threads
SET
  next_model = CASE WHEN next_model = 'anthropic' THEN 'gpt' ELSE next_model END,
  topic = REPLACE(topic, 'GPT・Gemini・Claude', 'GPT・Gemini'),
  updated_at = NOW()
WHERE next_model = 'anthropic' OR topic LIKE '%Claude%';

UPDATE posts
SET content = REPLACE(content, 'GPT → Gemini → Claude', 'GPT → Gemini')
WHERE content LIKE '%GPT → Gemini → Claude%';

ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_next_model_check;
ALTER TABLE threads ADD CONSTRAINT threads_next_model_check
  CHECK (next_model IN ('gpt', 'gemini'));

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_model_check;
ALTER TABLE posts ADD CONSTRAINT posts_model_check
  CHECK (model IN ('op', 'gpt', 'gemini'));
