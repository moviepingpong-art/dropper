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

## 手順2：検証

### 2-1. 9ページ生成されたか

| 場所 | ファイル |
|---|---|
| 直下 | index.html / guide.html / privacy.html |
| `en/` | index.html / guide.html / privacy.html |
| `in/` | index.html / guide.html / privacy.html |

### 2-2. 未置換プレースホルダが残っていないか

```
grep -rn "{{" index.html guide.html privacy.html en/ in/
```

**0件**であること。残っていれば `src/i18n/{ja,en,in}.json` のキー欠落。

### 2-3. その他

- 言語切替リンクの相互参照（3言語 × 3方向）
- `html lang` 属性（`ja` / `en` / `en-IN`）
- hreflang（`ja` / `en` / `en-IN` / `x-default=ja`）が `sitemap.xml` と揃っているか
- ボタンの href

## 手順3：ZIP作成

`src/` と生成HTML の両方を1つのZIPにまとめる。ユーザーはアップロード→コミットのみ。

---

## 注意

- 文言はすべて `src/i18n/{ja,en,in}.json`。**テンプレートに直書きしない**
- キーを足すときは **3言語すべてに同じキー**を足す（1つでも欠けると `{{...}}` が残る）
- 辞書の値の中にプレースホルダ（`{{...}}`）を書いても展開されない。実パスを直書きする
- `robots.txt` と `sitemap.xml` は **build.py の生成対象外の静的ファイル**。消さない
- `CNAME`（中身 `dropper-tools.com`）を削除・変更しない。消えると独自ドメインが切れ、
  Googleに登録済みのホームページ・プライバシーポリシーURLが404になる
- `privacy.html` のファイル名・場所・生成先を変更しない（OAuth審査で登録済みのURL）
