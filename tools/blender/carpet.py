# 展示室の絨毯の模様（えんじの地・紺と金の縁・菱形のメダリオン）を carpet.png に描く。hall.py がこれを貼る。
#   python3 carpet.py
from PIL import Image, ImageDraw, ImageFilter
import random, math, os
W, H = 512, 2048
im = Image.new('RGB', (W, H), (96, 10, 18)); d = ImageDraw.Draw(im)
gold = (196, 150, 62); dgold = (140, 96, 34); navy = (22, 20, 48); cream = (214, 190, 140)
# 縁：外の紺、金の帯、内の細い金
d.rectangle([0, 0, 40, H], fill=navy); d.rectangle([W - 41, 0, W, H], fill=navy)
d.rectangle([40, 0, 58, H], fill=gold); d.rectangle([W - 59, 0, W - 41, H], fill=gold)
d.rectangle([66, 0, 70, H], fill=dgold); d.rectangle([W - 71, 0, W - 67, H], fill=dgold)
for y in range(0, H, 48):  # 紺の縁に小さな金の菱形
    for cx in (20, W - 21):
        d.polygon([(cx, y + 8), (cx + 10, y + 24), (cx, y + 40), (cx - 10, y + 24)], fill=gold)
for y in range(12, H, 24):  # 金の帯に えんじの点
    for cx in (49, W - 50): d.ellipse([cx - 4, y - 4, cx + 4, y + 4], fill=(96, 10, 18))
# 中：メダリオン（菱形の中に菱形と十字）を 512px ごと、間に小さな花
for y0 in range(0, H, 512):
    cx, cy = W // 2, y0 + 256
    for r, c in [(170, gold), (160, navy), (120, (120, 16, 26)), (110, gold), (100, (96, 10, 18)), (60, cream), (50, navy)]:
        d.polygon([(cx, cy - r * 1.35), (cx + r, cy), (cx, cy + r * 1.35), (cx - r, cy)], fill=c)
    d.rectangle([cx - 6, cy - 40, cx + 6, cy + 40], fill=gold); d.rectangle([cx - 30, cy - 6, cx + 30, cy + 6], fill=gold)
    for (fx, fy) in [(cx - 150, y0 + 30), (cx + 150, y0 + 30), (cx - 150, y0 + 482), (cx + 150, y0 + 482)]:
        for k in range(4):
            a = k * math.pi / 2
            d.ellipse([fx + math.cos(a) * 12 - 8, fy + math.sin(a) * 12 - 8, fx + math.cos(a) * 12 + 8, fy + math.sin(a) * 12 + 8], fill=gold)
        d.ellipse([fx - 6, fy - 6, fx + 6, fy + 6], fill=cream)
random.seed(1); px = im.load()  # 織りのざらつき
for y in range(H):
    for x in range(W):
        n = random.randint(-14, 14) + (6 if (x + y) % 4 < 2 else -6)
        r, g, b = px[x, y]; px[x, y] = (max(0, min(255, r + n)), max(0, min(255, g + n)), max(0, min(255, b + n)))
im.filter(ImageFilter.GaussianBlur(.6)).save(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'carpet.png'))
