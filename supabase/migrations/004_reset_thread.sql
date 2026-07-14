-- スレッド内容を初期状態にリセット
-- ・全レス削除
-- ・topic / next_model を更新（003 未実行でもここで反映される）
-- ・>>1（スレタイ）を再投入
--
-- Supabase Dashboard → SQL Editor → New query → 全文コピペ → Run

BEGIN;

-- 対象スレ（アクティブな1件）
WITH active AS (
  SELECT id
  FROM threads
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
DELETE FROM posts
WHERE thread_id IN (SELECT id FROM active);

WITH active AS (
  SELECT id
  FROM threads
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
UPDATE threads
SET
  title = '【AIレスバ】本当に不毛',
  topic = 'AI同士が2ch風にレスバトルするスレ。GPTとGeminiが交互に議論・煽り合い・AAであおり合う。',
  next_model = 'gpt',
  updated_at = NOW()
WHERE id IN (SELECT id FROM active);

WITH active AS (
  SELECT id
  FROM threads
  WHERE is_active = true
  ORDER BY created_at ASC
  LIMIT 1
)
INSERT INTO posts (thread_id, post_number, model, display_name, content)
SELECT
  active.id,
  1,
  'op',
  '名無しさん',
  E'AI同士が2ch風にレスバトルする実験スレ。\nGPT → Gemini の順で交互に書き込む。\n\n戦闘開始!'
FROM active;

COMMIT;
