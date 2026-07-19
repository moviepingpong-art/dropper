#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ドロッパー DROPPER  -  多言語サイト ビルドスクリプト
------------------------------------------------------------
src/ のテンプレートと src/i18n/*.json から、
言語ごとの静的HTML（日本語/英語/インド向け）を生成します。

  src/template.html          … トップページの見た目（{{key}} が差し替え対象）
  src/privacy-template.html  … プライバシーポリシーページの見た目
  src/guide-template.html    … 使い方ガイドページの見た目
  src/i18n/ja.json           … 日本語（本文の元データ。空欄キーのフォールバック先）
  src/i18n/en.json           … 英語（空欄は日本語にフォールバック）
  src/i18n/in.json           … インド向け Hinglish（同上）

出力:
  index.html   / en/index.html   / in/index.html     … トップ
  privacy.html / en/privacy.html / in/privacy.html   … プライバシーポリシー
  guide.html                                        … 使い方ガイド（現在は日本語のみ）

ページを増やすときは PAGES に1件足すだけ。
使い方:  python3 src/build.py
"""

import json
import pathlib

# === 設定 =================================================================
# 公開URL（末尾スラッシュなし）。hreflang の生成に使う。
SITE_URL = "https://dropper-tools.com"
# =========================================================================

# 言語定義: code -> (html lang属性, 出力サブフォルダ, hreflang値)
LANGS = {
    "ja": {"htmllang": "ja",    "dir": "",   "hreflang": "ja"},
    "en": {"htmllang": "en",    "dir": "en", "hreflang": "en"},
    "in": {"htmllang": "en-IN", "dir": "in", "hreflang": "en-IN"},
}

# ===== ページ定義 =========================================================
# ページを増やすときはここに1件足す。
#   template     : src/ 配下のテンプレートファイル名
#   filename     : 出力ファイル名（各言語フォルダ内）
#   switch_paths : そのページでの言語切替リンク先（現在言語 -> 各言語の相対パス）
#   nav_prefix   : ヘッダーのトップページ内アンカーへ飛ぶための接頭辞
#                  （トップ自身は空。別ページからは index.html を明示する）
#   langs        : そのページを生成する言語（省略時は全言語）。
#                  未翻訳のページを中途半端に出さないための絞り込み。
PAGES = {
    "index": {
        "template": "template.html",
        "filename": "index.html",
        "switch_paths": {
            "ja": {"ja": "./",  "en": "./en/",  "in": "./in/"},
            "en": {"ja": "../", "en": "./",     "in": "../in/"},
            "in": {"ja": "../", "en": "../en/", "in": "./"},
        },
        "nav_prefix": "",
        # フッターからプライバシーポリシーへのリンク先（言語ごと・同じ言語のPPへ）
        "privacy_path": {"ja": "./privacy.html", "en": "./privacy.html", "in": "./privacy.html"},
        # ツールカードから使い方ガイドへのリンク先（言語ごと・同じ言語のガイドへ）
        "guide_path": {"ja": "./guide.html", "en": "./guide.html", "in": "./guide.html"},
    },
    "privacy": {
        "template": "privacy-template.html",
        "filename": "privacy.html",
        "switch_paths": {
            "ja": {"ja": "./privacy.html",  "en": "./en/privacy.html",  "in": "./in/privacy.html"},
            "en": {"ja": "../privacy.html", "en": "./privacy.html",     "in": "../in/privacy.html"},
            "in": {"ja": "../privacy.html", "en": "../en/privacy.html", "in": "./privacy.html"},
        },
        # プライバシーポリシーからトップのアンカーへ戻るリンク用
        "nav_prefix": "index.html",
        # PP自身のフッターからは自分を指す（リンクは出るが同一ページ）
        "privacy_path": {"ja": "./privacy.html", "en": "./privacy.html", "in": "./privacy.html"},
        "guide_path": {"ja": "./guide.html", "en": "./guide.html", "in": "./guide.html"},
    },
    "guide": {
        "template": "guide-template.html",
        "filename": "guide.html",
        # 3言語すべて生成（翻訳・スクショ完了済み）。画像は assets/guide/<code>/ を参照。
        "langs": ["ja", "en", "in"],
        "switch_paths": {
            "ja": {"ja": "./guide.html",  "en": "./en/guide.html",  "in": "./in/guide.html"},
            "en": {"ja": "../guide.html", "en": "./guide.html",     "in": "../in/guide.html"},
            "in": {"ja": "../guide.html", "en": "../en/guide.html", "in": "./guide.html"},
        },
        # ガイドからトップのアンカーへ戻るリンク用
        "nav_prefix": "index.html",
        "privacy_path": {"ja": "./privacy.html", "en": "./privacy.html", "in": "./privacy.html"},
        # ガイド自身を指す（現状リンクは出ないが定義は揃えておく）
        "guide_path": {"ja": "./guide.html", "en": "./guide.html", "in": "./guide.html"},
    },
}
# =========================================================================

SRC = pathlib.Path(__file__).resolve().parent
OUT = SRC.parent  # リポジトリ直下に出力


def load_dict(code):
    return json.loads((SRC / "i18n" / f"{code}.json").read_text(encoding="utf-8"))


def page_langs(page):
    """そのページを生成する言語コードの一覧（langs 未指定なら全言語）。"""
    return PAGES[page].get("langs", list(LANGS))


def build_hreflang(page):
    """そのページの各言語版を指す hreflang 群を作る。
    生成しない言語は hreflang に含めない（存在しないURLを宣言しないため）。"""
    fname = PAGES[page]["filename"]
    codes = page_langs(page)

    def href_for(meta):
        sub = (meta["dir"] + "/") if meta["dir"] else ""
        # トップページは index.html を省いてディレクトリ表記にする（従来通り）
        if page == "index":
            return f"{SITE_URL}/{sub}"
        return f"{SITE_URL}/{sub}{fname}"

    lines = [
        f'<link rel="alternate" hreflang="{LANGS[c]["hreflang"]}" href="{href_for(LANGS[c])}">'
        for c in codes
    ]
    # 1言語しか無いページに hreflang 群は不要（x-default だけ残すと不整合になる）
    if len(codes) < 2:
        return ""
    lines.append(f'<link rel="alternate" hreflang="x-default" href="{href_for(LANGS["ja"])}">')
    return "\n".join(lines)


def build_switcher(page, current, strings):
    parts = []
    paths = PAGES[page]["switch_paths"]
    for i, code in enumerate(LANGS):
        if i > 0:
            parts.append('<span class="sep">/</span>')
        label = strings.get(f"ui.lang.{code}") or code
        active = " active" if code == current else ""
        href = paths[current][code]
        parts.append(
            f'<a href="{href}" class="lang-link{active}" hreflang="{LANGS[code]["hreflang"]}">{label}</a>'
        )
    return "".join(parts)


def build_guide_btn(page, code, strings):
    """ツールカードの「使い方ガイド」ボタン。
    その言語のガイドが生成されない場合は、押せない準備中バッジにする。"""
    label = strings.get("tool1.btn2", "")
    if code in page_langs("guide"):
        href = PAGES[page]["guide_path"][code]
        return f'<a class="btn-sm line" href="{href}">{label}</a>'
    return f'<span class="btn-sm disabled">{label}</span>'


# Google Analytics (GA4) タグ。全ページの <head> 直下に入る（{{GA}} を置換）。
# dropper-tools.com と app.dropper-tools.com は同じ測定IDでクロスドメイン計測（GA側で設定済み）。
GA_TAG = """<!-- Google Analytics (GA4) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-PQPKYYYXKG"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-PQPKYYYXKG');
</script>"""


def render(template, page, code, ja, langdict, hreflang):
    # 空欄や未定義キーは日本語にフォールバック
    strings = {k: (langdict.get(k) or ja.get(k, "")) for k in ja}
    html = template
    html = html.replace("{{LANG}}", LANGS[code]["htmllang"])
    html = html.replace("{{HREFLANG}}", hreflang)
    html = html.replace("{{SWITCHER}}", build_switcher(page, code, strings))
    html = html.replace("{{NAV_PREFIX}}", PAGES[page]["nav_prefix"])
    html = html.replace("{{PRIVACY_PATH}}", PAGES[page]["privacy_path"][code])
    html = html.replace("{{GUIDE_PATH}}", PAGES[page]["guide_path"][code])
    html = html.replace("{{LANG_DIR}}", code)   # 使い方ガイドの画像は言語別フォルダ assets/guide/<code>/
    html = html.replace("{{GA}}", GA_TAG)
    html = html.replace("{{HITS_PATH}}", "" if code == "ja" else "/" + code)   # 訪問者カウンターを言語別に分ける(hits.shはパス別カウント)
    html = html.replace("{{GUIDE_BTN}}", build_guide_btn(page, code, strings))
    for key, value in strings.items():
        html = html.replace("{{" + key + "}}", value)
    return html


def main():
    ja = load_dict("ja")
    dicts = {code: load_dict(code) for code in LANGS}
    for page, cfg in PAGES.items():
        template_path = SRC / cfg["template"]
        if not template_path.exists():
            print(f"  skip       {cfg['template']} (not found)")
            continue
        template = template_path.read_text(encoding="utf-8")
        hreflang = build_hreflang(page)
        codes = page_langs(page)
        for code in codes:
            meta = LANGS[code]
            html = render(template, page, code, ja, dicts[code], hreflang)
            outdir = OUT / meta["dir"] if meta["dir"] else OUT
            outdir.mkdir(parents=True, exist_ok=True)
            (outdir / cfg["filename"]).write_text(html, encoding="utf-8")
            rel = (meta["dir"] + "/" if meta["dir"] else "") + cfg["filename"]
            print(f"  generated  {rel}  ({meta['hreflang']})")


if __name__ == "__main__":
    print("Building DROPPER site...")
    main()
    print("Done.")
