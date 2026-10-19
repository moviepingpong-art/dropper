# 遊び場（モンスタードロッパー・モンスター対戦）のほかの言語版を、日本語版（play/monster.html・play/battle.html）から作る。
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
# ★ play/monster.html・play/battle.html を直したら、これを走らせる（直したのが en/ in/ の側だと、次に走らせたとき消える）
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'play'
JS = ['monster-i18n.js', 'monster-app.js', 'battle-i18n.js', 'battle-app.js']

JA_HEAD_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">'

JA_HEAD = {
    'lang': '<html lang="ja">',
    'title': '<title>モンスタードロッパー｜写真からモンスターのカードが生まれる｜ドロッパーの遊び場</title>',
    'desc': '<meta name="description" content="写真をドロップすると、世界に1枚だけのモンスターのカードが生まれる遊び。2〜3枚で合体、男性カードと女性カードで結婚と子ども。1000枚に1枚のゴールドも。写真はブラウザの中だけで処理し、ログインも不要です。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/monster.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="モンスタードロッパー｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="写真をドロップすると、世界に1枚だけのモンスターのカードが生まれる。合体・結婚・子ども。1000枚に1枚のゴールドも。">',
    'ogurl': '<meta property="og:url" content="https://dropper-tools.com/play/monster.html">',
    'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-ja.png">',
    'langjs': "<script>window.LANG = 'ja';</script>",
    'fonts': JA_HEAD_FONTS,
}

LANGS = {
    'en': {
        'lang': '<html lang="en">',
        'title': '<title>Monster Dropper | A monster card is born from your photo | Dropper Playground</title>',
        'desc': '<meta name="description" content="Drop a photo and a one-of-a-kind monster card is born. Fuse 2 or 3 at once, marry a male and a female card to have children, and look for 1-in-1,000 gold cards. Photos are processed only inside your browser. No sign-in needed.">',
        'canonical': '<link rel="canonical" href="https://dropper-tools.com/en/play/monster.html">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': '<meta property="og:locale" content="en_US">',
        'ogtitle': '<meta property="og:title" content="Monster Dropper | Dropper Playground">',
        'ogdesc': '<meta property="og:description" content="Drop a photo and a one-of-a-kind monster card is born. Fusion, marriage and children. 1-in-1,000 gold cards.">',
        'ogurl': '<meta property="og:url" content="https://dropper-tools.com/en/play/monster.html">',
        'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-en.png">',
        'langjs': "<script>window.LANG = 'en';</script>",
        'fonts': JA_HEAD_FONTS,
    },
    'in': {
        'lang': '<html lang="en-IN">',
        'title': '<title>Monster Dropper | Photo se monster card paida hota hai | Dropper Playground</title>',
        'desc': '<meta name="description" content="Photo drop karo aur ek anokha monster card paida hota hai. 2-3 ek saath drop karo to fusion, male aur female card ki shaadi karao to bachche, aur 1,000 mein 1 gold card bhi. Photos sirf aapke browser mein process hoti hain. Login nahin chahiye.">',
        'canonical': '<link rel="canonical" href="https://dropper-tools.com/in/play/monster.html">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': '<meta property="og:locale" content="en_IN">',
        'ogtitle': '<meta property="og:title" content="Monster Dropper | Dropper Playground">',
        'ogdesc': '<meta property="og:description" content="Photo drop karo aur ek anokha monster card paida hota hai. Fusion, shaadi aur bachche. 1,000 mein 1 gold card.">',
        'ogurl': '<meta property="og:url" content="https://dropper-tools.com/in/play/monster.html">',
        'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-in.png">',
        'langjs': "<script>window.LANG = 'in';</script>",
        'fonts': JA_HEAD_FONTS,
    },
    'ko': {
        'lang': '<html lang="ko">',
        'title': '<title>몬스터 드로퍼 | 사진에서 몬스터 카드가 태어난다 | 드로퍼 놀이터</title>',
        'desc': '<meta name="description" content="사진을 드롭하면 세상에 한 장뿐인 몬스터 카드가 태어나는 놀이. 2~3장으로 합체, 남성 카드와 여성 카드로 결혼과 아이. 1000장에 1장인 골드도. 사진은 브라우저 안에서만 처리하며 로그인도 필요 없습니다.">',
        'canonical': '<link rel="canonical" href="https://dropper-tools.com/ko/play/monster.html">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': '<meta property="og:locale" content="ko_KR">',
        'ogtitle': '<meta property="og:title" content="몬스터 드로퍼 | 드로퍼 놀이터">',
        'ogdesc': '<meta property="og:description" content="사진을 드롭하면 세상에 한 장뿐인 몬스터 카드가 태어난다. 합체·결혼·아이. 1000장에 1장인 골드도.">',
        'ogurl': '<meta property="og:url" content="https://dropper-tools.com/ko/play/monster.html">',
        'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-en.png">',
        'langjs': "<script>window.LANG = 'ko';</script>",
        'fonts': '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">\n<style>body{font-family:"Noto Sans KR","Noto Sans JP",sans-serif}</style>',
    },
    'zh-hant': {
        'lang': '<html lang="zh-Hant">',
        'title': '<title>Monster Dropper｜照片會誕生怪獸卡｜Dropper 遊樂場</title>',
        'desc': '<meta name="description" content="拖放照片，就會誕生世界上獨一無二的怪獸卡。2～3 張可以合體，男性卡和女性卡可以結婚生孩子。還有 1000 張中 1 張的金卡。照片只在瀏覽器裡處理，也不需要登入。">',
        'canonical': '<link rel="canonical" href="https://dropper-tools.com/zh-hant/play/monster.html">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': '<meta property="og:locale" content="zh_TW">',
        'ogtitle': '<meta property="og:title" content="Monster Dropper｜Dropper 遊樂場">',
        'ogdesc': '<meta property="og:description" content="拖放照片，就會誕生世界上獨一無二的怪獸卡。合體・結婚・孩子。1000 張中 1 張的金卡。">',
        'ogurl': '<meta property="og:url" content="https://dropper-tools.com/zh-hant/play/monster.html">',
        'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-en.png">',
        'langjs': "<script>window.LANG = 'zh-hant';</script>",
        'fonts': '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+TC:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">\n<style>body{font-family:"Noto Sans TC","Noto Sans JP",sans-serif}</style>',
    },
    'vi': {
        'lang': '<html lang="vi">',
        'title': '<title>Monster Dropper | Thẻ quái vật ra đời từ ảnh của bạn | Sân chơi Dropper</title>',
        'desc': '<meta name="description" content="Thả một bức ảnh và một thẻ quái vật độc nhất sẽ ra đời. Hợp thể 2–3 tệp, cho thẻ nam và thẻ nữ kết hôn để có con, và săn thẻ vàng 1 trên 1.000. Ảnh chỉ được xử lý trong trình duyệt. Không cần đăng nhập.">',
        'canonical': '<link rel="canonical" href="https://dropper-tools.com/vi/play/monster.html">',
        'site': '<meta property="og:site_name" content="Dropper">',
        'locale': '<meta property="og:locale" content="vi_VN">',
        'ogtitle': '<meta property="og:title" content="Monster Dropper | Sân chơi Dropper">',
        'ogdesc': '<meta property="og:description" content="Thả một bức ảnh và một thẻ quái vật độc nhất sẽ ra đời. Hợp thể, kết hôn và con cái. Thẻ vàng 1 trên 1.000.">',
        'ogurl': '<meta property="og:url" content="https://dropper-tools.com/vi/play/monster.html">',
        'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-en.png">',
        'langjs': "<script>window.LANG = 'vi';</script>",
        'fonts': '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700;900&family=Noto+Sans+JP:wght@400;700;900&family=Oswald:wght@500;700&display=swap" rel="stylesheet">\n<style>body{font-family:"Noto Sans","Noto Sans JP",sans-serif}</style>',
    },
}

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

PAGES = [('monster.html', JA_HEAD, LANGS), ('battle.html', BATTLE_JA_HEAD, BATTLE_LANGS)]


def build():
    out = {}
    for name, ja_head, langs in PAGES:
        ja = (SRC / name).read_text(encoding='utf-8')
        for k, v in ja_head.items():
            assert ja.count(v) == 1, f'play/{name} に {k} の行が1つだけ無い（{name} の JA の head の表も直す）'
        assert set(langs) == set(LANGS), f'{name} の言語が monster.html とそろっていない'
        for lang, head in langs.items():
            s = ja
            for k, v in ja_head.items():
                s = s.replace(v, head[k])
            out[ROOT / lang / 'play' / name] = s.encode('utf-8')
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
