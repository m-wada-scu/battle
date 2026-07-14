-- GPT / Gemini が2ペルソナずつ担当する4人ローテーションへ移行
-- Supabase Dashboard → SQL Editor → New query → 全文コピペ → Run

BEGIN;

ALTER TABLE threads DROP CONSTRAINT IF EXISTS threads_next_model_check;
ALTER TABLE threads ADD CONSTRAINT threads_next_model_check
  CHECK (next_model IN ('gpt', 'gemini', 'gpt_hothead', 'gemini_sarcastic'));

ALTER TABLE posts DROP CONSTRAINT IF EXISTS posts_model_check;
ALTER TABLE posts ADD CONSTRAINT posts_model_check
  CHECK (model IN ('op', 'gpt', 'gemini', 'gpt_hothead', 'gemini_sarcastic'));

UPDATE threads
SET
  topic = REPLACE(
    topic,
    'GPTとGeminiが交互に官能表現を研究する。',
    '官能文学GPT、心理描写Gemini、演出研究GPT、境界探究Geminiの4人が順番に官能表現を研究する。'
  ),
  updated_at = NOW()
WHERE is_active = true;

COMMIT;
