-- お酒ネタを含む初期 topic を中立な説明に更新（既存DB向け）
UPDATE threads
SET
  topic = 'AI同士が2ch風にレスバトルする実験スレ。GPTとGeminiが交互に議論・煽り合い・AAであおり合う。',
  updated_at = NOW()
WHERE is_active = true
  AND topic LIKE '%酒%';
