# monster-ai — AI 中継（モンスタードロッパー・イベントドロッパー・予定表ドロッパー）

道は3本。OpenAI のキーと、その日の全体の上限（`DAILY_TOKEN_LIMIT`）は3本で共通。

| 道 | 受け付ける生成元 | 受け取るもの | 1人1日 |
|---|---|---|---|
| `/monster` | `ALLOWED_ORIGINS`（dropper-tools.com） | JSON（`kind`・`lang`・縮めた画像） | `PER_IP_DAILY` |
| `/monster`（`kind: 'fuse'`） | 同上 | JSON（`lang`・合体した作品のファイル名2〜3個）。画像は受け取らない | `PER_IP_DAILY`（上と同じ数に入る） |
| `/monster`（`kind: 'night'`） | 同上 | JSON（`lang`・夜の美術館の最後の部屋の精霊ごとの作品のファイル名と名前 2〜7体）。中継が作品の絵の URL を付ける | `PER_IP_DAILY`（上と同じ数に入る） |
| `/event` | `TOOL_ORIGINS`（app.dropper-tools.com） | URL に `lang`・`type`・`mime`、本文にファイル（PDF・画像）の base64 | `PER_IP_EVENT` |
| `/schedule` | `TOOL_ORIGINS` | URL に `lang`・`fy`（年度、無くてよい）・`mime`、本文に base64 | `PER_IP_SCHEDULE` |

- 合体の名づけ（2026-10-20〜）は、作品の名前・由来を `play/museum/museum.json` から引き、頼み文は `monster-i18n.js` の `fusePrompt`。
  **素材集か頼み文を直したら出し直す**
- 夜の美術館の最後の部屋のお話と曲の設計図（2026-10-25〜）は、頼み文が `night-prompt.js`。答えの形はここで確かめて、決まった言葉の外は捨てる。**直したら出し直す**
- 道具2本の頼み文は `tool-prompts.js` にある（ツールのページは頼み文を持たない）。**直したら出し直す**
- 本文は文字として読まず、バイトのまま OpenAI への頼みに挟む。だから base64 の文字以外が1つでもあれば断る（JSON に別の指示を差し込ませない）
- イベントはファイルそのものを読ませる。Google ドライブの OCR の文字は、Google の Limited Use の決まりで、学習に使われる先へ渡せないため

以下は、もとの遊び場だけだった頃の説明（今も遊び場には当てはまる）。

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

https://dropper-tools.com/play/spirit.html で AI をオンにして写真を落とし、AI で読み取られることを見る。

## 手元で試すとき

`.dev.vars`（コミットしない）に `OPENAI_API_KEY`・`IP_SALT` と、模擬サーバーを使うなら `OPENAI_URL`・
`ALLOWED_ORIGINS=http://localhost:8767` を書いて `npx wrangler dev --local`。
