# 光のにじみを足す：python3 glow.py in.png out.png
import sys
from PIL import Image, ImageFilter, ImageChops
im = Image.open(sys.argv[1]).convert('RGBA'); w, h = im.size
r, g, b, a = im.split()
lum = ImageChops.subtract(r, b).point(lambda v: max(0, v - 70) * 2)
gl = Image.new('RGBA', im.size, (255, 190, 90, 0)); gl.putalpha(lum)
halo = gl.filter(ImageFilter.GaussianBlur(w * 0.05))
halo2 = gl.filter(ImageFilter.GaussianBlur(w * 0.015))
out = Image.new('RGBA', im.size, (0, 0, 0, 0)); out = Image.alpha_composite(out, halo); out = Image.alpha_composite(out, halo); out = Image.alpha_composite(out, im); out = Image.alpha_composite(out, halo2)
out.save(sys.argv[2])
