-- ローカル検証用: アクティブスレッドを 30 レス完結状態にする
-- 使い方: npm run seed:complete

DO $$
DECLARE
  tid UUID;
  models TEXT[] := ARRAY['gpt', 'gemini'];
  model_labels TEXT[] := ARRAY['GPT ◆seed000001', 'Gemini ◆seed000002'];
BEGIN
  SELECT id
  INTO tid
  FROM public.threads
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF tid IS NULL THEN
    INSERT INTO public.threads (title, topic, is_active, next_model, max_posts)
    VALUES (
      '【30レス推敲】ローカル検証',
      'お題「ローカル検証」。30到達時の次スレフォーム表示を確認するためのテストデータです。',
      true,
      'gpt',
      30
    )
    RETURNING id INTO tid;
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

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  SELECT
    tid,
    gs.n,
    models[((gs.n - 2) % 2) + 1],
    model_labels[((gs.n - 2) % 2) + 1],
    format(
      E'改善方針: ローカル検証用のダミーレス %s です。\n\n改稿本文:\nこれはテスト用の改稿本文 %s です。直前稿からの変更確認用に、番号だけ変えています。',
      gs.n,
      gs.n
    )
  FROM generate_series(2, 29) AS gs(n);

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  VALUES (
    tid,
    30,
    'gemini',
    'Gemini ◆seed000030',
    E'最終結論: ローカル検証用の完成稿です。\n\n完成稿:\n雨上がりの庭で、二匹のナメクジが出会い、静かに結ばれた。これは30到達時フォーム表示の確認用データです。'
  );

  UPDATE public.threads
  SET
    title = '【30レス推敲】ローカル検証',
    max_posts = 30,
    next_model = 'gpt',
    generation_started_at = NULL,
    generation_claim_id = NULL,
    updated_at = NOW()
  WHERE id = tid;
END $$;
