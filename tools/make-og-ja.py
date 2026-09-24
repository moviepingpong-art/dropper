# -*- coding: utf-8 -*-
# 周知サイトのカード画像（OGP、1200x630）を「4本を並べた形」で作る（2026-09-24）
#   python tools/make-og-ja.py assets/og/og-ja.png
# 書体は Windows の Noto Sans JP（C:/Windows/Fonts/NotoSansJP-VF.ttf）。Pillow が要る。
# ★ 日本語版だけ。英語版・インド版（og-en / og-in）は申込書ドロッパーが無い（日本語のみ）ので作り替えていない
# ★ 前の画像（2026-07-26）はイベントドロッパーだけの頃のもので、X の固定ポスト（4本を紹介）の下に
#   「イベント文書をドロップするだけ」と出ていた。色は前の画像から取り、同じ一家に見えるようにする
import sys
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
OUT = sys.argv[1] if len(sys.argv) > 1 else 'og-ja.png'
NOTO = 'C:/Windows/Fonts/NotoSansJP-VF.ttf'

def font(size, weight):
    f = ImageFont.truetype(NOTO, size)
    try:
        f.set_variation_by_axes([weight])
    except Exception:
        pass
    return f

INK = '#0f3d3a'
SUB = '#4f7c78'
LIME = '#beeb5a'
TOOLS = [
    # 名前, 1行目, 2行目, 帯の色（LINE のリッチメニューの色にそろえる）
    ('イベント', 'チラシ →', 'カレンダー＋案内文', '#06b6a4'),
    ('予定表', '年間予定表 →', 'まとめて登録', '#84cc16'),
    ('決めごと', '会話・メモ →', '決まったこと', '#048b7f'),
    ('申込書', '大会の申込書に', '名簿から記入', '#f5b400'),
]

im = Image.new('RGB', (W, H))
px = im.load()
# 縦のグラデーション（前の画像と同じ #0b7a70 → #0ca495）
top, bot = (0x0b, 0x7a, 0x70), (0x0c, 0xa4, 0x95)
d = ImageDraw.Draw(im)
for y in range(H):
    t = y / (H - 1)
    c = tuple(round(top[i] + (bot[i] - top[i]) * t) for i in range(3))
    d.line([(0, y), (W, y)], fill=c)
# 右上の大きな円（前の画像と同じ）
d.ellipse([1100 - 230, 60 - 230, 1100 + 230, 60 + 230], fill='#238d6d')

def text_w(s, f):
    return d.textlength(s, font=f)

# ロゴ「DROPPER ● ドロッパー」
fl = font(64, 800)
d.text((72, 50), 'DROPPER', font=fl, fill='white')
lx = 72 + text_w('DROPPER', fl) + 26
d.ellipse([lx - 11, 84 - 11, lx + 11, 84 + 11], fill=LIME)
d.text((lx + 24, 66), 'ドロッパー', font=font(28, 700), fill='white')

# 見出し
fh = font(58, 800)
head = 'ファイルを落とすだけ'
d.text((72, 150), head, font=fh, fill='white')
hw = text_w(head, fh)
d.rounded_rectangle([72, 240, 72 + hw, 250], radius=5, fill=LIME)
d.text((72, 262), '団体の事務が片づく、4つの無料ツール', font=font(30, 700), fill='white')

# 4本のカード
CX, CY, CW, CH, GAP = 72, 330, 252, 176, 16
fn = font(36, 800)
for i, (name, l1, l2, color) in enumerate(TOOLS):
    x = CX + i * (CW + GAP)
    d.rounded_rectangle([x, CY, x + CW, CY + CH], radius=22, fill='white')
    # 色の帯はカードの内側に置く。★ 決めごとの色（#048b7f）は背景の青緑に近く、
    #   カードの縁に帯を置くと、カードの上端が背景に溶けて見えた
    d.rounded_rectangle([x + 24, CY + 20, x + CW - 24, CY + 28], radius=4, fill=color)
    d.text((x + 24, CY + 34), name, font=fn, fill=INK)
    # 説明は枠に収まる大きさまで縮める
    for j, line in enumerate((l1, l2)):
        size = 23
        while size > 16 and text_w(line, font(size, 600)) > CW - 44:
            size -= 1
        d.text((x + 24, CY + 92 + j * 34), line, font=font(size, 600), fill=SUB)

# 下の段
d.text((72, 540), 'dropper-tools.com', font=font(34, 800), fill='white')
fp = font(26, 800)
pill = '無料・登録不要'
pw = text_w(pill, fp)
px1 = 1128
d.rounded_rectangle([px1 - pw - 48, 540, px1, 592], radius=26, fill='#c5ec6a')
d.text((px1 - pw - 24, 548), pill, font=fp, fill=INK)

im.save(OUT, optimize=True)
print('書いた: %s（%dx%d）' % (OUT, W, H))
