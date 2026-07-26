# dropper

ドロッパーシリーズ — ファイルをドロップして使うツール集の**周知（ランディング）サイト**。

公開URL: **https://dropper-tools.com/**

スポーツイベント文書（PDF・画像）をドロップするだけで、Googleカレンダーに予定を、Googleドライブに文書を自動登録するWebツール「ドロッパー」を紹介する静的サイトです。アプリ本体は別ドメイン（`app.dropper-tools.com`）で動作し、このリポジトリは**紹介・使い方ガイド・プライバシーポリシー**を配信します。

- ホスティング: GitHub Pages（独自ドメイン `dropper-tools.com`）
- 対応言語: 日本語 / 英語 / インド向け（Hinglish）の3言語
- ページ: トップ・使い方ガイド・プライバシーポリシー（各言語で計9ページ）

---

## 2層構造（重要）

このリポジトリは「**材料**」と「**配信される生成物**」の2層に分かれています。

```
src/                        ← 材料（GitHub Pages では配信されない）
├── build.py                ← ビルドスクリプト
├── template.html           ← トップページの型
├── guide-template.html     ← 使い方ガイドの型
├── privacy-template.html   ← プライバシーポリシーの型
└── i18n/
    ├── ja.json             ← 日本語（本文の元データ。空欄キーのフォールバック先）
    ├── en.json             ← 英語
    └── in.json             ← インド向け Hinglish

index.html / guide.html / privacy.html   ← 生成物（直下＝日本語）
en/ , in/                                 ← 生成物（英語・インド向け）
```

テンプレート内の `{{key}}` が、`i18n/{ja,en,in}.json` の値に差し替えられて各言語のHTMLが生成されます。

---

## ビルド方法

`src/` を編集しただけでは公開ページは変わりません。**必ずビルドを実行**し、生成されたHTMLも一緒にコミットしてください（GitHub Actions等の自動ビルドはありません）。

```bash
python3 src/build.py
```

これで以下の9ページが生成されます。

| ページ | 日本語 | 英語 | インド向け |
|---|---|---|---|
| トップ | `index.html` | `en/index.html` | `in/index.html` |
| 使い方ガイド | `guide.html` | `en/guide.html` | `in/guide.html` |
| プライバシーポリシー | `privacy.html` | `en/privacy.html` | `in/privacy.html` |

### ビルド後の検証

生成HTMLに未置換の `{{...}}` が残っていないか確認します（キー漏れの検出）。

```bash
grep -rl "{{" index.html guide.html privacy.html en/ in/
```

何も出力されなければOKです。

---

## 文言の追加・変更

- 文言はすべて `src/i18n/{ja,en,in}.json` にあります。**テンプレートに直書きしない**でください。
- キーを足すときは **3言語すべてに同じキー**を追加します（1つでも欠けると `{{...}}` が未置換のまま残ります）。
- 英語・インド向けで値を空欄にすると、日本語（`ja.json`）にフォールバックします。

---

## デプロイ

`main` ブランチに push すると GitHub Pages が公開します（`docs/` ではなくリポジトリ直下を配信）。

- 独自ドメインは `CNAME`（`dropper-tools.com`）で設定。

### 標準的な更新フロー

```bash
python3 src/build.py                 # 1. 生成
git add -A                           # 2. src と生成HTMLを両方ステージ
git commit -m "..."                  # 3. コミット
git fetch origin && git rebase origin/main   # 4. リモート先行に備える
git push origin main                 # 5. プッシュ
```

---

## SEO

- `robots.txt` と `sitemap.xml` は `build.py` の**生成対象外の静的ファイル**です（直下に配置）。消さないでください。
- `build.py` の `build_seo_head()` が各ページに canonical / OGP / Twitterカード / 構造化データ（JSON-LD）を出力します。
  - トップ: `WebApplication`
  - ガイド: `HowTo`
- OG画像: `assets/og/og-{ja,en,in}.png`（1200×630）
- hreflang: `ja` / `en` / `en-IN` / `x-default=ja`（`sitemap.xml` と揃える）

---

## ⚠️ 変更時の注意（Google OAuth審査）

このサイトは Google の OAuth 審査で登録した**ホームページ・プライバシーポリシーの実体**です。以下を壊すと承認済みの状態が無効になり得ます。

- **`CNAME` を消さない/変えない** — 消えると登録済みURLが404になる。
- **プライバシーポリシーのURLを変えない** — `https://dropper-tools.com/privacy.html` で登録済み。ファイル名・場所・生成先を変更しない（内容の更新は同URLのままなら再審査不要）。
- **プライバシーポリシーの必須セクション（データの共有／保護／保持）を削除しない。**
- **アプリ名・ホームページURLの表記を同意画面と食い違わせない。**

詳細は [`CLAUDE.md`](CLAUDE.md) を参照してください。

---

## ディレクトリ構成

```
.
├── src/                 材料（テンプレート・i18n・build.py）
├── en/  in/             生成物（英語・インド向け）
├── assets/              画像（guide/ スクショ, og/ OG画像）
├── index.html           生成物（トップ・日本語）
├── guide.html           生成物（ガイド・日本語）
├── privacy.html         生成物（プライバシーポリシー・日本語）
├── CNAME                独自ドメイン設定
├── robots.txt           静的（生成対象外）
├── sitemap.xml          静的（生成対象外）
├── CLAUDE.md            開発者向けの詳細ルール
└── README.md            このファイル
```
