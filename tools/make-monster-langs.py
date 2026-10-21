# 遊び場（スピリットドロッパー・夜の美術館を灯す）のほかの言語版を、日本語版（play/spirit.html・play/night.html）から作る。
# 古いURLの monster.html・battle.html（6言語）は、spirit.html・night.html へ飛ばすだけのページをここで書き出す（2026-10-21）
#
#   python tools/make-monster-langs.py          … en/play/ と in/play/ に書き出す
#   python tools/make-monster-langs.py --check  … 書き出した物が最新かだけを見る（コミット前のフック）
#
# 親は日本語版。ページの中身（</head> より後ろ）は3言語で同じで、違うのは
# head（題・説明・canonical・OGP・字体）と <script>window.LANG = 'ja';</script> の1行だけ。
# 画面の言葉は monster-i18n.js の辞書が、読み込んだあとに入れ替える。
# JS（JS の表）は、どのフォルダにもバイト同一で置く。
# 夜の美術館を灯す（night.html）も同じ作り。head の差し替えは NIGHT_JA_HEAD / NIGHT_LANGS（2026-10-21〜。前は対戦の battle.html）
#
# ★ play/spirit.html・play/night.html を直したら、これを走らせる（直したのが en/ in/ の側だと、次に走らせたとき消える）
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'play'
JS = ['monster-i18n.js', 'monster-app.js', 'night-i18n.js', 'night-app.js']

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

# ---- 古いURLから新しいページへ飛ばすページ（monster.html → spirit.html、battle.html → night.html。2026-10-21） ----
def redirect_page(pre, to='spirit.html', title='Spirit Dropper'):
    url = f'https://dropper-tools.com{pre}play/{to}'
    return ('<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<meta name="robots" content="noindex">\n'
            f'<link rel="canonical" href="{url}">\n<meta http-equiv="refresh" content="0; url={to}">\n'
            f'<title>{title}</title>\n'
            f"<script>location.replace('{to}' + location.search + location.hash);</script>\n"
            '</head>\n<body style="background:#0b0d16;color:#ece6d8;font-family:sans-serif">\n'
            f'<p><a href="{to}" style="color:#e6cf9a">{title}</a></p>\n</body>\n</html>\n')

# ---- 夜の美術館を灯す（night.html、2026-10-21〜。対戦の battle.html から置きかえた） ----
# 字体は spirit.html と同じ（本文はゴシック、見出し・部屋・名前は明朝）
NIGHT_JA_HEAD = {
    'lang': '<html lang="ja">',
    'title': '<title>夜の美術館を灯す｜目録の精霊で、眠っている展示室に灯をともす｜ドロッパーの遊び場</title>',
    'desc': '<meta name="description" content="スピリットドロッパーの目録から7体の精霊をえらび、閉館後の美術館の5つの展示室に灯をともす遊び。部屋ごとに要る明るさと好む属性があり、結びのことわりで明るさが変わる。今夜の美術館は日付で決まり、だれが遊んでも同じ夜。負けはありません。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/night.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="夜の美術館を灯す｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="目録の精霊たちと、閉館後の美術館の展示室に灯をともす。だれが遊んでも同じ夜。5部屋すべて灯れば夜明け。">',
    'ogurl': '<meta property="og:url" content="https://dropper-tools.com/play/night.html">',
    'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-ja.png">',
    'langjs': "<script>window.LANG = 'ja';</script>",
    'fonts': JA_HEAD_FONTS,
}


def nhead(lang, html_lang, title, desc, locale, ogtitle, ogdesc, og, fonts=JA_HEAD_FONTS):
    h = shead(lang, html_lang, title, desc, locale, ogtitle, ogdesc, og, fonts)
    url = f'https://dropper-tools.com/{lang}/play/night.html'
    h['canonical'] = f'<link rel="canonical" href="{url}">'
    h['ogurl'] = f'<meta property="og:url" content="{url}">'
    return h


NIGHT_LANGS = {
    'en': nhead('en', 'en', 'Light the Night Museum | Light the sleeping galleries with your spirits | Dropper Playground',
                'Choose 7 spirits from your Spirit Dropper catalogue and bring light to 5 galleries of the museum after closing time. Each gallery needs a certain light and loves certain elements, and the laws of binding change the light. Tonight\'s museum is set by the date, so everyone gets the same night. There is no losing.',
                'en_US', 'Light the Night Museum | Dropper Playground', 'Bring light to the galleries of the museum after closing time with the spirits in your catalogue. Everyone gets the same night. Light all 5 to reach dawn.', 'en'),
    'in': nhead('in', 'en-IN', 'Light the Night Museum | Apne spirits se soyi galleries roshan karo | Dropper Playground',
                'Spirit Dropper catalogue se 7 spirits chuno aur band museum ki 5 galleries mein roshni jalao. Har gallery ko kuch roshni chahiye aur kuch elements pasand hain, aur bandhan ke niyam roshni badalte hain. Aaj raat ka museum date se tay hota hai, sabke liye ek hi raat. Haar nahin hoti.',
                'en_IN', 'Light the Night Museum | Dropper Playground', 'Apne catalogue ke spirits ke saath band museum ki galleries roshan karo. Sabke liye ek hi raat. Paanchon jalao to subah.', 'in'),
    'ko': nhead('ko', 'ko', '밤의 미술관을 밝히다 | 목록의 정령으로 잠든 전시실에 불을 밝히다 | 드로퍼 놀이터',
                '스피릿 드로퍼의 목록에서 정령 7체를 골라, 문 닫은 뒤의 미술관 전시실 5개에 불을 밝히는 놀이. 방마다 필요한 밝기와 좋아하는 속성이 있고, 맺음의 이치로 밝기가 바뀐다. 오늘 밤의 미술관은 날짜로 정해져 누가 놀아도 같은 밤. 패배는 없습니다.',
                'ko_KR', '밤의 미술관을 밝히다 | 드로퍼 놀이터', '목록의 정령들과 문 닫은 뒤의 미술관 전시실에 불을 밝힌다. 누가 놀아도 같은 밤. 5개 방을 모두 밝히면 새벽.', 'en',
                spirit_fonts('Noto Sans KR', 'Noto Serif KR')),
    'zh-hant': nhead('zh-hant', 'zh-Hant', '點亮夜之美術館｜用目錄裡的精靈點亮沉睡的展覽室｜Dropper 遊樂場',
                     '從 Spirit Dropper 的目錄選出 7 位精靈，點亮閉館後美術館的 5 間展覽室的遊戲。每間都有需要的亮度和喜愛的屬性，結合之理會改變亮度。今夜的美術館由日期決定，誰來玩都是同一個夜晚。沒有輸這回事。',
                     'zh_TW', '點亮夜之美術館｜Dropper 遊樂場', '和目錄裡的精靈一起，點亮閉館後美術館的展覽室。誰來玩都是同一個夜晚。5 間全亮就是黎明。', 'en',
                     spirit_fonts('Noto Sans TC', 'Noto Serif TC')),
    'vi': nhead('vi', 'vi', 'Thắp sáng bảo tàng đêm | Thắp sáng các phòng trưng bày đang ngủ bằng tinh linh | Sân chơi Dropper',
                'Chọn 7 tinh linh từ danh mục Spirit Dropper và thắp sáng 5 phòng trưng bày của bảo tàng sau giờ đóng cửa. Mỗi phòng cần một độ sáng và yêu thích một số hệ, và lẽ kết nối làm thay đổi độ sáng. Bảo tàng đêm nay được định theo ngày, ai chơi cũng cùng một đêm. Không có thua.',
                'vi_VN', 'Thắp sáng bảo tàng đêm | Sân chơi Dropper', 'Cùng tinh linh trong danh mục, thắp sáng các phòng của bảo tàng sau giờ đóng cửa. Ai chơi cũng cùng một đêm. Thắp cả 5 phòng là bình minh.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
}

PAGES = [('spirit.html', JA_HEAD, LANGS), ('night.html', NIGHT_JA_HEAD, NIGHT_LANGS)]
# 古いURL → 新しいページ（note・X に貼ったリンクが切れないように残す。中身は持たず、検索にも出さない）
REDIRECTS = [('monster.html', 'spirit.html', 'Spirit Dropper'), ('battle.html', 'night.html', 'Light the Night Museum')]


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
    for old, to, title in REDIRECTS:
        out[SRC / old] = redirect_page('/', to, title).encode('utf-8')
        for lang in LANGS:
            out[ROOT / lang / 'play' / old] = redirect_page(f'/{lang}/', to, title).encode('utf-8')
    for lang in LANGS:
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
