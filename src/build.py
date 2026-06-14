#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ドロッパー DROPPER  -  多言語サイト ビルドスクリプト
------------------------------------------------------------
1つの src/template.html と src/i18n/*.json から、
言語ごとの静的HTML（日本語/英語/インド向け）を生成します。

  src/template.html   … 共通の見た目（{{key}} が差し替え対象）
  src/i18n/ja.json    … 日本語（本文の元データ。空欄キーのフォールバック先）
  src/i18n/en.json    … 英語（後で記入。空欄は日本語にフォールバック）
  src/i18n/in.json    … インド向け Hinglish（同上）

出力:
  index.html          … 日本語版          (hreflang=ja)
  en/index.html       … 英語版            (hreflang=en)
  in/index.html       … インド向けHinglish (hreflang=en-IN)

使い方:  python3 src/build.py
"""

import json
import pathlib

# === 設定 =================================================================
# ▼ GitHub Pages の公開URL（末尾スラッシュなし）に置き換えてください。
#   例: "https://your-name.github.io/toolbox"  または独自ドメイン
SITE_URL = "https://moviepingpong-art.github.io/dropper"
# =========================================================================

# 言語定義: code -> (html lang属性, 出力サブフォルダ, hreflang値, 表示ラベルキー)
LANGS = {
    "ja": {"htmllang": "ja",    "dir": "",   "hreflang": "ja"},
    "en": {"htmllang": "en",    "dir": "en", "hreflang": "en"},
    "in": {"htmllang": "en-IN", "dir": "in", "hreflang": "en-IN"},
}

# 言語切替リンクの相対パス（現在ページ -> 各言語ページ）
SWITCH_PATHS = {
    "ja": {"ja": "./",  "en": "./en/", "in": "./in/"},
    "en": {"ja": "../", "en": "./",    "in": "../in/"},
    "in": {"ja": "../", "en": "../en/", "in": "./"},
}

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent  # リポジトリ直下に出力

def load_dict(code):
    return json.loads((SRC / "i18n" / f"{code}.json").read_text(encoding="utf-8"))

def build_hreflang():
    lines = []
    for meta in LANGS.values():
        sub = (meta["dir"] + "/") if meta["dir"] else ""
        lines.append(f'<link rel="alternate" hreflang="{meta["hreflang"]}" href="{SITE_URL}/{sub}">')
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{SITE_URL}/">')
    return "\n".join(lines)

def build_switcher(current, strings):
    parts = []
    for i, code in enumerate(LANGS):
        if i > 0:
            parts.append('<span class="sep">/</span>')
        label = strings.get(f"ui.lang.{code}") or code
        active = " active" if code == current else ""
        href = SWITCH_PATHS[current][code]
        parts.append(f'<a href="{href}" class="lang-link{active}" hreflang="{LANGS[code]["hreflang"]}">{label}</a>')
    return "".join(parts)

def render(template, code, ja, langdict, hreflang):
    # 空欄や未定義キーは日本語にフォールバック
    strings = {k: (langdict.get(k) or ja.get(k, "")) for k in ja}
    # ラベルは現在言語に無ければ ja を使う（上の処理で対応済み）
    html = template
    html = html.replace("{{LANG}}", LANGS[code]["htmllang"])
    html = html.replace("{{HREFLANG}}", hreflang)
    html = html.replace("{{SWITCHER}}", build_switcher(code, strings))
    for key, value in strings.items():
        html = html.replace("{{" + key + "}}", value)
    return html

def main():
    template = (SRC / "template.html").read_text(encoding="utf-8")
    ja = load_dict("ja")
    hreflang = build_hreflang()
    for code, meta in LANGS.items():
        langdict = load_dict(code)
        html = render(template, code, ja, langdict, hreflang)
        outdir = OUT / meta["dir"] if meta["dir"] else OUT
        outdir.mkdir(parents=True, exist_ok=True)
        (outdir / "index.html").write_text(html, encoding="utf-8")
        rel = (meta["dir"] + "/" if meta["dir"] else "") + "index.html"
        print(f"  generated  {rel}  ({meta['hreflang']})")
    if "YOUR-NAME" in SITE_URL:
        print("\n  ⚠ SITE_URL がまだ仮の値です。公開URLに置き換えてください（hreflang用）。")

if __name__ == "__main__":
    print("Building DROPPER site...")
    main()
    print("Done.")
