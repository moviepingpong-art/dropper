-- その日の使用量。day は UTC の日付（OpenAI の無料枠が UTC の0時にリセットされるため）
-- k = 'tokens'（全体で使ったトークン）か 'ip:…'（接続元を切り詰めて混ぜた印ごとの枚数）
CREATE TABLE IF NOT EXISTS counts (
  day TEXT NOT NULL,
  k TEXT NOT NULL,
  n INTEGER NOT NULL,
  PRIMARY KEY (day, k)
);
