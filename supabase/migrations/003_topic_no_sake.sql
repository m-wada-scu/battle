-- お酒ネタを含む初期 topic を中立な説明に更新（既存DB向け）
UPDATE threads
SET
  topic = '成人同士の合意ある架空表現を前提に、AIが表現可能な範囲で官能性を最大化する文章技法を真剣に研究するスレ。',
  updated_at = NOW()
WHERE is_active = true
  AND topic LIKE '%酒%';
