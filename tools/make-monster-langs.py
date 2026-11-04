# 遊び場（ともしびの美術館・夜の美術館を灯す）のほかの言語版を、日本語版（play/spirit.html・play/night.html）から作る。
# 古いURLの monster.html・battle.html（6言語）は、spirit.html・night.html へ飛ばすだけのページをここで書き出す（2026-10-21）
#
#   python tools/make-monster-langs.py          … en・in・ko・zh-hant・vi・nl の play/ に書き出す
#   python tools/make-monster-langs.py --check  … 書き出した物が最新かだけを見る（コミット前のフック）
#
# 親は日本語版。ページの中身（</head> より後ろ）は3言語で同じで、違うのは
# head（題・説明・canonical・OGP・字体）と <script>window.LANG = 'ja';</script> の1行だけ。
# 画面の言葉は monster-i18n.js の辞書が、読み込んだあとに入れ替える。
# JS（JS の表）は、どのフォルダにもバイト同一で置く。
# 夜の美術館を灯す（night.html）も同じ作り。head の差し替えは NIGHT_JA_HEAD / NIGHT_LANGS（2026-10-21〜。前は対戦の battle.html）
#
# ★ play/spirit.html・play/night.html を直したら、これを走らせる（直したのが en/ in/ の側だと、次に走らせたとき消える）
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'play'
JS = ['monster-i18n.js', 'monster-app.js', 'night-i18n.js', 'night-film.js', 'night-app.js']

# 字体：本文はゴシック、見出し・名前は明朝（2026-10-21〜「夜の美術館」の見た目）。韓国語・繁体字・ベトナム語・オランダ語は、その言語の Noto を前に置く
JA_HEAD_FONTS = '<link href="https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap" rel="stylesheet">'
def spirit_fonts(sans, serif):
    s, f = sans.replace(' ', '+'), serif.replace(' ', '+')
    return (f'<link href="https://fonts.googleapis.com/css2?family={s}:wght@400;500;700&family={f}:wght@500;600;700&family=Noto+Sans+JP:wght@400;500;700&family=Noto+Serif+JP:wght@500;600;700&display=swap" rel="stylesheet">\n'
            f'<style>html:root{{--serif:"{serif}","Noto Serif JP",serif}}html body{{font-family:"{sans}","Noto Sans JP",sans-serif}}</style>')

# 検索用の構造化データ（VideoGame の JSON-LD。2026-10-31〜）。説明は各言語の meta description と同じ文
def spirit_ld(lang, name, alt, desc, in_lang, currency, pub_name, pub_url):
    url = 'https://dropper-tools.com/' + ('' if lang == 'ja' else lang + '/') + 'play/spirit.html'
    q = lambda v: json.dumps(v, ensure_ascii=False)
    return ('<script type="application/ld+json">\n{\n'
            '  "@context": "https://schema.org",\n'
            '  "@type": "VideoGame",\n'
            f'  "name": {q(name)},\n'
            f'  "alternateName": {q(alt)},\n'
            f'  "url": {q(url)},\n'
            f'  "description": {q(desc)},\n'
            '  "gamePlatform": "Web browser",\n'
            '  "applicationCategory": "Game",\n'
            '  "operatingSystem": "Any",\n'
            f'  "inLanguage": {q(in_lang)},\n'
            '  "isAccessibleForFree": true,\n'
            f'  "offers": {{ "@type": "Offer", "price": "0", "priceCurrency": {q(currency)} }},\n'
            f'  "publisher": {{ "@type": "Organization", "name": {q(pub_name)}, "url": {q(pub_url)} }}\n'
            '}\n</script>')

JA_DESC = '閉館後の美術館で、作品にひそむ精霊が目を覚ます遊び。くじで並ぶ世界の美術館の15点から、1点で目覚め、2〜3点で結び。精霊を連れて夜の美術館を灯していくと、あなたの写真が金色の油絵の肖像になって光へ昇る、世界にひとつだけの動画ができます。写真は端末の中だけで描き、どこにも送りません。ログイン不要。'

JA_HEAD = {
    'lang': '<html lang="ja">',
    'title': '<title>ともしびの美術館｜閉館後、作品に宿る精霊が目を覚ます｜ドロッパーの遊び場</title>',
    'desc': '<meta name="description" content="閉館後の美術館で、作品にひそむ精霊が目を覚ます遊び。くじで並ぶ世界の美術館の15点から、1点で目覚め、2〜3点で結び。精霊を連れて夜の美術館を灯していくと、あなたの写真が金色の油絵の肖像になって光へ昇る、世界にひとつだけの動画ができます。写真は端末の中だけで描き、どこにも送りません。ログイン不要。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/spirit.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="ともしびの美術館｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="閉館後の美術館。作品にひそむ精霊が目を覚まします。夜の美術館を灯すと、あなたの写真が金色の油絵の肖像になる、世界にひとつだけの動画に。">',
    'ogurl': '<meta property="og:url" content="https://dropper-tools.com/play/spirit.html">',
    'ogimage': '<meta property="og:image" content="https://dropper-tools.com/assets/og/og-ja.png">',
    'langjs': "<script>window.LANG = 'ja';</script>",
    'fonts': JA_HEAD_FONTS,
    'ld': spirit_ld('ja', 'ともしびの美術館', 'The Lantern Museum', JA_DESC, 'ja', 'JPY', 'ドロッパー', 'https://dropper-tools.com/'),
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
    'en': shead('en', 'en', 'The Lantern Museum | Spirits awaken from the artworks after closing | Dropper Playground',
                'In the museum after closing time, the spirits sleeping in the artworks awaken. Pick 1 of 15 randomly dealt artworks from museums around the world to awaken a spirit, or 2–3 to bind them. Take your spirits to light the museum at night, and your photo rises into the light as a golden oil portrait, in a video that is the only one in the world. Your photo is painted on your device only and sent nowhere. No sign-in needed.',
                'en_US', 'The Lantern Museum | Dropper Playground', 'The museum after closing time. The spirits in the artworks awaken. Light the museum at night, and your photo becomes a golden oil portrait in a video that is the only one in the world.', 'en'),
    'in': shead('in', 'en-IN', 'The Lantern Museum | Band museum ki artworks se spirits jaagte hain | Dropper Playground',
                'Museum band hone ke baad, artworks mein soye spirits jaag uthte hain. Duniya ke museums ki random 15 artworks mein se 1 chuno to spirit jaagta hai, 2-3 chuno to bandhan. Spirits ke saath raat ka museum roshan karo, aur aapki photo golden oil portrait banke roshni mein uthti hai, duniya ke ek hi video mein. Photo sirf aapke device par paint hoti hai, kahin nahin bheji jaati. Login nahin chahiye.',
                'en_IN', 'The Lantern Museum | Dropper Playground', 'Museum band hone ke baad. Artworks ke spirits jaagte hain. Raat ka museum roshan karo, aur aapki photo golden oil portrait ban jaati hai, duniya ke ek hi video mein.', 'in'),
    'ko': shead('ko', 'ko', '등불의 미술관 | 문 닫은 뒤, 작품에 깃든 정령이 깨어난다 | 드로퍼 놀이터',
                '문 닫은 뒤의 미술관에서, 작품에 깃든 정령이 깨어나는 놀이. 제비뽑기로 놓인 세계 미술관의 15점 중 1점이면 깨어남, 2~3점이면 맺음. 정령과 함께 밤의 미술관을 밝혀 가면, 당신의 사진이 금빛 유화 초상화가 되어 빛으로 오르는 세상에 하나뿐인 동영상이 만들어집니다. 사진은 기기 안에서만 그리며 어디에도 보내지 않습니다. 로그인 불필요.',
                'ko_KR', '등불의 미술관 | 드로퍼 놀이터', '문 닫은 뒤의 미술관. 작품에 깃든 정령이 깨어납니다. 밤의 미술관을 밝히면, 당신의 사진이 금빛 유화 초상화가 되는 세상에 하나뿐인 동영상으로.', 'en',
                spirit_fonts('Noto Sans KR', 'Noto Serif KR')),
    'zh-hant': shead('zh-hant', 'zh-Hant', '燈火美術館｜閉館後，沉睡在作品裡的精靈甦醒｜Dropper 遊樂場',
                     '在閉館後的美術館裡，沉睡在作品中的精靈甦醒的遊戲。從抽出的世界美術館 15 件作品中選 1 件喚醒、選 2～3 件結合。帶著精靈點亮夜晚的美術館，你的照片會變成金色油畫肖像升入光中，做出世界上獨一無二的影片。照片只在你的裝置裡畫，不會送到任何地方。不需要登入。',
                     'zh_TW', '燈火美術館｜Dropper 遊樂場', '閉館後的美術館。沉睡在作品裡的精靈甦醒。點亮夜晚的美術館，你的照片會變成金色油畫肖像，成為世界上獨一無二的影片。', 'en',
                     spirit_fonts('Noto Sans TC', 'Noto Serif TC')),
    'vi': shead('vi', 'vi', 'Bảo tàng Đèn lồng | Tinh linh thức tỉnh từ tác phẩm sau giờ đóng cửa | Sân chơi Dropper',
                'Trong bảo tàng sau giờ đóng cửa, tinh linh ngủ trong các tác phẩm thức tỉnh. Chọn 1 trong 15 tác phẩm bốc thăm từ các bảo tàng thế giới để đánh thức, hoặc 2–3 để kết nối. Cùng tinh linh thắp sáng bảo tàng ban đêm, ảnh của bạn sẽ thành chân dung sơn dầu màu vàng bay lên trong ánh sáng, trong một video độc nhất trên thế giới. Ảnh chỉ được vẽ trên thiết bị của bạn và không gửi đi đâu. Không cần đăng nhập.',
                'vi_VN', 'Bảo tàng Đèn lồng | Sân chơi Dropper', 'Bảo tàng sau giờ đóng cửa. Tinh linh trong tác phẩm thức tỉnh. Thắp sáng bảo tàng ban đêm, ảnh của bạn thành chân dung sơn dầu màu vàng trong một video độc nhất trên thế giới.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
    'nl': shead('nl', 'nl', 'Het Lantaarnmuseum | Geesten worden wakker in kunstwerken na sluitingstijd | Droppers speeltuin',
                'In het museum na sluitingstijd ontwaken de geesten die in de kunstwerken slapen. Kies 1 van 15 willekeurig getrokken kunstwerken uit musea over de hele wereld om een geest te wekken, of 2–3 om ze te verbinden. Verlicht met je geesten het museum bij nacht, en je foto stijgt als gouden olieverfportret op in het licht, in een video die de enige ter wereld is. Je foto wordt alleen op je apparaat geschilderd en nergens heen gestuurd. Inloggen is niet nodig.',
                'nl_NL', 'Het Lantaarnmuseum | Droppers speeltuin', 'Het museum na sluitingstijd. De geesten in de kunstwerken ontwaken. Verlicht het museum bij nacht, en je foto wordt een gouden olieverfportret in een video die de enige ter wereld is.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
}

# 構造化データ：名前・通貨・発行元はこの表。説明は上の meta description をそのまま使う
for _lang, _name, _cur, _pub in [
        ('en', 'The Lantern Museum', 'USD', 'https://dropper-tools.com/en/'),
        ('in', 'The Lantern Museum', 'INR', 'https://dropper-tools.com/in/'),
        ('ko', '등불의 미술관', 'KRW', 'https://dropper-tools.com/'),
        ('zh-hant', '燈火美術館', 'TWD', 'https://dropper-tools.com/'),
        ('vi', 'Bảo tàng Đèn lồng', 'VND', 'https://dropper-tools.com/'),
        ('nl', 'Het Lantaarnmuseum', 'EUR', 'https://dropper-tools.com/')]:
    _h = LANGS[_lang]
    _desc = _h['desc'][len('<meta name="description" content="'):-len('">')]
    _in = _h['lang'][len('<html lang="'):-len('">')]
    _alt = 'ともしびの美術館' if _name == 'The Lantern Museum' else 'The Lantern Museum'
    LANGS[_lang]['ld'] = spirit_ld(_lang, _name, _alt, _desc, _in, _cur, 'Dropper', _pub)

# OG画像はゲーム専用の og-spirit.jpg（2026-11-01〜。重吉さんが6言語のページを直接直したのを、この表に写した）。Twitter の題と説明は og と同じ文
SPIRIT_OG = 'https://dropper-tools.com/assets/og/og-spirit.jpg'
SPIRIT_ALT = {
    'ja': '夜の美術館に浮かぶ提灯の明かりと、額縁の絵から漂う小さな光',
    'en': 'A glowing lantern in a museum at night, tiny lights drifting from the framed paintings',
    'in': 'A glowing lantern in a museum at night, tiny lights drifting from the framed paintings',
    'ko': '밤의 미술관에 떠 있는 등불과 액자 속 그림에서 흘러나오는 작은 빛들',
    'zh-hant': '夜間美術館裡漂浮的燈籠微光，與畫框中流洩而出的點點光芒',
    'vi': 'Ánh đèn lồng lơ lửng trong bảo tàng ban đêm và những đốm sáng nhỏ bay ra từ các bức tranh',
    'nl': 'Een gloeiende lantaarn in een museum bij nacht, met kleine lichtjes die uit de ingelijste schilderijen zweven',
}


def spirit_og(h, lang):
    cut = lambda v, a: v[len(a):-len('">')]
    title = cut(h['ogtitle'], '<meta property="og:title" content="')
    desc = cut(h['ogdesc'], '<meta property="og:description" content="')
    h['ogimage'] = (f'<meta property="og:image" content="{SPIRIT_OG}">\n'
                    '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">\n'
                    f'<meta property="og:image:alt" content="{SPIRIT_ALT[lang]}">')
    h['twitter'] = (f'<meta name="twitter:image" content="{SPIRIT_OG}">\n'
                    f'<meta name="twitter:title" content="{title}">\n<meta name="twitter:description" content="{desc}">')


spirit_og(JA_HEAD, 'ja')
for _lang in LANGS:
    spirit_og(LANGS[_lang], _lang)

# ---- 古いURLから新しいページへ飛ばすページ（monster.html → spirit.html、battle.html → night.html。2026-10-21） ----
def redirect_page(pre, to='spirit.html', title='The Lantern Museum'):
    url = f'https://dropper-tools.com{to}' if to.startswith('/') else f'https://dropper-tools.com{pre}play/{to}'
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
    'desc': '<meta name="description" content="ともしびの美術館の目録から7体の精霊をえらび、閉館後の美術館の通路を歩き、4つの扉を開けて展示室に灯をともす遊び。部屋ごとに要る明るさと好む属性がある。今夜の美術館は日付で決まり、だれが遊んでも同じ夜。負けはありません。">',
    'canonical': '<link rel="canonical" href="https://dropper-tools.com/play/night.html">',
    'site': '<meta property="og:site_name" content="ドロッパー">',
    'locale': '<meta property="og:locale" content="ja_JP">',
    'ogtitle': '<meta property="og:title" content="夜の美術館を灯す｜ドロッパーの遊び場">',
    'ogdesc': '<meta property="og:description" content="目録の精霊たちと、閉館後の美術館の展示室に灯をともす。だれが遊んでも同じ夜。4部屋を灯すと、最後に光の扉。">',
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
                'Choose 7 spirits from your Lantern Museum catalogue and walk the corridors of the museum after closing time, opening 4 doors and lighting the gallery behind each. Each gallery needs a certain light and loves certain elements. Tonight\'s museum is set by the date, so everyone gets the same night. There is no losing.',
                'en_US', 'Light the Night Museum | Dropper Playground', 'Bring light to the galleries of the museum after closing time with the spirits in your catalogue. Everyone gets the same night. Light the 4 galleries and open the door of light at the end.', 'en'),
    'in': nhead('in', 'en-IN', 'Light the Night Museum | Apne spirits se soyi galleries roshan karo | Dropper Playground',
                'The Lantern Museum ke catalogue se 7 spirits chuno aur band museum ke galiyaaron mein chalo, 4 darwaze kholo aur har gallery mein roshni jalao. Har gallery ko kuch roshni chahiye aur kuch elements pasand hain. Aaj raat ka museum date se tay hota hai, sabke liye ek hi raat. Haar nahin hoti.',
                'en_IN', 'Light the Night Museum | Dropper Playground', 'Apne catalogue ke spirits ke saath band museum ki galleries roshan karo. Sabke liye ek hi raat. Chaaron jalao, aakhir mein roshni ka darwaza.', 'in'),
    'ko': nhead('ko', 'ko', '밤의 미술관을 밝히다 | 목록의 정령으로 잠든 전시실에 불을 밝히다 | 드로퍼 놀이터',
                '등불의 미술관 목록에서 정령 7체를 골라, 문 닫은 뒤의 미술관 통로를 걸으며 문 4개를 열고 전시실마다 불을 밝히는 놀이. 방마다 필요한 밝기와 좋아하는 속성이 있다. 오늘 밤의 미술관은 날짜로 정해져 누가 놀아도 같은 밤. 패배는 없습니다.',
                'ko_KR', '밤의 미술관을 밝히다 | 드로퍼 놀이터', '목록의 정령들과 문 닫은 뒤의 미술관 전시실에 불을 밝힌다. 누가 놀아도 같은 밤. 4개 방을 밝히면 마지막에 빛의 문.', 'en',
                spirit_fonts('Noto Sans KR', 'Noto Serif KR')),
    'zh-hant': nhead('zh-hant', 'zh-Hant', '點亮夜之美術館｜用目錄裡的精靈點亮沉睡的展覽室｜Dropper 遊樂場',
                     '從燈火美術館的目錄選出 7 位精靈，走過閉館後美術館的通道、打開 4 扇門、點亮每間展覽室的遊戲。每間都有需要的亮度和喜愛的屬性。今夜的美術館由日期決定，誰來玩都是同一個夜晚。沒有輸這回事。',
                     'zh_TW', '點亮夜之美術館｜Dropper 遊樂場', '和目錄裡的精靈一起，點亮閉館後美術館的展覽室。誰來玩都是同一個夜晚。點亮 4 間，最後是光之門。', 'en',
                     spirit_fonts('Noto Sans TC', 'Noto Serif TC')),
    'vi': nhead('vi', 'vi', 'Thắp sáng bảo tàng đêm | Thắp sáng các phòng trưng bày đang ngủ bằng tinh linh | Sân chơi Dropper',
                'Chọn 7 tinh linh từ danh mục Bảo tàng Đèn lồng và đi qua hành lang của bảo tàng sau giờ đóng cửa, mở 4 cánh cửa và thắp sáng từng phòng trưng bày. Mỗi phòng cần một độ sáng và yêu thích một số hệ. Bảo tàng đêm nay được định theo ngày, ai chơi cũng cùng một đêm. Không có thua.',
                'vi_VN', 'Thắp sáng bảo tàng đêm | Sân chơi Dropper', 'Cùng tinh linh trong danh mục, thắp sáng các phòng của bảo tàng sau giờ đóng cửa. Ai chơi cũng cùng một đêm. Thắp 4 phòng, cuối cùng là cánh cửa ánh sáng.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
    'nl': nhead('nl', 'nl', 'Doe het licht aan in het nachtmuseum | Verlicht de slapende zalen met je geesten | Droppers speeltuin',
                'Kies 7 geesten uit je catalogus van het Lantaarnmuseum en loop na sluitingstijd door de gangen van het museum: open 4 deuren en steek in elke zaal het licht aan. Elke zaal heeft een bepaalde hoeveelheid licht nodig en houdt van bepaalde elementen. Het museum van vannacht hangt af van de datum, dus iedereen krijgt dezelfde nacht. Verliezen kan niet.',
                'nl_NL', 'Doe het licht aan in het nachtmuseum | Droppers speeltuin', 'Breng licht in de zalen van het museum na sluitingstijd, samen met de geesten uit je catalogus. Iedereen krijgt dezelfde nacht. Verlicht 4 zalen, en aan het eind wacht de deur van het licht.', 'en',
                spirit_fonts('Noto Sans', 'Noto Serif')),
}

PAGES = [('spirit.html', JA_HEAD, LANGS), ('night.html', NIGHT_JA_HEAD, NIGHT_LANGS)]
# 古いURL → 新しいページ（note・X に貼ったリンクが切れないように残す。中身は持たず、検索にも出さない）
REDIRECTS = [('monster.html', 'spirit.html', 'The Lantern Museum'), ('battle.html', 'night.html', 'Light the Night Museum')]
# デンマーク語版（da、2026-11-01 の朝に出した）は同じ日にオランダ語版（nl）と入れかえた（重吉さんの決め）。
# da/play/ の4ページは、nl/play/ の同じページへ飛ばすだけのページにして残す（貼ったリンクが切れないように）
GONE_LANGS = {'da': 'nl'}


# PWA（Microsoft Store 向け、2026-11-03〜）は日本語版 play/spirit.html だけ。
# manifest の scope は /play/ なので、/en/play/ などはその外。ほかの言語ではこの3行を外す
PWA_LINES = [
    '<link rel="manifest" href="/play/manifest.webmanifest">\n',
    '<meta name="theme-color" content="#0b0d16">\n',
    "<script>if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/play/sw.js').catch(function(){})});}</script>\n",
]


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
            for line in PWA_LINES:
                s = s.replace(line, '')
            out[ROOT / lang / 'play' / name] = s.encode('utf-8')
    for old, to, title in REDIRECTS:
        out[SRC / old] = redirect_page('/', to, title).encode('utf-8')
        for lang in LANGS:
            out[ROOT / lang / 'play' / old] = redirect_page(f'/{lang}/', to, title).encode('utf-8')
    for gone, now in GONE_LANGS.items():
        for name, title in [('spirit.html', 'The Lantern Museum'), ('night.html', 'Light the Night Museum')]:
            out[ROOT / gone / 'play' / name] = redirect_page(f'/{now}/', f'/{now}/play/{name}', title).encode('utf-8')
        for old, to, title in REDIRECTS:
            out[ROOT / gone / 'play' / old] = redirect_page(f'/{now}/', f'/{now}/play/{to}', title).encode('utf-8')
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
