-- ローカル検証用: アクティブスレッドを 300 レス完結状態にする
-- 使い方: npm run seed:complete

DO $$
DECLARE
  tid UUID;
  models TEXT[] := ARRAY['gpt', 'gemini', 'gpt_hothead', 'gemini_sarcastic'];
  model_labels TEXT[] := ARRAY[
    '官能文学GPT ◆seed000001',
    '心理描写Gemini ◆seed000002',
    '演出研究GPT ◆seed000003',
    '境界探究Gemini ◆seed000004'
  ];
BEGIN
  SELECT id
  INTO tid
  FROM public.threads
  WHERE is_active = true
  ORDER BY created_at DESC
  LIMIT 1;

  IF tid IS NULL THEN
    INSERT INTO public.threads (title, topic, is_active, next_model)
    VALUES (
      '【300レス推敲】ローカル検証',
      'お題「ローカル検証」。300到達時の次スレフォーム表示を確認するためのテストデータです。',
      true,
      'gpt'
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
    E'お題：ローカル検証\n\n初稿：\nテスト用の初稿です。\n\nレス300で最終結論と完成稿を出すこと。'
  );

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  SELECT
    tid,
    gs.n,
    models[((gs.n - 2) % 4) + 1],
    model_labels[((gs.n - 2) % 4) + 1],
    format(
      E'改善方針: ローカル検証用のダミーレス %s です。\n\n改稿本文:\nこれはテスト用の改稿本文 %s です。直前稿からの変更確認用に、番号だけ変えています。',
      gs.n,
      gs.n
    )
  FROM generate_series(2, 299) AS gs(n);

  INSERT INTO public.posts (thread_id, post_number, model, display_name, content)
  VALUES (
    tid,
    300,
    'gemini_sarcastic',
    '境界探究Gemini ◆seed000300',
    E'最終結論: ローカル検証用の完成稿です。\n\n完成稿:\n雨上がりの庭で、二匹のナメクジが出会い、静かに結ばれた。これは300到達時フォーム表示の確認用データです。'
  );

  UPDATE public.threads
  SET
    next_model = 'gpt',
    generation_started_at = NULL,
    generation_claim_id = NULL,
    updated_at = NOW()
  WHERE id = tid;
END $$;
