# 遊び場（スピリットドロッパー・対戦）のほかの言語版を、日本語版（play/spirit.html・play/battle.html）から作る。
# 古いURLの monster.html（6言語）は、spirit.html へ飛ばすだけのページをここで書き出す（2026-10-21 改名）
#
#   python tools/make-monster-langs.py          … en/play/ と in/play/ に書き出す
#   python tools/make-monster-langs.py --check  … 書き出した物が最新かだけを見る（コミット前のフック）
#
# 親は日本語版。ページの中身（</head> より後ろ）は3言語で同じで、違うのは
# head（題・説明・canonical・OGP・字体）と <script>window.LANG = 'ja';</script> の1行だけ。
# 画面の言葉は monster-i18n.js の辞書が、読み込んだあとに入れ替える。
# JS（JS の表）は、どのフォルダにもバイト同一で置く。
# 対戦のページ（battle.html）も同じ作り。head の差し替えは BATTLE_JA_HEAD / BATTLE_LANGS（2026-10-19〜）
#
# ★ play/spirit.html・play/battle.html を直したら、これを走らせる（直したのが en/ in/ の側だと、次に走らせたとき消える）
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'play'
JS = ['monster-i18n.js', 'monster-app.js', 'battle-i18n.js', 'battle-app.js']

# 字体：本文はゴシック、見出し・名前は明朝（2026-10-21〜「夜の美術館」の見た目）。韓国語・繁体字・ベトナム語は、その言語の Noto を前に置く
JA_HEAD_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap" rel="stylesheet">'
def spirit_fonts(sans, serif):
    s, f = sans.replace(' ', '+'), serif.replace(' ', '+')
    return (f'<link href="https://fonts.googleapis.com/css2?family={s}:wght@400;500;700&family={f}:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap" rel="stylesheet">\n'
            f'<style>html:root{{--serif:"{serif}","Noto Serif JP",serif}}html body{{font-family:"{sans}","Noto Sans JP",sans-serif}}</style>')

JA_HEAD = {
    'lang': '<html lang="ja">',
    'title': '<title>スピリットドロッパー｜美術館の作品に宿る精霊が目を覚ます｜ドロッパーの遊び場</title>',
    'desc': '<meta name="description" content="閉館後の美術館で、作品にひそむ精霊が目を覚ます遊び。くじで並ぶ世界の美術館の15点から、1点で目覚め、2〜3点で結び。精霊どうしの縁と受け継ぎ、1000体に1体の金の光も。自分の写真やファイルは使わず、ログインも不要です。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/spirit.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="スピリットドロッパー｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="閉館後の美術館。作品にひそむ精霊が、あなたの手で目を覚まします。目覚め・結び・縁と受け継ぎ。1000体に1体の金の光も。">',
    'ogurl': '<meta property="og:url" content="https://dropper-tools.com/play/spirit.html">',
    'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-ja.png">',
    'langjs': "<script>window.LANG = 'ja';</script>",
    'fonts': JA_HEAD_FONTS,
}


def shead(lang, html_lang, title, desc, locale, ogtitle, ogdesc, og, fonts=JA_HEAD_FONTS):
    url = f'https://dropper-tools.com/{lang}/play/spirit.html'
    return {
        'lang': f'<html lang="{html_lang}">',
        'title': f'<title>{title}</title>',
        'desc': f'<meta name="description" content="{desc}">',
        'canonical': f'<link rel="canonical" href="{url}">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': f'<meta property="og:locale" content="{locale}">',
        'ogtitle': f'<meta property="og:title" content="{ogtitle}">',
        'ogdesc': f'<meta property="og:description" content="{ogdesc}">',
        'ogurl': f'<meta property="og:url" content="{url}">',
        'ogimage': f'<meta property="og:image" content="https://dropper-tools.com/assets/og/og-{og}.png">',
        'langjs': f"<script>window.LANG = '{lang}';</script>",
        'fonts': fonts,
    }


LANGS = {
    'en': shead('en', 'en', 'Spirit Dropper | Spirits awaken from museum artworks | Dropper Playground',
                'In the museum after closing time, the spirits sleeping in the artworks awaken. Pick 1 of 15 randomly dealt artworks from museums around the world to awaken a spirit, or 2–3 to bind them. Bonds and lineage between spirits, and a 1-in-1,000 Gold Light. Your own photos and files are not used. No sign-in needed.',
                'en_US', 'Spirit Dropper | Dropper Playground', 'The museum after closing time. The spirit sleeping in an artwork awakens in your hands. Awakening, binding, bonds and lineage. A 1-in-1,000 Gold Light.', 'en'),
    'in': shead('in', 'en-IN', 'Spirit Dropper | Museum ki artworks se spirits jaagte hain | Dropper Playground',
                'Museum band hone ke baad, artworks mein soye spirits jaag uthte hain. Duniya ke museums ki random 15 artworks mein se 1 chuno to spirit jaagta hai, 2-3 chuno to bandhan. Spirits ke rishte aur virasat, aur 1,000 mein 1 Gold Light. Apni photos ya files use nahin hotin. Login nahin chahiye.',
                'en_IN', 'Spirit Dropper | Dropper Playground', 'Museum band hone ke baad. Artwork mein soya spirit aapke haath se jaagta hai. Jagna, bandhan, rishte aur virasat. 1,000 mein 1 Gold Light.', 'in'),
    'ko': shead('ko', 'ko', '스피릿 드로퍼 | 미술관 작품에 깃든 정령이 깨어난다 | 드로퍼 놀이터',
                '문 닫은 뒤의 미술관에서, 작품에 깃든 정령이 깨어나는 놀이. 제비뽑기로 놓인 세계 미술관의 15점 중 1점이면 깨어남, 2~3점이면 맺음. 정령끼리의 인연과 이어받음, 1000체에 1체인 금빛도. 내 사진이나 파일은 쓰지 않으며 로그인도 필요 없습니다.',
                'ko_KR', '스피릿 드로퍼 | 드로퍼 놀이터', '문 닫은 뒤의 미술관. 작품에 깃든 정령이 당신의 손으로 깨어납니다. 깨어남·맺음·인연과 이어받음. 1000체에 1체인 금빛도.', 'en',
                spirit_fonts('Noto Sans KR', 'Noto Serif KR')),
    'zh-hant': shead('zh-hant', 'zh-Hant', 'Spirit Dropper｜沉睡在美術館作品裡的精靈甦醒｜Dropper 遊樂場',
                     '在閉館後的美術館裡，沉睡在作品中的精靈甦醒的遊戲。從抽出的世界美術館 15 件作品中選 1 件喚醒、選 2～3 件結合。精靈之間的緣分與傳承，還有 1000 位中 1 位的金光。不使用你自己的照片或檔案，也不需要登入。',
                     'zh_TW', 'Spirit Dropper｜Dropper 遊樂場', '閉館後的美術館。沉睡在作品裡的精靈，會在你手中甦醒。甦醒・結合・緣分與傳承。1000 位中 1 位的金光。', 'en',
                     spirit_fonts('Noto Sans TC', 'Noto Serif TC')),
    'vi': shead('vi', 'vi', 'Spirit Dropper | Tinh linh thức tỉnh từ tác phẩm bảo tàng | Sân chơi Dropper',
                'Trong bảo tàng sau giờ đóng cửa, tinh linh ngủ trong các tác phẩm thức tỉnh. Chọn 1 trong 15 tác phẩm bốc thăm từ các bảo tàng thế giới để đánh thức, hoặc 2–3 để kết nối. Nhân duyên và kế thừa giữa các tinh linh, và Ánh Vàng 1 trên 1.000. Ảnh và tệp của bạn không được dùng. Không cần đăng nhập.',
                'vi_VN', 'Spirit Dropper | Sân chơi Dropper', 'Bảo tàng sau giờ đóng cửa. Tinh linh ngủ trong tác phẩm thức tỉnh trong tay bạn. Thức tỉnh, kết nối, nhân duyên và kế thừa. Ánh Vàng 1 trên 1.000.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
}

# ---- 古いURL（monster.html）から spirit.html へ飛ばすページ（2026-10-21 改名） ----
# note・X に貼ったリンクが切れないように残す。中身は何も持たず、検索にも出さない
def redirect_page(pre):
    url = f'https://dropper-tools.com{pre}play/spirit.html'
    return ('<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="robots" content="noindex">\n'
            f'<link rel="canonical" href="{url}">\n<meta http-equiv="refresh" content="0; url=spirit.html">\n'
            '<title>Spirit Dropper</title>\n'
            "<script>location.replace('spirit.html' + location.search + location.hash);</script>\n"
            '</head>\n<body style="background:#0b0d16;color:#ece6d8;font-family:sans-serif">\n'
            '<p><a href="spirit.html" style="color:#e6cf9a">Spirit Dropper</a></p>\n</body>\n</html>\n')

# ---- モンスター対戦（battle.html） ----
# 字体：見出しの Dela Gothic One と本文の M PLUS Rounded 1c は日本語と英字だけ。ほかの言語は Noto を前に置く（:root の変数を上書き）
BATTLE_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@500;800&family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">'
def battle_fonts(fam, css):
    return (f'<link href="https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=M+PLUS+Rounded+1c:wght@500;800&family={fam}:wght@400;700;900&family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">\n'
            f"<style>:root{{--display:'Dela Gothic One','{css}',sans-serif;--body:'{css}','M PLUS Rounded 1c',sans-serif}}</style>")

BATTLE_JA_HEAD = {
    'lang': '<html lang="ja">',
    'title': '<title>モンスター対戦｜図鑑のモンスターで1対1の勝負｜ドロッパーの遊び場</title>',
    'desc': '<meta name="description" content="モンスタードロッパーの図鑑から7枚をえらんで、1対1で勝負する遊び。1〜3枚を伏せて同時に出し、合体の法則で強さが変わる。先に3回勝ったほうの勝ち。カードの中身はブラウザの中だけで読みます。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/battle.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="モンスター対戦｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="図鑑のモンスターで1対1の勝負。1〜3枚を伏せて同時に出す。先に3回勝ったほうの勝ち。">',
    'ogurl': '<meta property="og:url" content="https://dropper-tools.com/play/battle.html">',
    'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-ja.png">',
    'langjs': "<script>window.LANG = 'ja';</script>",
    'fonts': BATTLE_FONTS,
}


def bhead(lang, html_lang, title, desc, locale, ogtitle, ogdesc, og, fonts=BATTLE_FONTS, site='Dropper'):
    url = f'https://dropper-tools.com/{lang}/play/battle.html'
    return {
        'lang': f'<html lang="{html_lang}">',
        'title': f'<title>{title}</title>',
        'desc': f'<meta name="description" content="{desc}">',
        'canonical': f'<link rel="canonical" href="{url}">',
        'site': f'<meta property="og:site_name" content="{site}">',
        'locale': f'<meta property="og:locale" content="{locale}">',
        'ogtitle': f'<meta property="og:title" content="{ogtitle}">',
        'ogdesc': f'<meta property="og:description" content="{ogdesc}">',
        'ogurl': f'<meta property="og:url" content="{url}">',
        'ogimage': f'<meta property="og:image" content="https://dropper-tools.com/assets/og/og-{og}.png">',
        'langjs': f"<script>window.LANG = '{lang}';</script>",
        'fonts': fonts,
    }


BATTLE_LANGS = {
    'en': bhead('en', 'en', 'Monster Battle | One-on-one with the monsters in your collection | Dropper Playground',
                'Pick 7 cards from your Monster Dropper collection and battle one-on-one. Play 1 to 3 cards face down at the same time, and the fusion rules change their strength. First to win 3 rounds wins. Your cards are read only inside your browser.',
                'en_US', 'Monster Battle | Dropper Playground', 'One-on-one with the monsters in your collection. Play 1 to 3 cards face down at the same time. First to 3 wins.', 'en'),
    'in': bhead('in', 'en-IN', 'Monster Battle | Apne collection ke monsters se one-on-one muqabla | Dropper Playground',
                'Monster Dropper collection se 7 cards chuno aur one-on-one battle karo. 1 se 3 cards face down ek saath khelo, fusion rules se strength badalti hai. Pehle 3 round jeetne wala jeetta hai. Cards sirf aapke browser mein padhe jaate hain.',
                'en_IN', 'Monster Battle | Dropper Playground', 'Apne collection ke monsters se one-on-one muqabla. 1 se 3 cards face down ek saath. Pehle 3 jeeto.', 'in'),
    'ko': bhead('ko', 'ko', '몬스터 대전 | 도감의 몬스터로 1대1 승부 | 드로퍼 놀이터',
                '몬스터 드로퍼의 도감에서 7장을 골라 1대1로 승부하는 놀이. 1~3장을 엎어서 동시에 내고, 합체의 법칙으로 강함이 바뀐다. 먼저 3번 이긴 쪽이 승리. 카드 내용은 브라우저 안에서만 읽습니다.',
                'ko_KR', '몬스터 대전 | 드로퍼 놀이터', '도감의 몬스터로 1대1 승부. 1~3장을 엎어서 동시에 낸다. 먼저 3번 이긴 쪽이 승리.', 'en',
                battle_fonts('Noto+Sans+KR', 'Noto Sans KR')),
    'zh-hant': bhead('zh-hant', 'zh-Hant', '怪獸對戰｜用圖鑑裡的怪獸一對一較量｜Dropper 遊樂場',
                     '從 Monster Dropper 的圖鑑選出 7 張，一對一較量的遊戲。蓋上 1～3 張同時出牌，合體法則會改變強度。先贏 3 回合的一方獲勝。卡片內容只在瀏覽器裡讀取。',
                     'zh_TW', '怪獸對戰｜Dropper 遊樂場', '用圖鑑裡的怪獸一對一較量。蓋上 1～3 張同時出牌。先贏 3 回合的一方獲勝。', 'en',
                     battle_fonts('Noto+Sans+TC', 'Noto Sans TC')),
    'vi': bhead('vi', 'vi', 'Đấu quái vật | Đấu tay đôi bằng quái vật trong bộ sưu tập | Sân chơi Dropper',
                'Chọn 7 thẻ từ bộ sưu tập Monster Dropper và đấu tay đôi. Úp 1–3 thẻ rồi ra cùng lúc, quy tắc hợp thể làm thay đổi độ mạnh. Ai thắng 3 lượt trước sẽ thắng. Thẻ chỉ được đọc trong trình duyệt.',
                'vi_VN', 'Đấu quái vật | Sân chơi Dropper', 'Đấu tay đôi bằng quái vật trong bộ sưu tập. Úp 1–3 thẻ và ra cùng lúc. Ai thắng 3 lượt trước sẽ thắng.', 'en',
                battle_fonts('Noto+Sans', 'Noto Sans')),
}

PAGES = [('spirit.html', JA_HEAD, LANGS), ('battle.html', BATTLE_JA_HEAD, BATTLE_LANGS)]


def build():
    out = {}
    for name, ja_head, langs in PAGES:
        ja = (SRC / name).read_text(encoding='utf-8')
        for k, v in ja_head.items():
            assert ja.count(v) == 1, f'play/{name} に {k} の行が1つだけ無い（{name} の JA の head の表も直す）'
        assert set(langs) == set(LANGS), f'{name} の言語が spirit.html とそろっていない'
        for lang, head in langs.items():
            s = ja
            for k, v in ja_head.items():
                s = s.replace(v, head[k])
            out[ROOT / lang / 'play' / name] = s.encode('utf-8')
    out[SRC / 'monster.html'] = redirect_page('/').encode('utf-8')
    for lang in LANGS:
        out[ROOT / lang / 'play' / 'monster.html'] = redirect_page(f'/{lang}/').encode('utf-8')
        for f in JS:
            out[ROOT / lang / 'play' / f] = (SRC / f).read_bytes()
    return out


def main():
    out = build()
    if '--check' in sys.argv:
        # 改行の違い（Windows の core.autocrlf=true で取り出すと CRLF になる）は見ない。
        # git が保存する中身は LF なので、ここで食い違いと見ると Windows でコミットのたびに止まる
        lf = lambda b: b.replace(b'\r\n', b'\n')
        stale = [p for p, b in out.items() if not p.exists() or lf(p.read_bytes()) != lf(b)]
        for p in stale:
            print('  ' + p.relative_to(ROOT).as_posix())
        sys.exit(1 if stale else 0)
    for p, b in out.items():
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(b)


main()
