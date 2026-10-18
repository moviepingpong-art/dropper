# monster-ai — モンスタードロッパーの AI 中継

来てくれた人が API キーを入れなくても、モンスタードロッパーで AI が使えるようにするための中継。
重吉さんの OpenAI キーは **Cloudflare のシークレットにだけ**置く（このリポジトリにもページにも書かない）。

- 受け取るもの：写真か人生の記録か（`kind`）・言語（`lang`）・縮めた画像（`image`）だけ
- 頼み文は `play/monster-i18n.js` の `prompt` / `lifePrompt` を、出すときに一緒に取り込む
  → **頼み文を直したら、この Worker も出し直す**（出し直さないと前の頼み文のまま）
- 画像も答えも保存しない。D1 に残すのは、その日に使ったトークン数と、接続元を切り詰めて混ぜた印ごとの枚数だけ（毎日消す）
- OpenAI の「データ提供と引き換えの毎日の無料トークン」の中だけで動かす。その日の使用量が `DAILY_TOKEN_LIMIT` に近づいたら止める

## はじめて出すとき（重吉さんの作業）

### 1. OpenAI

1. https://platform.openai.com で、遊び場専用のプロジェクトを作る
2. Billing で数ドル入れる（残高がプラスであることが無料トークンの条件。無料の枠の中なら減らない）
3. Settings → Data controls → Sharing で、入力と出力の提供をオンにする（そのプロジェクトを選ぶ）。
   「You're eligible for free daily usage on traffic shared with OpenAI」と出ることを確かめる。
   出ている1日の量（250万 か 1000万）で `wrangler.toml` の `DAILY_TOKEN_LIMIT` をその8割にする
4. Limits で、月の支払いの上限を低く（例：5ドル）しておく
5. そのプロジェクトで API キーを作る（あとで使う。ほかには貼らない）

### 2. Cloudflare（このフォルダで）

```
npx wrangler login
npx wrangler d1 create monster-ai          # 出てきた database_id を wrangler.toml に書く
npx wrangler d1 execute monster-ai --remote --file schema.sql
npx wrangler secret put OPENAI_API_KEY     # 1. で作ったキーを貼る
npx wrangler secret put IP_SALT            # 長めのでたらめな文字列を貼る（何でもよい・覚えなくてよい）
npx wrangler deploy
```

`ai.dropper-tools.com` は `wrangler deploy` が自動でつなぐ（dropper-tools.com が Cloudflare にあるため）。

### 3. 確かめる

https://dropper-tools.com/play/monster.html で AI をオンにして写真を落とし、AI で読み取られることを見る。

## 手元で試すとき

`.dev.vars`（コミットしない）に `OPENAI_API_KEY`・`IP_SALT` と、模擬サーバーを使うなら `OPENAI_URL`・
`ALLOWED_ORIGINS=http://localhost:8767` を書いて `npx wrangler dev --local`。
