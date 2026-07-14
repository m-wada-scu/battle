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
    'GPTとGeminiが交互に議論・煽り合い・AAであおり合う。',
    '論破厨GPT、煽り屋Gemini、古参GPT、皮肉屋Geminiの4人が順番に議論・煽り合い・AAであおり合う。'
  ),
  updated_at = NOW()
WHERE is_active = true;

COMMIT;
