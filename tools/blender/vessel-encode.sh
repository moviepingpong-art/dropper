#!/bin/sh
# 灯火の器の絵と動画を play/gallery/vessel/ へ書き出す（2026-11-01〜）。
#   sh tools/blender/vessel-encode.sh <作業フォルダ>
# 作業フォルダの中身（できたコマ）：still/v0〜v10.png・d0〜d8/（しずくで n→n+1 灯、52コマ）・flow/（10灯目にあふれる、172コマ）
#   python3 vessel.py -- <作業>/still/v5.png 5 400 64
#   python3 vessel-drop.py -- <作業>/d4 4 5 400 32         （止まっても同じ命令で続きから）
#   python3 vessel-overflow.py -- <作業>/flow 400 32
# 絵は透明のまま（にじみも透明に）、動画は器の地の色 #121624 を焼きこむ（ページの .vclip・.vbrimv と同じ色）
set -e
W=$1; HERE=$(cd "$(dirname "$0")" && pwd); OUT=$HERE/../../play/gallery/vessel; mkdir -p "$OUT"
T=$(mktemp -d)
for L in 0 1 2 3 4 5 6 7 8 9 10; do
  python3 "$HERE/vessel-glow.py" "$W/still/v$L.png" "$T/g.png"
  python3 -c "from PIL import Image; Image.open('$T/g.png').resize((320,368), Image.LANCZOS).save('$OUT/v$L.webp', quality=88, method=6)"
done
clip() { # $1 コマのフォルダ  $2 名前  $3 コマ数
  rm -rf "$T/c"; mkdir "$T/c"
  python3 - "$1" "$T/c" "$3" "$HERE/vessel-glow.py" <<'PY'
import sys, subprocess
from PIL import Image
src, dst, n, glow = sys.argv[1], sys.argv[2], int(sys.argv[3]), sys.argv[4]
for f in range(n):
    subprocess.run(['python3', glow, f'{src}/{f:04d}.png', f'{dst}/g.png'], check=True)
    im = Image.open(f'{dst}/g.png'); bg = Image.new('RGB', im.size, (18, 22, 36)); bg.paste(im, (0, 0), im); bg.save(f'{dst}/{f:04d}.png')
for f in range(n, n + 8): Image.open(f'{dst}/{n - 1:04d}.png').save(f'{dst}/{f:04d}.png')   # 終わりを少し止める
PY
  ffmpeg -y -loglevel error -framerate 24 -i "$T/c/%04d.png" -vf "scale=400:-2" -c:v libvpx-vp9 -b:v 0 -crf 36 -row-mt 1 -an "$OUT/$2.webm"
  ffmpeg -y -loglevel error -framerate 24 -i "$T/c/%04d.png" -vf "scale=400:-2" -c:v libx264 -pix_fmt yuv420p -crf 24 -movflags +faststart -an "$OUT/$2.mp4"
}
for L in 0 1 2 3 4 5 6 7 8; do clip "$W/d$L" "drop$L" 52; done
clip "$W/flow" overflow 172
rm -rf "$T"; ls -la "$OUT"
