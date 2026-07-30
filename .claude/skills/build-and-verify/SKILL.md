---
name: build-and-verify
description: dropper（周知サイト）のbuild.py実行とビルド後の検証。src/以下のテンプレートやi18n辞書を修正した後に必ず使う。src/を直しただけでは公開ページは変わらない。
---

# dropper 周知サイト ビルド＆検証

## 前提（最重要）

- `src/` は**配信されない材料**。GitHub Pages が配信するのは**リポジトリ直下**のHTML
- **GitHub Actions等の自動ビルドは無い。** `build.py` を実行し、生成HTMLも一緒にコミットする
- ユーザーには **src/ と生成HTML の両方を入れたZIP** を渡す

## 手順1：ビルド

```
python3 src/build.py
```

**Windows（PowerShell）では `python3` は無い。`python src/build.py` を使う。**

## 手順2：検証

### 2-1. 15ページ生成されたか（5ページ × 3言語）

| 場所 | ファイル |
|---|---|
| 直下 | index.html / guide.html / guide-schedule.html / privacy.html / apikey.html |
| `en/` | 同じ5ファイル |
| `in/` | 同じ5ファイル |

ページを増やすときは `build.py` の `PAGES` に足す。ここの表も更新する。

### 2-2. 未置換プレースホルダが残っていないか

```
grep -rn "{{" index.html guide.html guide-schedule.html privacy.html apikey.html en/ in/
```

**0件**であること。残っていれば `src/i18n/{ja,en,in}.json` のキー欠落。

### 2-3. 生成HTMLがコミット済みのものと一致するか

ビルド直後に `git status` を見る。**`src/` を直していないのに生成HTMLに差分が出る**場合、
誰かが生成HTMLを直接編集した（＝次のビルドで消える）か、ビルドし忘れのコミットがある。

逆に、他マシン（スマホ等）から来たコミットを検証するときは、
ビルドして `git status` が**空**なら「正しくビルド済み」と確認できる。

### 2-4. その他

- 言語切替リンクの相互参照（3言語 × 3方向）
- `html lang` 属性（`ja` / `en` / `en-IN`）
- hreflang（`ja` / `en` / `en-IN` / `x-default=ja`）が `sitemap.xml` と揃っているか
- ボタンの href
- `CNAME` / `.nojekyll` が残っているか
- `privacy.html` の必須3セクション（5. データの共有 / 6. データの保護 / 7. データの保持）が残っているか

## 手順3：ZIP作成

`src/` と生成HTML の両方を1つのZIPにまとめる。ユーザーはアップロード→コミットのみ。

---

## 注意

- 文言はすべて `src/i18n/{ja,en,in}.json`。**テンプレートに直書きしない**
- キーを足すときは **3言語すべてに同じキー**を足す（1つでも欠けると `{{...}}` が残る）
- 辞書の値の中にプレースホルダ（`{{...}}`）を書いても展開されない。実パスを直書きする
- `robots.txt` と `sitemap.xml` は **build.py の生成対象外の静的ファイル**。消さない。
  **ページを増やしたら `sitemap.xml` に3言語分を手で足す**（hreflang 4種も揃える）
- `apikey.html` は**ツール本体（`app.dropper-tools.com`）のポップアップからリンクされている**。
  ファイル名・場所を変えると別リポジトリ側が404になる。`id="steps"` は `build.py` の
  `HOWTO_PAGES` が HowTo 構造化データのリンク先に使う
- `CNAME`（中身 `dropper-tools.com`）を削除・変更しない。消えると独自ドメインが切れ、
  Googleに登録済みのホームページ・プライバシーポリシーURLが404になる
- `privacy.html` のファイル名・場所・生成先を変更しない（OAuth審査で登録済みのURL）
