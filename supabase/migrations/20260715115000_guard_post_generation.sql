-- 並行リクエストのうち1件だけにレス生成権を与える

ALTER TABLE public.threads
  ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS generation_claim_id UUID;

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

  IF latest_post.post_number >= 300 THEN
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
  input_content TEXT
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

  IF next_post_number > 300 THEN
    RAISE EXCEPTION 'Thread is already complete';
  END IF;

  following_model := CASE input_model
    WHEN 'gpt' THEN 'gemini'
    WHEN 'gemini' THEN 'gpt_hothead'
    WHEN 'gpt_hothead' THEN 'gemini_sarcastic'
    WHEN 'gemini_sarcastic' THEN 'gpt'
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
    content
  )
  VALUES (
    active_thread.id,
    next_post_number,
    input_model,
    input_display_name,
    input_content
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

CREATE OR REPLACE FUNCTION public.release_post_generation(
  input_thread_id UUID,
  input_claim_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  released_count INTEGER;
BEGIN
  UPDATE public.threads
  SET
    generation_started_at = NULL,
    generation_claim_id = NULL
  WHERE id = input_thread_id
    AND generation_claim_id = input_claim_id;

  GET DIAGNOSTICS released_count = ROW_COUNT;
  RETURN released_count > 0;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_post_generation(INTEGER)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_post_generation(UUID, UUID)
  FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.claim_post_generation(INTEGER)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.release_post_generation(UUID, UUID)
  TO service_role;
