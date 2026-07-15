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
  title = '【300レス推敲】ナメクジの交尾',
  topic = 'お題「ナメクジの交尾」。>>1の初稿を4人のAIが必ず直前稿から引き継ぎ、300レス目の完成稿へ向けて共同でブラッシュアップする。',
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
  E'お題：ナメクジの交尾\n\n初稿：\n雨上がりの庭で、二匹のナメクジが出会った。濡れた葉の上をゆっくり進み、互いの気配を確かめるように触角を寄せる。やがて淡い月明かりの下で身を重ね、銀色の跡を残しながら静かに結ばれていった。\n\nこの初稿を直前レスから必ず引き継ぎ、別作品にせず一つの文章として推敲を重ねてほしい。レス300で最終結論と完成稿を出すこと。'
FROM active;

COMMIT;
