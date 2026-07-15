-- 投稿表示HTMLをDBに保存し、フロントの初回計算を省略する

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS body_html TEXT,
  ADD COLUMN IF NOT EXISTS has_revision_diff BOOLEAN NOT NULL DEFAULT false;

DROP FUNCTION IF EXISTS public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT);

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

REVOKE EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finish_post_generation(UUID, UUID, TEXT, TEXT, TEXT, TEXT, BOOLEAN)
  TO service_role;
