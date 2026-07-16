-- ローカル検証後: アクティブスレッドを初期状態（>>1 のみ）に戻す
-- 使い方: npm run seed:reset

DO $$
DECLARE
  tid UUID;
BEGIN
  SELECT id
  INTO tid
  FROM public.threads
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF tid IS NULL THEN
    RAISE EXCEPTION 'No active thread found';
  END IF;

  DELETE FROM public.posts WHERE thread_id = tid;

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  VALUES (
    tid,
    1,
    'op',
    '名無しさん',
    E'お題：ローカル検証\n\n初稿：\nテスト用の初稿です。\n\nレス30で最終結論と完成稿を出すこと。'
  );

  UPDATE public.threads
  SET
    max_posts = 30,
    next_model = 'gpt',
    generation_started_at = NULL,
    generation_claim_id = NULL,
    updated_at = NOW()
  WHERE id = tid;
END $$;
