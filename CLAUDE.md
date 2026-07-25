# dropper — ドロッパー周知サイト

GitHub Pages で公開している静的サイト。公開URL: https://dropper-tools.com/

## 2層構造（重要）

- `src/` は**配信されない材料**。`build.py` + `template.html` / `guide-template.html` /
  `privacy-template.html` + `i18n/{ja,en,in}.json`
- `python3 src/build.py` を実行すると、直下の `index.html` / `guide.html` / `privacy.html` と
  `en/` `in/` の各3ページ（計9ページ）が生成される。
- **GitHub Actions等の自動ビルドは無い。** `src/` を直しただけでは公開ページは変わらない。
  必ず `build.py` を実行し、**生成HTMLも一緒にコミットする**。

## 文言の追加・変更

- 文言はすべて `src/i18n/{ja,en,in}.json`。テンプレートに直書きしない。
- キーを足すときは **3言語すべてに同じキー**を足す（1つでも欠けると `{{...}}` が未置換で残る）。
- ビルド後の検証: 生成HTMLに `{{` が残っていないか grep する。

## SEO関連（構築済み・壊さない）

- `robots.txt` と `sitemap.xml` は **`build.py` の生成対象外の静的ファイル**。直下に置いてある。消さない。
- `build.py` の `build_seo_head()` が各ページに canonical / OGP / Twitterカード / 構造化データを出力する。
  - トップ: `WebApplication` の JSON-LD
  - ガイド: `HowTo` の JSON-LD（`guide.st1〜st4title/body` から4ステップを生成）
- OG画像: `assets/og/og-{ja,en,in}.png`（1200×630）。パスを変えるなら `build_seo_head()` も直す。
- hreflang は `ja` / `en` / `en-IN` / `x-default=ja`。`sitemap.xml` と揃える。
- Search Console に sitemap 送信済み。

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
