#!/bin/sh
# 夜の美術館の映像を、ページが読む動画にする（2026-10-25〜）
#   sh encode-film.sh room <lastroom.py の出力フォルダ>   … 上半分＝色・下半分＝抜きの濃さ（ページで額縁の窓の下に作品を描くため）→ play/gallery/lastroom.mp4・last.json
#   sh encode-film.sh walk <lastwalk.py の出力フォルダ>   … そのまま → play/gallery/lastwalk.mp4・walk.json
#   sh encode-film.sh morning <morning.py の FILM のフォルダ> … 夜明けの画面の10秒のループ → play/gallery/morning-dawn-film.mp4・.json
# 音は入れない（ページがその場で合成する）。H.264 の mp4 と VP9 の webm の2つ（オープニングと同じ。ページは webm を読めればそちら）
set -e
HERE=$(cd "$(dirname "$0")" && pwd); OUT="$HERE/../../play/gallery"
case "$1" in
  room) ffmpeg -y -framerate 24 -i "$2/f%04d.png" -filter_complex "[0:v]split[a][b];[a]format=rgb24[c];[b]alphaextract,format=gray[m];[c][m]vstack,format=yuv420p" \
          -c:v libx264 -crf 21 -preset slow -an -movflags +faststart "$OUT/lastroom.mp4"
        ffmpeg -y -framerate 24 -i "$2/f%04d.png" -filter_complex "[0:v]split[a][b];[a]format=rgb24[c];[b]alphaextract,format=gray[m];[c][m]vstack,format=yuv420p" \
          -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -an "$OUT/lastroom.webm"
        cp "$2/last.json" "$OUT/last.json" ;;
  walk) ffmpeg -y -framerate 24 -i "$2/f%04d.png" -vf format=yuv420p -c:v libx264 -crf 22 -preset slow -an -movflags +faststart "$OUT/lastwalk.mp4"
        ffmpeg -y -framerate 24 -i "$2/f%04d.png" -vf format=yuv420p -c:v libvpx-vp9 -crf 34 -b:v 0 -row-mt 1 -an "$OUT/lastwalk.webm"
        cp "$2/walk.json" "$OUT/walk.json" ;;
  morning) ffmpeg -y -framerate 24 -i "$2/%04d.png" -vf format=yuv420p -c:v libx264 -crf 21 -preset slow -an -movflags +faststart "$OUT/morning-dawn-film.mp4"
        ffmpeg -y -framerate 24 -i "$2/%04d.png" -vf format=yuv420p -c:v libvpx-vp9 -crf 32 -b:v 0 -row-mt 1 -an "$OUT/morning-dawn-film.webm"
        cp "$2/film.json" "$OUT/morning-dawn-film.json" ;;
  *) echo "room か walk か morning"; exit 1 ;;
esac
