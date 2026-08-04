# dropper — ドロッパー周知サイト

GitHub Pages で公開している静的サイト。公開URL: https://dropper-tools.com/

## 2層構造（重要）

- `src/` は**配信されない材料**。`build.py` + `template.html` / `guide-template.html` /
  `guide-schedule-template.html` / `privacy-template.html` / `apikey-template.html`
  + `i18n/{ja,en,in}.json`
- `python3 src/build.py` を実行すると、直下と `en/` `in/` に
  `index.html` / `guide.html` / `guide-schedule.html` / `privacy.html` / `apikey.html`
  の5ページ×3言語（計15ページ）が生成される。
- **GitHub Actions等の自動ビルドは無い。** `src/` を直しただけでは公開ページは変わらない。
  必ず `build.py` を実行し、**生成HTMLも一緒にコミットする**。

## 文言の追加・変更

- 文言はすべて `src/i18n/{ja,en,in}.json`。テンプレートに直書きしない。
- キーを足すときは **3言語すべてに同じキー**を足す（1つでも欠けると `{{...}}` が未置換で残る）。
- ビルド後の検証: 生成HTMLに `{{` が残っていないか grep する。

## シリーズカードの図（`.tool-fig`）

2026-08-04 追加。トップの「ドロッパーシリーズ」3枚のカードに、
**1枚から何が、いくつ出てくるか**を描いた図を入れてある。**ツール本体の `#tools-modal` と同じ考え方**
（あちらは `app.dropper-tools.com` 側）。文言・図の意味は両者でそろえること。

- **SVG ではなく HTML＋CSS で組む。** ラベルが普通のテキストなので辞書（`toolN.figN` / `tool3.binN`）が
  そのまま効き、英語で文字幅が伸びても折り返せる。SVG の `<text>` だと英語で溢れる。
- **配色はこのサイトの青系**（`--primary` 系）。ツール本体はティール系なので、**そのまま持ち込まない**。
- 図の要点: イベント＝マスが1つだけ光る／予定表＝マスが多数＋間に「一覧で確認」／
  決めごと＝仕分け箱4つが主役。**この差が3本の違いのすべて**なので、崩さないこと。
- **カードが1列になる幅（760px以下）では折り返す**（`flex-wrap:wrap`）。
  ツール本体は横スクロールにしているが、周知サイトは流し読みされるため切れて見えるほうが害が大きい。
- ツール1・3の図は `template.html` に、**ツール2の図は `build.py` の `build_tool2_card()` の中**にある
  （カードごと生成関数が持っているため）。**3枚まとめて直すこと。**
- CSSコメントに `{{...}}` を書かないこと。ビルド後の `grep "{{"` が0件にならず、検証が効かなくなる。

## APIキー案内ページ（`apikey.html`）

APIキー入力のハードルを下げるための専用ページ。**ツール本体のポップアップ2か所からここへ送っている**
（`app.dropper-tools.com` 側の `i18n.js` / `schedule-i18n.js` が言語別に href を張り替える）。

- **ファイル名・場所を変えない。** 変えるとツール本体からのリンクが404になる（別リポジトリなので気づきにくい）。
- 順番に意味がある: 帯で「クレカ不要・3分・0円」→ 何ができるか → お金の心配がいらない理由 →
  キーの保存先（表）→ 3ステップ → よくある不安。**キーの取り方より先に、お金と保存先の不安を消す**。
- 手順セクションの `id="steps"` は `build.py` の `HOWTO_PAGES` が HowTo 構造化データの
  リンク先に使う。id を変えるなら `HOWTO_PAGES` も直す。
- ページを増やしたら **`sitemap.xml` にも3言語分を足す**（`build.py` の生成対象外）。

## SEO関連（構築済み・壊さない）

- `robots.txt` と `sitemap.xml` は **`build.py` の生成対象外の静的ファイル**。直下に置いてある。消さない。
- `build.py` の `build_seo_head()` が各ページに canonical / OGP / Twitterカード / 構造化データを出力する。
  - トップ: `WebApplication` の JSON-LD
  - ガイド: `HowTo` の JSON-LD（`guide.st1〜st4title/body` から4ステップを生成）
- OG画像: `assets/og/og-{ja,en,in}.png`（1200×630）。パスを変えるなら `build_seo_head()` も直す。
- hreflang は `ja` / `en` / `en-IN` / `x-default=ja`。`sitemap.xml` と揃える。
- Search Console に sitemap 送信済み。

## GitHub Pages と `.nojekyll`（重要・消さない）

- 直下に **`.nojekyll`**（空ファイル）を置いてある。**削除しないこと。**
- GitHub Pages はデフォルトで **Jekyll** が走る。このサイトは `build.py` が生成する
  **純粋な静的HTML**なので Jekyll は不要。`.nojekyll` があると Jekyll 処理が
  完全にスキップされ、ファイルがそのまま配信される。
- これが無いと、`CLAUDE.md` など本文に `{{...}}` を含む Markdown を Jekyll が
  **Liquid構文と誤認**して `pages build and deployment` が失敗する（実際に失敗した）。
  ビルドが失敗すると deploy が skip され、公開ページが更新されなくなる。

---

# ⚠️ 絶対に変更してはいけないもの（Google OAuth審査）

2026-07-19 に `calendar.events`（機密スコープ）の本番審査に**承認済み**。
このサイトは**審査でGoogleに登録したホームページとプライバシーポリシーの実体**なので、
以下を壊すと承認済みの状態が無効になり得る。

## 1. `CNAME` を削除・変更しない

中身は `dropper-tools.com`。これが消えると独自ドメインが切れ、Googleに登録済みの
ホームページURL・プライバシーポリシーURLが**404になる**。

## 2. プライバシーポリシーのURLを変えない

Googleに `https://dropper-tools.com/privacy.html` で登録済み。
**ファイル名・場所・生成先を変更しない。**（内容の更新は同URLのままなら再審査不要）

## 3. プライバシーポリシーの必須3セクションを削除しない

審査の差し戻し指摘に対応して追加したもの。消すと指摘が再燃する。

- **5. データの共有**（共有・移転・第三者提供の有無）
- **6. データの保護**（HTTPS・サーバー非保有・localStorage）
- **7. データの保持**（保持しない＋削除方法）

## 4. アプリ名・ホームページURLの表記を同意画面と食い違わせない

登録済み: アプリ名「ドロッパー」／ホームページ `https://dropper-tools.com`

## 5. Search Console の所有権確認TXTを削除しない

※リポジトリ外（Cloudflare DNS）だが、消えるとドメイン所有権の確認が外れる。
OAuthのドメイン検証にも必要。

---

# 主要な定数・ID

- GA4 測定ID: `G-PQPKYYYXKG`

---

# 進め方（ユーザーの好み）

- **一気に全部やらず、区切りごとに確認を取る。**
- `src/` を直したら **必ず `build.py` を実行**し、生成HTMLも一緒に渡す／コミットする。
- 変更したら、**確認URLと確認ポイント**をセットで伝える。
