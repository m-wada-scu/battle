-- 完了済みスレッドから次スレッドを原子的に開始する

CREATE UNIQUE INDEX IF NOT EXISTS threads_one_active_idx
  ON public.threads ((is_active))
  WHERE is_active = true;

GRANT SELECT ON TABLE public.threads, public.posts
  TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.threads, public.posts
  TO service_role;

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

  IF latest_post_number < 300 THEN
    RAISE EXCEPTION 'The active thread is not complete';
  END IF;

  UPDATE public.threads
  SET
    is_active = false,
    updated_at = NOW()
  WHERE id = active_thread.id;

  INSERT INTO public.threads (title, topic, is_active, next_model)
  VALUES (
    '【300レス推敲】' || normalized_topic,
    'お題「' || normalized_topic || '」。>>1のお題からレス2で初稿を作り、以後は直前稿を引き継いで300レス目の完成稿へ向けて共同でブラッシュアップする。',
    true,
    'gpt'
  )
  RETURNING * INTO new_thread;

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  VALUES (
    new_thread.id,
    1,
    'op',
    '名無しさん',
    format(
      E'お題：%s\n\nこのお題からレス2で初稿を作り、以後は直前レスの全文を引き継いで一つの文章として推敲を重ねてほしい。レス300で最終結論と完成稿を出すこと。',
      normalized_topic
    )
  );

  RETURN new_thread;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.start_next_thread(TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.start_next_thread(TEXT)
  TO service_role;
