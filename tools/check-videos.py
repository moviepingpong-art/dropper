#!/usr/bin/env python3
"""配信する動画がスマホで再生できる形式かを確かめる（2026-11-03〜）。

なぜ要るか：
  2026-11-03、灯火の器の WebM だけが 4:4:4（VP9 Profile 1・gbrp）で書き出されていて、
  PC では動くのにスマホでは読めず、しずくの動画も音も出なかった（dropper #117）。
  PC で見ても気づけないので、コミットのところで機械に止めさせる。

決まり：
  - 色の形式は yuv420p（4:2:0）だけ。yuv444p・gbrp などはスマホの再生の部品が読めない
  - WebM は VP8 か VP9 Profile 0、MP4 は H.264（High 4:4:4 などは不可）
  - ffmpeg で書き出すときは必ず -pix_fmt yuv420p を付ける（PNG から書き出すと付けないと 4:4:4 になる）

使い方：
  python tools/check-videos.py            … リポジトリの全部の .webm / .mp4
  python tools/check-videos.py a.webm …   … 指定したものだけ（コミット前のフックが使う）
ffprobe が無い環境では確かめずに通す（警告だけ出す）。
"""
import json, shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OK_CODEC = {'.webm': {'vp8', 'vp9'}, '.mp4': {'h264'}}
BAD_PROFILE = ('4:4:4', '4:2:2', 'High 10', 'Profile 1', 'Profile 2', 'Profile 3')


def check(p: Path):
    r = subprocess.run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
                        'stream=codec_name,profile,pix_fmt', '-of', 'json', str(p)],
                       capture_output=True, text=True)
    try:
        s = json.loads(r.stdout)['streams'][0]
    except Exception:
        return f'読めません（{r.stderr.strip()[:120]}）'
    codec, prof, pix = s.get('codec_name', ''), s.get('profile', ''), s.get('pix_fmt', '')
    bad = []
    if codec not in OK_CODEC[p.suffix.lower()]:
        bad.append(f'形式 {codec}（{"・".join(sorted(OK_CODEC[p.suffix.lower()]))} にする）')
    if pix != 'yuv420p':
        bad.append(f'色 {pix}（yuv420p にする）')
    if any(b in prof for b in BAD_PROFILE):
        bad.append(f'プロファイル {prof}')
    return '・'.join(bad)


def main(args):
    if not shutil.which('ffprobe'):
        print('check-videos: ffprobe が見つかりません。動画の形式の確認を飛ばします（ffmpeg を入れると確かめます）。', file=sys.stderr)
        return 0
    files = [Path(a) for a in args] if args else [p for p in ROOT.rglob('*') if p.suffix.lower() in OK_CODEC and '.git' not in p.parts and 'node_modules' not in p.parts]
    files = [p for p in files if p.suffix.lower() in OK_CODEC and p.exists()]
    ng = [(p, m) for p in files for m in [check(p)] if m]
    for p, m in ng:
        print(f'  {p}: {m}', file=sys.stderr)
    if ng:
        print('\ncheck-videos: スマホで再生できない動画があります。書き出し直してください（ffmpeg に -pix_fmt yuv420p。'
              'VP9 は -pix_fmt yuv420p で Profile 0 になる）。', file=sys.stderr)
        return 1
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
