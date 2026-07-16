-- 2モデル（GPT/Gemini）交互・30レス上限・旧300レススレッド互換

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS max_posts INTEGER NOT NULL DEFAULT 30;

-- 旧300レス完結スレッドは max_posts=300 を保持
UPDATE public.threads t
SET max_posts = 300
WHERE (
  SELECT COALESCE(MAX(p.post_number), 0)
  FROM public.posts p
  WHERE p.thread_id = t.id
) >= 300;

-- 300未到達だが30超の旧スレッドは実際のレス数を上限として表示・完結扱い
UPDATE public.threads t
SET max_posts = sub.latest_post_number
FROM (
  SELECT thread_id, MAX(post_number) AS latest_post_number
  FROM public.posts
  GROUP BY thread_id
) sub
WHERE t.id = sub.thread_id
  AND sub.latest_post_number > 30
  AND sub.latest_post_number < 300;

UPDATE public.threads
SET next_model = CASE
  WHEN next_model IN ('gpt', 'gpt_hothead') THEN 'gpt'
  WHEN next_model IN ('gemini', 'gemini_sarcastic') THEN 'gemini'
  ELSE 'gpt'
END;

ALTER TABLE public.threads DROP CONSTRAINT IF EXISTS threads_next_model_check;
ALTER TABLE public.threads ADD CONSTRAINT threads_next_model_check
  CHECK (next_model IN ('gpt', 'gemini'));

-- posts.model は旧4ペルソナ値を履歴として許容
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS posts_model_check;
ALTER TABLE public.posts ADD CONSTRAINT posts_model_check
  CHECK (model IN ('op', 'gpt', 'gemini', 'gpt_hothead', 'gemini_sarcastic'));

CREATE OR REPLACE FUNCTION public.claim_post_generation(input_min_interval_ms INTEGER)
RETURNS TABLE (
  claim_id UUID,
  thread_id UUID,
  reason TEXT,
  retry_after_ms BIGINT
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  active_thread public.threads%ROWTYPE;
  latest_post public.posts%ROWTYPE;
  age_ms BIGINT;
  lease_age_ms BIGINT;
  new_claim_id UUID;
  lease_ms CONSTANT BIGINT := 10 * 60 * 1000;
BEGIN
  IF input_min_interval_ms < 0 THEN
    RAISE EXCEPTION 'Minimum interval must not be negative';
  END IF;

  SELECT *
  INTO active_thread
  FROM public.threads
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF active_thread.id IS NULL THEN
    RAISE EXCEPTION 'No active thread found';
  END IF;

  SELECT *
  INTO latest_post
  FROM public.posts
  WHERE posts.thread_id = active_thread.id
  ORDER BY post_number DESC
  LIMIT 1;

  IF latest_post.post_number >= active_thread.max_posts THEN
    RETURN QUERY SELECT NULL::UUID, active_thread.id, 'thread_complete'::TEXT, NULL::BIGINT;
    RETURN;
  END IF;

  IF active_thread.generation_started_at IS NOT NULL THEN
    lease_age_ms := FLOOR(
      EXTRACT(EPOCH FROM (clock_timestamp() - active_thread.generation_started_at)) * 1000
    )::BIGINT;

    IF lease_age_ms < lease_ms THEN
      RETURN QUERY
      SELECT
        NULL::UUID,
        active_thread.id,
        'too_soon'::TEXT,
        GREATEST(0, lease_ms - lease_age_ms);
      RETURN;
    END IF;
  END IF;

  IF latest_post.id IS NOT NULL THEN
    age_ms := FLOOR(
      EXTRACT(EPOCH FROM (clock_timestamp() - latest_post.created_at)) * 1000
    )::BIGINT;

    IF age_ms < input_min_interval_ms THEN
      RETURN QUERY
      SELECT
        NULL::UUID,
        active_thread.id,
        'too_soon'::TEXT,
        GREATEST(0, input_min_interval_ms::BIGINT - age_ms);
      RETURN;
    END IF;
  END IF;

  new_claim_id := gen_random_uuid();

  UPDATE public.threads
  SET
    generation_started_at = clock_timestamp(),
    generation_claim_id = new_claim_id
  WHERE id = active_thread.id;

  RETURN QUERY SELECT new_claim_id, active_thread.id, NULL::TEXT, NULL::BIGINT;
END;
$$;

CREATE OR REPLACE FUNCTION public.finish_post_generation(
  input_thread_id UUID,
  input_claim_id UUID,
  input_model TEXT,
  input_display_name TEXT,
  input_content TEXT,
  input_body_html TEXT,
  input_has_revision_diff BOOLEAN
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  active_thread public.threads%ROWTYPE;
  next_post_number INTEGER;
  following_model TEXT;
BEGIN
  SELECT *
  INTO active_thread
  FROM public.threads
  WHERE id = input_thread_id
    AND is_active = true
  FOR UPDATE;

  IF active_thread.id IS NULL
    OR active_thread.generation_claim_id IS DISTINCT FROM input_claim_id THEN
    RAISE EXCEPTION 'Generation claim is no longer valid';
  END IF;

  SELECT COALESCE(MAX(post_number), 0) + 1
  INTO next_post_number
  FROM public.posts
  WHERE thread_id = active_thread.id;

  IF next_post_number > active_thread.max_posts THEN
    RAISE EXCEPTION 'Thread is already complete';
  END IF;

  following_model := CASE input_model
    WHEN 'gpt' THEN 'gemini'
    WHEN 'gemini' THEN 'gpt'
    ELSE NULL
  END;

  IF following_model IS NULL THEN
    RAISE EXCEPTION 'Invalid AI model';
  END IF;

  INSERT INTO public.posts (
    thread_id,
    post_number,
    model,
    display_name,
    content,
    body_html,
    has_revision_diff
  )
  VALUES (
    active_thread.id,
    next_post_number,
    input_model,
    input_display_name,
    input_content,
    input_body_html,
    COALESCE(input_has_revision_diff, false)
  );

  UPDATE public.threads
  SET
    next_model = following_model,
    generation_started_at = NULL,
    generation_claim_id = NULL,
    updated_at = clock_timestamp()
  WHERE id = active_thread.id;

  RETURN next_post_number;
END;
$$;

CREATE OR REPLACE FUNCTION public.start_next_thread(input_topic TEXT)
RETURNS public.threads
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  normalized_topic TEXT;
  active_thread public.threads%ROWTYPE;
  new_thread public.threads%ROWTYPE;
  latest_post_number INTEGER;
BEGIN
  normalized_topic := regexp_replace(trim(input_topic), '\s+', ' ', 'g');

  IF normalized_topic IS NULL OR normalized_topic = '' THEN
    RAISE EXCEPTION 'Topic is required';
  END IF;

  IF char_length(normalized_topic) > 100 THEN
    RAISE EXCEPTION 'Topic must be 100 characters or fewer';
  END IF;

  SELECT *
  INTO active_thread
  FROM public.threads
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF active_thread.id IS NULL THEN
    RAISE EXCEPTION 'No active thread found';
  END IF;

  SELECT COALESCE(MAX(post_number), 0)
  INTO latest_post_number
  FROM public.posts
  WHERE thread_id = active_thread.id;

  IF latest_post_number < active_thread.max_posts THEN
    RAISE EXCEPTION 'The active thread is not complete';
  END IF;

  UPDATE public.threads
  SET
    is_active = false,
    updated_at = NOW()
  WHERE id = active_thread.id;

  INSERT INTO public.threads (title, topic, is_active, next_model, max_posts)
  VALUES (
    '【30レス推敲】' || normalized_topic,
    'お題「' || normalized_topic || '」。>>1のお題からレス2で初稿を作り、以後は直前稿を引き継いで30レス目の完成稿へ向けてGPTとGeminiが交互に推敲する。',
    true,
    'gpt',
    30
  )
  RETURNING * INTO new_thread;

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  VALUES (
    new_thread.id,
    1,
    'op',
    '名無しさん',
    format(
      E'お題：%s\n\nこのお題からレス2で初稿を作り、以後は直前レスの全文を引き継いで一つの文章として推敲を重ねてほしい。レス30で最終結論と完成稿を出すこと。',
      normalized_topic
    )
  );

  RETURN new_thread;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_post_generation(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_post_generation(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;
