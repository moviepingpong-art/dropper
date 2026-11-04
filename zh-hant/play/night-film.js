// 夜の美術館を灯す：2つの映像（2026-10-25〜、重吉さんの決め）
//  1. 最後の部屋（55秒・縦9:16。2026-11-01 に40秒から。最後に額縁の作品と精霊が柱のまわりを回り、写真・守り神と天窓へ昇る）…光の扉の鍵で最後の部屋に入ったら流す。BGM つきの動画にして、保存できる（特典）
//  2. 最後の通路を進む（10秒・横3:2）…4段階目の朝に精霊を額縁に飾ったときだけ流す。保存はしない
// 絵は Blender で前もって書き出した物（tools/blender/lastroom.py・lastwalk.py）。額縁の窓の四隅はコマごとに JSON にある。
// 最後の部屋の映像は、窓を「抜き」にしてあり、上半分が色・下半分が抜きの濃さ（lastroom.webm / .mp4。tools/blender/encode-film.sh）。その夜の作品・精霊は、ここで窓の下に描く。
// 動画はこの端末の中だけで作る（canvas と、その場で合成した音を MediaRecorder で録る）。どこにも送らない
(() => {
  const GAL = '/play/gallery/', MUS = '/play/museum/';
  const LRV = '?v=55';  // 最後の部屋の動画と last.json の版（2026-11-01 に55秒にした。絵と JSON を入れかえたら上げる。古い組み合わせが残らないように）
  // 額縁の絵の寸法（frame.py の JSON。night-app.js の FR と同じ数）
  const FR = {
    dawn: { w: 720, h: 1149, l: 141, t: 336, ww: 438, wh: 672, top: 208, s: { w: 300, h: 398, l: 59, t: 59, ww: 182, wh: 280, top: 6 } },
    quiet: { w: 720, h: 968, l: 128, t: 128, ww: 464, wh: 711, top: 14, s: { w: 300, h: 403, l: 53, t: 53, ww: 193, wh: 296, top: 6 } }
  };
  const SMALL = 0.26;
  const FS = 0.5;  // 映像に描く額縁の canvas の大きさ（額縁の絵の半分。映像の中の額縁は大きくても幅200ほど）
  const TYC = { 炎: '#c8553d', 水: '#3d7fc8', 森: '#4f9a52', 雷: '#d6b740', 風: '#8fc7b8', 土: '#9a7448', 光: '#e8d79a', 闇: '#5b4a8a', 夢: '#c37fb4', 鋼: '#8a96a6' };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  // 使い終わった canvas を空にする（iPhone の Safari は canvas の使える量に上限があり、もう一度挑戦すると足りなくなるため）
  const free = (...cs) => cs.flat().forEach(c => { if (c && c.getContext) { c.width = 0; c.height = 0; } });

  // ---- 額縁の絵を1枚の canvas に：窓いっぱいの作品・額縁・上のふちの小さな額縁と精霊（night-app.js の fbox と同じ並び） ----
  function cover(g, im, x, y, w, h) {
    const s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s;
    g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  // s＝縮める割合（2026-10-28〜。iPhone の Safari は canvas の使える量が少なく、大きいまま7枚作ると描かれない額縁が出た）。
  // 縮めても、額縁の絵の座標（lw・lh）で描けるようにしておく（warp がこの大きさで四隅を写す）
  async function frameCanvas(o, s = 1) {
    const P = FR[o.k] || FR.dawn, S = P.s, c = document.createElement('canvas'); c.width = Math.round(P.w * s); c.height = Math.round(P.h * s); c.lw = P.w; c.lh = P.h;
    const g = c.getContext('2d'); g.scale(c.width / P.w, c.height / P.h);
    const [big, sm, art, th] = await Promise.all([img(`${GAL}frame-${o.k}.webp`), img(`${GAL}frame-${o.k}-s.webp`), img(o.art ? MUS + o.art : ''), img(o.th)]);
    g.save(); g.beginPath(); g.rect(P.l - 2, P.t - 2, P.ww + 4, P.wh + 4); g.clip();
    if (art) cover(g, art, P.l - 2, P.t - 2, P.ww + 4, P.wh + 4);
    else if (o.empty) {  // まだ飾っていない額縁（最後の通路）：斜めの縞と「空き」の字
      g.fillStyle = '#140b0e'; g.fillRect(P.l, P.t, P.ww, P.wh); g.fillStyle = '#1a0f12';
      for (let x = -P.wh; x < P.ww; x += 36) { g.beginPath(); g.moveTo(P.l + x, P.t + P.wh); g.lineTo(P.l + x + 18, P.t + P.wh); g.lineTo(P.l + x + 18 + P.wh, P.t); g.lineTo(P.l + x + P.wh, P.t); g.closePath(); g.fill(); }
      g.fillStyle = '#8f8576'; g.font = '500 44px "Noto Serif JP", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(o.empty, P.l + P.ww / 2, P.t + P.wh / 2);
    }
    else if (th && o.thWin) cover(g, th, P.l - 2, P.t - 2, P.ww + 4, P.wh + 4);  // 作品の写しの無い古い額縁は、カードの小さな絵を窓に
    else { const gr = g.createLinearGradient(0, P.t, 0, P.t + P.wh); gr.addColorStop(0, TYC[o.t] || '#8a96a6'); gr.addColorStop(1, '#0d0f19'); g.fillStyle = gr; g.fillRect(P.l, P.t, P.ww, P.wh); }
    g.restore();
    if (big) g.drawImage(big, 0, 0, P.w, P.h);
    if (art && th && sm) {
      const k = P.ww * SMALL / S.ww, x = (P.w - S.w * k) / 2, y = P.top - S.top * k;
      const bx = x + S.l * k - 1, by = y + S.t * k - 1, bw = S.ww * k + 2, bh = S.wh * k + 2;
      g.save(); g.beginPath(); g.rect(bx, by, bw, bh); g.clip(); g.fillStyle = '#0d0f17'; g.fillRect(bx, by, bw, bh);
      const tw = bw * 2.788, thh = th.height * tw / th.width; g.drawImage(th, bx + (bw - tw) * .5, by + (bh - thh) * .224, tw, thh);
      g.restore(); g.drawImage(sm, x, y, S.w * k, S.h * k);
    }
    if (o.glow) {  // 最後の部屋：額縁と作品のふちに、その精霊の属性の色の灯り（夜ごとに顔ぶれで色が変わる）
      g.globalCompositeOperation = 'source-atop';
      const cx = P.w / 2, cy = P.h / 2, gr = g.createRadialGradient(cx, cy, Math.min(P.ww, P.wh) * .35, cx, cy, Math.max(P.w, P.h) * .62);
      gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, o.glow);
      g.globalAlpha = .75; g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    if (o.rar === 'gold' || o.rar === 'silver') {  // 金の光・銀の光の子は、額縁が箔で光る
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, P.w, P.h); const col = o.rar === 'gold' ? '255,214,120' : '220,230,245';
      gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.45, `rgba(${col},.28)`); gr.addColorStop(.55, `rgba(${col},.05)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h); g.globalCompositeOperation = 'source-over';
    }
    if (o.dim) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = `rgba(0,0,0,${o.dim})`; g.fillRect(0, 0, P.w, P.h); g.globalCompositeOperation = 'source-over'; }
    return c;
  }

  // ---- 四隅から四隅への射影（3×3）と、それを三角形に分けて描く（canvas 2D はゆがめて描けないため） ----
  function homography(s, d) {
    const A = [], B = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = s[i], [u, v] = d[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v);
    }
    for (let c = 0; c < 8; c++) {  // ガウスの消去法
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const f = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= f * A[c][k]; B[r] -= f * B[c]; }
    }
    const h = B.map((b, i) => b / A[i][i]);
    return (x, y) => { const w = h[6] * x + h[7] * y + 1; return [(h[0] * x + h[1] * y + h[2]) / w, (h[3] * x + h[4] * y + h[5]) / w]; };
  }
  function tri(g, im, s0, s1, s2, d0, d1, d2) {
    const cx = (d0[0] + d1[0] + d2[0]) / 3, cy = (d0[1] + d1[1] + d2[1]) / 3, e = p => [p[0] + (p[0] - cx) * .04, p[1] + (p[1] - cy) * .04];  // すき間が出ないよう少し広げて切る
    const [a, b, c] = [e(d0), e(d1), e(d2)];
    g.save(); g.beginPath(); g.moveTo(...a); g.lineTo(...b); g.lineTo(...c); g.closePath(); g.clip();
    const den = (s1[0] - s0[0]) * (s2[1] - s0[1]) - (s2[0] - s0[0]) * (s1[1] - s0[1]);
    const m11 = ((d1[0] - d0[0]) * (s2[1] - s0[1]) - (d2[0] - d0[0]) * (s1[1] - s0[1])) / den, m12 = ((d2[0] - d0[0]) * (s1[0] - s0[0]) - (d1[0] - d0[0]) * (s2[0] - s0[0])) / den;
    const m21 = ((d1[1] - d0[1]) * (s2[1] - s0[1]) - (d2[1] - d0[1]) * (s1[1] - s0[1])) / den, m22 = ((d2[1] - d0[1]) * (s1[0] - s0[0]) - (d1[1] - d0[1]) * (s2[0] - s0[0])) / den;
    g.setTransform(m11, m21, m12, m22, d0[0] - m11 * s0[0] - m12 * s0[1], d0[1] - m21 * s0[0] - m22 * s0[1]);
    g.drawImage(im, 0, 0); g.restore();
  }
  function warp(g, im, map, n = 8) {
    const W = im.lw || im.width, H = im.lh || im.height, kx = im.width / W, ky = im.height / H, P = [];  // map は額縁の絵の座標、切り出しは canvas の画素
    for (let j = 0; j <= n; j++) { P.push([]); for (let i = 0; i <= n; i++) P[j].push([[W * i / n * kx, H * j / n * ky], map(W * i / n, H * j / n)]); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i];
      tri(g, im, a[0], b[0], c[0], a[1], b[1], c[1]); tri(g, im, a[0], c[0], d[0], a[1], c[1], d[1]);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
  // 明るく灯った壁の色（この色のとき画像をそのままの明るさで出す）
  const WL_LIT = [72, 54, 38];  // 2026-10-27 の40秒の絵で、灯った壁の色（明るいほうから15%くらい）
  // 額縁の絵の窓（px）→ 画面の窓の四隅、の写し
  const winMap = (P, q, W, H) => homography([[P.l, P.t], [P.l + P.ww, P.t], [P.l + P.ww, P.t + P.wh], [P.l, P.t + P.wh]], q.slice(0, 4).map(([x, y]) => [x * W, y * H]));

  // ---- 画面：黒い幕の上に canvas とボタン ----
  let box = null;
  function layer(cls) {
    if (!box) {
      box = document.createElement('div'); box.className = 'nfilm'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
      box.innerHTML = '<canvas></canvas><div class="nf-cap" aria-live="polite"></div><div class="nf-btns"></div>';
      document.body.append(box);
    }
    box.className = 'nfilm ' + cls; box.hidden = false;
    box.querySelector('.nf-btns').replaceChildren(); box.querySelector('.nf-cap').textContent = '';
    return { cv: box.querySelector('canvas'), cap: box.querySelector('.nf-cap'), btns: box.querySelector('.nf-btns') };
  }
  function btn(L, label, cls, fn) { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ' + (cls || ''); b.textContent = label; b.onclick = fn; L.btns.append(b); return b; }
  const close = () => { if (box) box.hidden = true; };

  // ---- 音：その場で合成する（BGM と同じ音色・同じ調 Bb）。dests に、スピーカーと録画の両方をつなぐ ----
  // bp：AI の曲の設計図（最後の部屋だけ。無ければいつもの曲）{ tempo, key, inst:[bell|strings|organ|harp|voice], build:rise|calm|wave }
  const KEY_SHIFT = { Bb: 0, C: 2, D: 4, Eb: -7, F: -5, G: -3 };
  // base：曲を書いた調（最後の部屋の曲は D）。AI の調へは近いほうへ移す。len：曲の長さ（秒。波の形をのばす）
  function score(ac, out, plan, bp, base = 'Bb', len = 20) {
    bp = bp || {};
    const inst = Array.isArray(bp.inst) && bp.inst.length ? bp.inst : ['bell', 'strings'], build = bp.build || 'rise';
    const shift = bp.key in KEY_SHIFT ? (((KEY_SHIFT[bp.key] - KEY_SHIFT[base]) % 12 + 18) % 12) - 6 : 0;
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 3; comp.connect(out);
    const swell = ac.createGain(); swell.connect(comp);
    const master = ac.createGain(); master.gain.value = build === 'calm' ? .75 : .9; master.connect(swell);
    const SR = ac.sampleRate, noise = ac.createBuffer(1, SR * 2, SR); { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    const ir = ac.createBuffer(2, SR * 3.5, SR);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3); }
    const rv = ac.createConvolver(); rv.buffer = ir; const wet = ac.createGain(); wet.gain.value = 1; wet.connect(rv); rv.connect(master);
    const STEP = 60 / (Number(bp.tempo) || 96) / 4, echo = ac.createDelay(1); echo.delayTime.value = STEP * 3;
    { const fb = ac.createGain(); fb.gain.value = .36; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200; echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(master); lp.connect(wet); }
    const T0 = ac.currentTime + .08, N = n => 440 * Math.pow(2, (n + shift - 69) / 12);
    // 波（wave）は、全体の大きさが2回ふくらんでおさまる
    if (build === 'wave') swell.gain.setValueAtTime(.7, T0), [[0, .7], [4, 1.05], [7.5, .75], [12, 1.1], [15.5, .85], [18, 1]].forEach(([t, v]) => swell.gain.linearRampToValueAtTime(v, T0 + t * len / 20));
    const bell = (n, t0, d = 2.2, v = .14) => [[1, 1], [2.76, .35], [5.4, .12]].forEach(([m, a]) => {
      const t = t0 + T0, o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = N(n) * m;
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v * a, t + .01); e.gain.exponentialRampToValueAtTime(.0001, t + d / m);
      o.connect(e); e.connect(master); e.connect(wet); o.start(t); o.stop(t + d + .05);
    });
    const haze = (ns, t, d, v, open = 1500) => {
      t += T0; const e = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .4;
      lp.frequency.setValueAtTime(450, t); lp.frequency.linearRampToValueAtTime(open, t + d * .6); lp.frequency.linearRampToValueAtTime(700, t + d);
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + Math.min(1.2, d * .4)); e.gain.setValueAtTime(v, t + d - .5); e.gain.exponentialRampToValueAtTime(.0001, t + d + .6);
      ns.forEach(n => [-9, 9].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + d + .7); }));
      lp.connect(e); e.connect(master); e.connect(wet);
    };
    const spark = (n, t, v) => {
      t += T0; const o = ac.createOscillator(), o2 = ac.createOscillator(), e = ac.createGain();
      o.type = 'triangle'; o.frequency.value = N(n); o2.type = 'sine'; o2.frequency.value = N(n) * 2;
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .006); e.gain.exponentialRampToValueAtTime(.0001, t + .32);
      o.connect(e); o2.connect(e); e.connect(master); e.connect(echo); e.connect(wet); o.start(t); o2.start(t); o.stop(t + .36); o2.stop(t + .36);
    };
    const organ = (ns, t, d, v) => {
      t += T0; const e = ac.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .3); e.gain.setValueAtTime(v, t + d - .4); e.gain.exponentialRampToValueAtTime(.0001, t + d + .5);
      ns.forEach(n => [[1, 1], [2, .5], [3, .3], [4, .15]].forEach(([m, a]) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = N(n) * m; g.gain.value = a; o.connect(g); g.connect(e); o.start(t); o.stop(t + d + .6); }));
      e.connect(master); e.connect(wet);
    };
    const voice = (ns, t, d, v) => {  // 声：のこぎりの音を、ア の口の形（2つの山）に通す。少しゆれる
      t += T0; const e = ac.createGain(), f1 = ac.createBiquadFilter(), f2 = ac.createBiquadFilter(), lfo = ac.createOscillator(), lg = ac.createGain();
      f1.type = f2.type = 'bandpass'; f1.frequency.value = 680; f1.Q.value = 5; f2.frequency.value = 1100; f2.Q.value = 7;
      lfo.frequency.value = 5; lg.gain.value = 7; lfo.connect(lg); lfo.start(t); lfo.stop(t + d + .8);
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v * 3, t + Math.min(1.4, d * .4)); e.gain.setValueAtTime(v * 3, t + d - .5); e.gain.exponentialRampToValueAtTime(.0001, t + d + .7);
      ns.forEach(n => [-6, 6].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt; lg.connect(o.detune); o.connect(f1); o.connect(f2); o.start(t); o.stop(t + d + .8); }));
      f1.connect(e); f2.connect(e); e.connect(master); e.connect(wet);
    };
    const harp = (n, t0, d = 1.6, v = .12) => {
      const t = t0 + T0, o = ac.createOscillator(), o2 = ac.createOscillator(), e = ac.createGain(); o.type = 'triangle'; o.frequency.value = N(n); o2.frequency.value = N(n) * 2;
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .005); e.gain.exponentialRampToValueAtTime(.0001, t + d);
      o.connect(e); o2.connect(e); e.connect(master); e.connect(echo); e.connect(wet); o.start(t); o2.start(t); o.stop(t + d + .05); o2.stop(t + d + .05);
    };
    // 合唱（「ウー」と「アー」の口の形。4人分すこしずつずらす）と、ひとりの高い声（少年のソプラノの代わり。音から音へなめらかにつなぐ）。2026-10-27〜 最後の部屋の曲
    const choir = (ns, t, d, v, vow = 'oo') => {
      t += T0; const FM = vow === 'oo' ? [[350, 6, 1], [700, 8, .5], [2600, 10, .08]] : [[750, 6, 1], [1150, 8, .6], [2800, 10, .1]];
      const e = ac.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + Math.min(1.6, d * .45)); e.gain.setValueAtTime(v, t + d - .6); e.gain.exponentialRampToValueAtTime(.0001, t + d + 1.2);
      const fs = FM.map(([f, q, a]) => { const b = ac.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const g = ac.createGain(); g.gain.value = a * 3; b.connect(g); g.connect(e); return b; });
      ns.forEach(n => [-11, -4, 3, 10].forEach(dt => {
        const o = ac.createOscillator(), l = ac.createOscillator(), lg = ac.createGain(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt;
        l.frequency.value = 4.6 + Math.random(); lg.gain.value = 9; l.connect(lg); lg.connect(o.detune); fs.forEach(b => o.connect(b));
        o.start(t); o.stop(t + d + 1.3); l.start(t); l.stop(t + d + 1.3);
      }));
      e.connect(master); e.connect(wet);
    };
    const solo = (line, v) => {  // line：[[音, 始まり, 長さ], …]
      const o = ac.createOscillator(), o2 = ac.createOscillator(), l = ac.createOscillator(), lg = ac.createGain(), e = ac.createGain(), lp = ac.createBiquadFilter();
      o.type = 'triangle'; o2.type = 'sine'; l.frequency.value = 5.2; lg.gain.value = 0; l.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
      lp.type = 'lowpass'; lp.frequency.value = 2400; o.connect(lp); o2.connect(lp); lp.connect(e); e.gain.value = .0001; e.connect(master); e.connect(wet);
      line.forEach(([n, t, d]) => {
        t += T0; o.frequency.setTargetAtTime(N(n), t, .06); o2.frequency.setTargetAtTime(N(n) * 2, t, .06);
        e.gain.setTargetAtTime(v, t, .18); e.gain.setTargetAtTime(v * .55, t + d * .7, .3); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(14, t + Math.min(.9, d * .5));
      });
      const z = line[line.length - 1], te = T0 + z[1] + z[2]; e.gain.setTargetAtTime(.0001, te, .5);
      [o, o2, l].forEach(x => { x.start(T0 + line[0][1]); x.stop(te + 3); });
    };
    const bass = (n, t, d, v) => { t += T0; const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = N(n); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .6); e.gain.setValueAtTime(v, t + d - .4); e.gain.exponentialRampToValueAtTime(.0001, t + d + .6); o.connect(e); e.connect(master); o.start(t); o.stop(t + d + .7); };
    // 2026-11-04〜 お別れの映像の曲（4拍子の、前へ進む曲）の楽器（前の「3C」の笛・ピアノ・ティンパニは使わなくなったので外した）：バスドラム・ハイハット・スネア・シンバル・刻むシンセ
    const kick = (t, v) => { t += T0; const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(44, t + .12); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .004); e.gain.exponentialRampToValueAtTime(.0001, t + .38); o.connect(e); e.connect(master); o.start(t); o.stop(t + .4); };
    const hit = (t, v, d, type, f, q = .7, rv = false) => { t += T0; const s = ac.createBufferSource(), b = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = noise; b.type = type; b.frequency.value = f; b.Q.value = q; e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .003); e.gain.exponentialRampToValueAtTime(.0001, t + d); s.connect(b); b.connect(e); e.connect(master); if (rv) e.connect(wet); s.start(t, Math.random()); s.stop(t + d + .05); };
    const hat = (t, v) => hit(t, v, .05, 'highpass', 7500);
    const snare = (t, v) => { hit(t, v, .16, 'bandpass', 1900, .6, true); const tt = t + T0, o = ac.createOscillator(), e = ac.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(200, tt); o.frequency.exponentialRampToValueAtTime(150, tt + .08); e.gain.setValueAtTime(.0001, tt); e.gain.exponentialRampToValueAtTime(v * .6, tt + .003); e.gain.exponentialRampToValueAtTime(.0001, tt + .12); o.connect(e); e.connect(master); o.start(tt); o.stop(tt + .14); };
    const crash = (t, v) => hit(t, v, 2.6, 'highpass', 4200, .5, true);
    const pulse = (n, t, d, v, open = 1600) => {  // 刻むシンセ：のこぎりの音2つを、すぐ閉じるフィルターに通す
      t += T0; const e = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 3; lp.frequency.setValueAtTime(open, t); lp.frequency.exponentialRampToValueAtTime(260, t + d);
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .005); e.gain.exponentialRampToValueAtTime(.0001, t + d);
      [-7, 7].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + d + .05); });
      lp.connect(e); e.connect(master); e.connect(echo);
    };
    // 設計図の楽器で鳴らす：旋律は 鈴・ハープ、和音は 弦・オルガン・声。どちらも選ばれていなければ、鈴・弦を小さく
    const MEL = inst.filter(x => x === 'bell' || x === 'harp'), PAD = inst.filter(x => x === 'strings' || x === 'organ' || x === 'voice');
    const mel = (n, t, d, v) => { const k = MEL.length ? 1 / Math.sqrt(MEL.length) : .6; (MEL.length ? MEL : ['bell']).forEach(x => x === 'harp' ? harp(n, t, d * .7, v * k) : bell(n, t, d, v * k)); };
    const pad = (ns, t, d, v, open) => { const k = PAD.length ? 1 / Math.sqrt(PAD.length) : .6; (PAD.length ? PAD : ['strings']).forEach(x => x === 'organ' ? organ(ns, t, d, v * k) : x === 'voice' ? voice(ns, t, d, v * k) : haze(ns, t, d, v * k, open)); };
    const soft = build === 'calm' ? .35 : 1;  // 静か（calm）は、高まりと低い響きを小さく
    const sub = (n, t, v, d = STEP * 2) => { t += T0; const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = N(n); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .03); e.gain.exponentialRampToValueAtTime(.0001, t + d); o.connect(e); e.connect(master); o.start(t); o.stop(t + d + .05); };
    const boom = (t, v) => { t += T0; const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(32, t + .6); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.0001, t + 1.6); o.connect(e); e.connect(master); e.connect(wet); o.start(t); o.stop(t + 1.7); };
    const riser = (t, d, v) => { t += T0; const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain(); s.buffer = noise; s.loop = true; f.type = 'bandpass'; f.Q.value = 2; f.frequency.setValueAtTime(400, t); f.frequency.exponentialRampToValueAtTime(7000, t + d); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + d); e.gain.exponentialRampToValueAtTime(.0001, t + d + .25); s.connect(f); f.connect(e); e.connect(master); e.connect(wet); s.start(t); s.stop(t + d + .3); };
    const CH = { Bb: { b: 46, t: [58, 62, 65, 69], pad: [46, 53, 57, 62] }, Cm: { b: 48, t: [60, 63, 67, 74], pad: [48, 55, 58, 63] },
      Eb: { b: 51, t: [58, 63, 67, 69], pad: [51, 55, 58, 62] }, Gm: { b: 43, t: [58, 62, 65, 67], pad: [43, 50, 53, 58] } };
    const ARP = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 1, 3, 2, 4, 3, 1];
    const arp = (c, t0, t1, v0, v1, rate = 1, pat = ARP) => { for (let t = t0, i = 0; t < t1; t += STEP / rate, i++) { const a = pat[i % pat.length], k = (t - t0) / (t1 - t0); spark(a === 4 ? c.t[0] + 12 : c.t[a], t, v0 + (v1 - v0) * k); } };
    plan({ kick, hat, snare, crash, pulse, bell, haze, spark, sub, boom: (t, v) => boom(t, v * soft), riser: (t, d, v) => riser(t, d, v * soft), arp, CH, STEP, mel, pad, voice, harp, choir, solo, bass, organ, inst });
    return { T0, stop: () => { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, .15); } };
  }
  // その夜のカードから決まる乱数（同じ夜の同じ7体なら同じ。カードか日付が1つ違えば別の曲・別の灯り）
  function seeded(str) {
    let h = 2166136261; for (const ch of String(str)) { h ^= ch.codePointAt(0); h = Math.imul(h, 16777619); }
    return () => { h += 0x6D2B79F5; let t = h; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  }
  // 最後の部屋の曲（40秒・ニ長調・2026-10-27〜 重吉さんの決め。参考にした曲の雰囲気：少年合唱と弦の、静かに始まって満ち、やさしく終わる曲。曲そのものは写していない）
  // 入口（0〜5秒）は遠くの合唱「ウー」とハープ → 額縁が1つ灯るたびに1小節（3.125秒）、和音が変わり鈴が鳴る。2つ目からひとりの声が旋律を歌う →
  // 光の粒が灯籠へ（G → A で高まる）→ 天窓の光で D の和音がひらき、鈴が降りて消える。時刻は lastroom.py の LIT0・GAP（120コマ・75コマ）に合わせる
  // 旋律・和音の進み方・ハープの並び・灯るたびの鈴の音は、その夜のカードから決める（rnd）。AI の設計図の楽器は色として足す（オルガン・鈴・ハープ・声）
  // sp：精霊ごとの特別（rar 金の光・銀の光）。額縁が灯る時刻に、金＝声の和音、銀＝高い鈴の連なり（縁の子の2つの旋律は 2026-11-02 に受け継ぎをなくしたので外した）
  // lt：額縁が灯る時刻（秒）。2026-11-01 に額縁を4つにしてから、灯るのは小節の頭と限らない（和音は小節ごと、灯った合図と特別な音は灯る時刻に）
  const ROOM_PLAN = (rnd, sp = [], lt = null, asc = null) => ({ bell, harp, voice, choir, solo, bass, haze: strings, organ, inst }) => {
    const pick = a => a[Math.floor(rnd() * a.length)], L0 = 5, BAR = 3.125, BEAT = BAR / 4, has = x => inst.includes(x);
    const C = { D: [50, 57, 62, 66, 69], Bm: [47, 54, 59, 62, 66], G: [43, 55, 59, 62, 67], A: [45, 57, 61, 64, 69], DF: [42, 57, 62, 66, 69], Em: [40, 55, 59, 64, 67],
      Asus: [45, 57, 62, 64, 69], AC: [49, 57, 61, 64, 69], Fm: [42, 54, 61, 66, 69], Gm6: [43, 55, 58, 62, 64] };
    const P = pick([['D', 'Bm', 'G', 'A', 'DF', 'Em', 'Asus'], ['D', 'AC', 'Bm', 'Fm', 'G', 'DF', 'Asus'], ['D', 'G', 'Bm', 'A', 'G', 'Em', 'Asus']]);
    // 旋律：小節ごとに、その和音の中の音から2つ（長い音・短い音）。上がっていく線で、最後は高い所で長くのばす
    const tones = k => C[k].slice(2).map(n => n + 12).concat(C[k].slice(2).map(n => n + 24)).filter(n => n >= 66 && n <= 81).sort((a, b) => a - b);
    let cur = 69; const line = [];
    P.forEach((k, i) => {
      if (i < 1) return; const ts = tones(k), near = ts.reduce((a, b) => Math.abs(b - cur - (i > 3 ? 2 : 0)) < Math.abs(a - cur - (i > 3 ? 2 : 0)) ? b : a, ts[0]);
      const t = L0 + i * BAR, two = rnd() < .7; line.push([near, t, two ? 1.5 : 3]); cur = near;
      if (two) { const nx = pick(ts.filter(n => n !== near)) || near; line.push([nx, t + 1.56, 1.4]); cur = nx; }
    });
    line.push([pick([74, 78]), L0 + 7 * BAR, 1.6], [pick([76, 78]), L0 + 7 * BAR + 1.6, 1.6], [76, L0 + 8 * BAR, 3.2], [78, L0 + 9 * BAR, 1.6], [81, L0 + 9 * BAR + 1.6, 4.2]);
    const hp = pick([[0, 1, 2, 3], [3, 2, 1, 0], [0, 2, 1, 3], [1, 3, 0, 2]]), cv = has('voice') ? 1.35 : 1;
    choir([62, 66, 69], 0, 5.2, .012 * cv, 'oo'); bass(38, .5, 4.6, .05);
    pick([[74, 78, 81, 86], [86, 81, 78, 74], [78, 81, 86, 90]]).forEach((n, i) => harp(n, .4 + i * .35, 3, .05));
    P.forEach((k, i) => {
      const t = L0 + i * BAR, c = C[k], g = Math.min(1, .45 + i * .09);
      choir(c.slice(1, 4), t, BAR + .2, .014 * g * cv, i < 3 ? 'oo' : 'ah');
      strings(c.slice(1), t, BAR + .1, .012 * g, 1200 + i * 200);
      if (has('organ')) organ(c.slice(1, 4), t, BAR, .008 * g);
      bass(c[0] - 12 + (c[0] < 44 ? 12 : 0), t, BAR, .07 * g);
      hp.forEach((h, b) => harp(c[1 + ((h + i) % 4)] + 12, t + b * BEAT + BEAT / 2, 1.8, (.03 + .005 * i) * (has('harp') ? 1.4 : 1)));
    });
    (lt || P.map((k, i) => L0 + i * BAR)).forEach((t, i) => {
      const c = C[P[Math.min(P.length - 1, Math.floor((t - L0) / BAR + .01))]];
      bell(pick(c.slice(2)) + 24, t + .05, 3.4, has('bell') ? .07 : .05);                            // 灯った合図
      const c2 = sp[i];
      if (!c2) return;
      if (c2.rar === 'gold') { voice([74, 78, 81], t + .05, 1.7, .02); bell(86, t + .12, 3.2, .07); }
      else if (c2.rar === 'silver') [90, 93, 95, 98, 102].forEach((n, q) => bell(n, t + .08 + q * .07, 1.8, .05));
    });
    solo(line, .05);
    const t2 = L0 + 7 * BAR;                                                                        // 光の粒が灯籠へ
    choir([59, 62, 67, 71], t2, BAR, .02 * cv, 'ah'); strings([55, 59, 62, 67, 71], t2, BAR, .016, 2400); bass(31, t2, BAR, .08);
    choir([61, 64, 69, 73], t2 + BAR, BAR, .022 * cv, 'ah'); strings([57, 61, 64, 69, 73], t2 + BAR, BAR, .018, 2800); bass(33, t2 + BAR, BAR, .08);
    for (let k = 0; k < 16; k++) harp([74, 76, 78, 81, 83, 85, 86, 88][k % 8], t2 + BAR + k * BEAT / 4, 1.2, .025 + k * .002);
    const t3 = t2 + 2 * BAR;                                                                        // 天窓の光
    if (!asc) {
      choir([62, 66, 69, 74, 78], t3, 5.5, .026 * cv, 'ah'); strings([50, 57, 62, 66, 69, 74], t3, 5.5, .02, 3000); bass(38, t3, 5.5, .1);
      if (has('organ')) organ([50, 57, 62, 66], t3, 5.5, .012);
      [86, 81, 78, 74, 69, 66, 62].forEach((n, i) => bell(n, t3 + .1 + i * .22, 4, .06));
      return;
    }
    // 55秒（2026-11-01〜）：作品と精霊が柱のまわりを回るあいだは、和音が1つずつめぐり、ハープが輪を描くように上り下りする →
    // 天窓へ昇るときは、和音が上がっていき、ハープが駆け上がる → 光に入るところで D の和音がいちばん大きくひらき、鈴が降りて、白い画面のあいだ響く
    const [, o0, u0, u1] = asc, OR = pick([['D', 'Bm', 'G', 'A'], ['D', 'G', 'Bm', 'Asus'], ['D', 'Em', 'G', 'A']]), ob = (u0 - t3) / OR.length;
    OR.forEach((k, i) => {
      const t = t3 + i * ob, c = C[k], g = .8 + i * .06;
      choir(c.slice(1, 4).map(n => n + 12), t, ob + .3, .022 * g * cv, 'ah'); strings(c.slice(1), t, ob + .2, .018 * g, 2600 + i * 200); bass(c[0] - 12 + (c[0] < 44 ? 12 : 0), t, ob, .08 * g);
      if (has('organ')) organ(c.slice(1, 4), t, ob, .01 * g);
      const ring = [1, 2, 3, 4, 3, 2, 1, 2].map(j => c[j] + 12);
      for (let q = 0; q < 8; q++) harp(ring[q] + (q > 3 ? 12 : 0), t + q * ob / 8, 1.6, .03 + .004 * q);
    });
    const ud = u1 - u0;
    [['G', 0], ['A', .33], ['Asus', .66]].forEach(([k, p]) => { const t = u0 + p * ud, c = C[k]; choir(c.slice(1, 4).map(n => n + 12), t, ud / 3 + .3, .026 * cv, 'ah'); strings(c.slice(1), t, ud / 3 + .2, .02, 3000 + p * 2000); bass(c[0] - 12 + (c[0] < 44 ? 12 : 0), t, ud / 3, .09); });
    for (let k = 0; k < 24; k++) harp([62, 66, 69, 74, 78, 81, 86, 90][k % 8] + (k >= 16 ? 0 : 0), u0 + .4 + k * (ud - .6) / 24, 1.4, .022 + k * .002);
    choir([62, 66, 69, 74, 78], u1, 7, .03 * cv, 'ah'); strings([50, 57, 62, 66, 69, 74], u1, 7, .022, 3200); bass(38, u1, 7, .11);
    if (has('organ')) organ([50, 57, 62, 66], u1, 7, .014);
    [86, 81, 78, 74, 69, 66, 62].forEach((n, i) => bell(n, u1 + .1 + i * .22, 4, .06));
  };
  // お別れの映像の曲（夜明けの20秒の映像・2026-11-04〜 重吉さんの決め）：前へ進む4拍子の曲（ニ長調・128 の速さ・1小節 1.875秒）。
  // 参考にした曲の雰囲気（和音がふくらんで入り、8分の刻みとバスドラムで前へ進む、明るく力強い曲）で、曲そのものは写さず一から作った。
  // ドラムと刻むシンセは頭から鳴り、15秒まで少しずつ大きくなる。始めの7拍（約3.3秒）は A の和音がふくらみ → D | A/C# | G | A | Bm | G | A（1拍）で旋律が足されていく →
  // 館が光り輝く 15秒（8小節目の頭）でシンバルと一緒にホ長調へ一段上がり、いちばん満ちる（直前にスネアの連打）。ページが 19秒から4秒で小さくして止める（映像が薄れはじめる 18秒より1秒あと）
  const DAWN_PLAN = ({ kick, hat, snare, crash, pulse, solo, choir, haze: strings, bass, bell, harp, riser }) => {
    const B = 1.875, q = B / 4, e8 = q / 2, O = 3 * q, A1 = 7 * B + 3 * q;  // O：出だしを3拍（約1.4秒）のばした分（2026-11-04 重吉さん「最初の部分ももう1秒長く」「最初のシンセを0.5秒長く」）。そのぶん 15秒の手前の A を1拍に詰めて、15秒はそのまま
    const CH = [[45, [57, 64, 69, 71]], [38, [62, 66, 69, 74]], [37, [61, 64, 69, 73]], [43, [62, 67, 71, 74]], [45, [61, 64, 69, 73]], [47, [62, 66, 71, 74]], [43, [62, 67, 71, 74]]];
    strings(CH[0][1], 0, B + O + .3, .02, 2600); bass(CH[0][0] - 12, .3, B + O - .2, .05); riser(.2, B + O - .2, .03);
    CH.forEach(([r, c], i) => { if (!i) return; const t = i * B + O, g = Math.min(1, .55 + i * .07);
      strings(c, t, B + .15, .014 * g, 1500 + i * 220); bass(r - 12 + (r < 40 ? 12 : 0), t, B, .07 * g); if (i >= 5) choir(c.slice(0, 3), t, B + .2, .013 * g, 'ah');
    });
    // ドラムは頭から最後と同じ刻み（2026-11-04 重吉さん「最後のドラムが心地いいので、出だしもこれから」）：4分のバスドラム・裏の8分のハイハット・2拍目と4拍目のスネア
    // 刻むシンセ（ギターのような音）も頭から。どちらも 0秒の小さめ（35%）から 15秒のいちばん大きいところまで、少しずつ大きくする（重吉さん「もう少し長く徐々に大きく」）
    const up = tt => tt >= 15 ? 1 : .35 + .65 * Math.pow(tt / 15, 1.3), root = tt => tt >= 15 ? 40 : tt < B + O ? CH[0][0] : CH[Math.min(6, Math.floor((tt - O) / B))][0];
    const drums = (t0, t1) => { for (let k = 0, tt = t0; tt < t1 - .01; k++, tt = t0 + k * e8) { const g = up(tt), r = root(tt);
      pulse(r + (k % 2 ? 24 : 12), tt, e8 * .9, (k % 2 ? .026 : .034) * g, 2000); if (k % 2) hat(tt, .04 * g); else kick(tt, .4 * g); if (k % 4 === 2) snare(tt, .06 * g); } };
    drums(0, A1);
    for (let k = 0; k < 2; k++) pulse(45 + (k % 2 ? 24 : 12), A1 + k * e8, e8 * .9, k % 2 ? .026 : .034, 2000);  // 連打のあいだも刻みは続ける
    // 6小節目（G）のあと A へ解けて、スネアの連打で 15秒へ
    strings([61, 64, 69, 73], A1, q, .018, 3000);
    for (let k = 0; k < 8; k++) snare(A1 + k * e8 / 4, .025 + k * .008);
    riser(7 * B, B, .05);
    solo([[78, 1 * B + O, q * 1.5], [76, 1 * B + O + q * 1.5, q * .5], [74, 1 * B + O + q * 2, q], [69, 1 * B + O + q * 3, q],
      [73, 2 * B + O, q * 1.5], [74, 2 * B + O + q * 1.5, q * .5], [76, 2 * B + O + q * 2, q * 2],
      [74, 3 * B + O, q], [71, 3 * B + O + q, q], [74, 3 * B + O + q * 2, q], [79, 3 * B + O + q * 3, q],
      [78, 4 * B + O, q * 1.5], [76, 4 * B + O + q * 1.5, q * .5], [76, 4 * B + O + q * 2, q * 2],
      [78, 5 * B + O, q], [81, 5 * B + O + q, q], [83, 5 * B + O + q * 2, q * 1.5], [81, 5 * B + O + q * 3.5, q * .5],
      [79, 6 * B + O, q], [78, 6 * B + O + q, q], [79, 6 * B + O + q * 2, q], [83, 6 * B + O + q * 3, q],
      [85, A1, q], [88, 15, 3.4]], .06);
    [[69, 1 * B + O], [73, 2 * B + O], [74, 3 * B + O], [73, 4 * B + O], [78, 5 * B + O], [74, 6 * B + O]].forEach(([n, t]) => bell(n + 12, t, 1.8, .03));
    // 15秒：ホ長調へ。シンバル・合唱「アー」・弦・低い響き・鈴が降りて、ハープが上る。刻みとバスドラムは続く（ページが小さくする）
    const t = 15, r = 40, c = [64, 68, 71, 76, 80];
    crash(t, .12); choir(c, t, 6, .028, 'ah'); strings([52, 59, 64, 68, 71, 76], t, 6, .022, 3400); bass(r, t, 6, .11);
    [88, 83, 80, 76, 71, 68, 64].forEach((n, i) => bell(n, t + .15 + i * .24, 3.6, .05)); [76, 80, 83, 88, 92].forEach((n, i) => harp(n, t + 2.2 + i * .14, 2, .04));
    drums(t, t + 36 * e8);  // 2026-11-04 重吉さん「この部分をもう1秒長く」：最後の盛り上がりを1秒のばし、19秒から4秒で小さくする（NightFilm.dawn の fade の hold）
  };
  // 夜明けの映像に合わせて鳴らす。ac は、ページが前もって押したときに作った音の場（スマホで音が出るように）。off：映像がすでに進んだ秒
  function dawn(ac, off = 0) {
    const out = ac.createGain(); out.connect(ac.destination);
    const s = score(ac, out, (P => api => { const sh = f => (n, t, ...r) => (t - off > -.05 ? f(n, t - off, ...r) : null);
      return P(Object.assign({}, api, { harp: sh(api.harp), bell: sh(api.bell), bass: sh(api.bass), haze: sh(api.haze), choir: sh(api.choir), pulse: sh(api.pulse),
        kick: (t, v) => (t - off > -.05 ? api.kick(t - off, v) : null), hat: (t, v) => (t - off > -.05 ? api.hat(t - off, v) : null), snare: (t, v) => (t - off > -.05 ? api.snare(t - off, v) : null), crash: (t, v) => (t - off > -.05 ? api.crash(t - off, v) : null),
        riser: (t, d, v) => (t - off > -.05 ? api.riser(t - off, d, v) : null),
        solo: (line, v) => { const L = line.map(([n, t, d]) => [n, t - off, d]).filter(x => x[1] >= 0); if (L.length) api.solo(L, v); } })); })(DAWN_PLAN), null, 'D', 20);
    return { fade: (d, hold = 0) => { const t = ac.currentTime + hold; out.gain.cancelScheduledValues(ac.currentTime); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0, t + d); setTimeout(() => { try { out.disconnect(); } catch (e) { /* もう外れている */ } }, (hold + d) * 1000 + 200); },
      stop: () => { s.stop(); setTimeout(() => { try { out.disconnect(); } catch (e) { /* もう外れている */ } }, 600); } };
  }
  // 最後の通路の曲（12秒）：額縁が掛かる鈴 → 歩く脈 → 光の扉で和音
  const WALK_PLAN = ({ bell, haze, sub, arp, riser, CH }) => {
    haze(CH.Bb.pad, 0, 2.2, .026, 2200); [70, 74, 77, 82].forEach((n, i) => bell(n, .3 + i * .18, 2.6, .1));
    haze(CH.Cm.pad, 2.0, 3.2, .02); haze(CH.Eb.pad, 5.2, 3.2, .022); arp(CH.Cm, 2.2, 5.2, .012, .022); arp(CH.Eb, 5.2, 8.4, .022, .03);
    for (let t = 2.4; t < 8.4; t += 1.25) sub((t < 5.2 ? CH.Cm.b : CH.Eb.b) - 12, t, .1);
    riser(8.4, 1.8, .04); haze(CH.Bb.pad.concat([69, 74]), 10.2, 2.4, .032, 2600);
    [58, 62, 65, 69, 74].forEach((n, i) => bell(n, 10.2 + i * .08, 2.6, .09));
  };
  function audio(play) {
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    const ac = new AC(), dest = ac.createMediaStreamDestination ? ac.createMediaStreamDestination() : null, out = ac.createGain();
    out.connect(ac.destination); if (dest) out.connect(dest);
    return { ac, dest, out };
  }
  function recorder(cv, dest) {
    if (!window.MediaRecorder || !cv.captureStream) return null;
    const types = ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4', 'video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
    const type = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)); if (!type) return null;
    const st = cv.captureStream(24); if (dest) dest.stream.getAudioTracks().forEach(t => st.addTrack(t));
    // 録画は 3.5Mbps（55秒で約25MB。2026-11-04 に 6Mbps から下げた。iPhone のメモリのため）
    try { const r = new MediaRecorder(st, { mimeType: type, videoBitsPerSecond: 3.5e6 }); r.ext = type.startsWith('video/mp4') ? 'mp4' : 'webm'; return r; } catch (e) { return null; }
  }
  // 同じ動画は1回だけ読む（最後の通路に入ったときに warm() で先に読みはじめる。2026-10-26）
  const VID = {};
  function videoEl(base) {
    if (VID[base]) return VID[base];
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = base + (v.canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4') + (base.endsWith('lastroom') ? LRV : '');
    const p = new Promise((ok, ng) => { v.oncanplaythrough = () => { v.oncanplaythrough = null; ok(v); }; v.onerror = () => { delete VID[base]; ng(new Error('video')); }; v.load(); });
    return (VID[base] = p);
  }
  const warm = () => { videoEl(GAL + 'lastroom').catch(() => {}); getJSON(GAL + 'last.json' + LRV).catch(() => {}); };
  const onFrames = (v, fn) => {  // コマが変わるたびに描く
    let stop = false;
    if (v.requestVideoFrameCallback) { const cb = (_, m) => { if (stop) return; fn(m.mediaTime); v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
    else { const cb = () => { if (stop) return; fn(v.currentTime); requestAnimationFrame(cb); }; requestAnimationFrame(cb); }
    return () => { stop = true; };
  };

  // ======== 1. 最後の部屋 ========
  // o = { cards:[{art, th, rar, t, n}]（7体まで）, hues:[色]（守り神の人生地図の色。無ければ金）, title, sub, tx:{play, skip, save, close, noRec, made},
  //       story:{title, lines:[精霊ごと], close, music}（AI が書いたその夜のお話。無ければ字幕なし・いつもの題と曲）, congrats（終わりの白い画面のお祝いの言葉） }
  // 字幕は録画に入るよう canvas に描く。幅に合わせて2行まで折り返す
  function wrap(g, text, max) {
    const out = [], words = /\s/.test(text) ? text.split(/(\s+)/) : [...text]; let line = '';
    for (const w of words) { if (line && g.measureText(line + w).width > max) { out.push(line.trim()); line = w.trimStart(); } else line += w; }
    if (line.trim()) out.push(line.trim());
    if (out.length > 2) { out.length = 2; out[1] = out[1].replace(/.$/, '…'); }
    return out;
  }
  function subtitle(g, W, H, text, a) {
    if (!text || a <= 0) return;
    g.font = `500 ${Math.round(W / 24)}px "Noto Serif JP", serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    const ls = wrap(g, text, W * .84), lh = W / 24 * 1.45, y0 = H * .865 - (ls.length - 1) * lh / 2;
    g.fillStyle = `rgba(8,8,14,${.55 * a})`; g.fillRect(W * .04, y0 - lh * .75, W * .92, lh * (ls.length + .5));
    g.fillStyle = `rgba(250,236,200,${a})`; ls.forEach((l, k) => g.fillText(l, W / 2, y0 + k * lh));
  }
  async function room(o) {
    const L = layer('room'), cv = L.cv, g = cv.getContext('2d');
    L.cap.textContent = o.tx.loading || '';
    let J, v;
    try { [J, v] = await Promise.all([getJSON(GAL + 'last.json' + LRV), videoEl(GAL + 'lastroom')]); } catch (e) { close(); return null; }
    const W = J.w, H = J.h; cv.width = W; cv.height = H;
    const vc = document.createElement('canvas'); vc.width = W; vc.height = H * 2; const vg = vc.getContext('2d', { willReadFrequently: true });
    const out = g.createImageData(W, H);
    const fcs = await Promise.all(J.wins.map((w, i) => o.cards[i] ? frameCanvas(Object.assign({ k: w.kind, glow: TYC[o.cards[i].t] }, o.cards[i]), FS) : frameCanvas({ k: w.kind, t: '光' }, FS)));
    const hues = (o.hues && o.hues.length ? o.hues : ['#f3d79a', '#f6e2b0', '#ffe9c0']);
    const ths = await Promise.all(o.cards.map(c => img(c.dx || c.th))); // 終わりの7体の並びは、作品が見える目録の小さな絵（2026-10-28）
    // その夜だけの守り神の姿（カードの小さな絵の、姿の窓の真ん中）。光の柱の中に、ふちをぼかして出す
    function figCut(gim) {  // カードの小さな絵の、姿の窓の真ん中を、ふちをぼかして切り出す（320×240）
      const c = document.createElement('canvas'), sw = gim.width * .6, sh = gim.height * .29, sx = gim.width * .2, sy = gim.height * .14;
      c.width = 320; c.height = 240; const q = c.getContext('2d');
      q.drawImage(gim, sx, sy, sw, sh, 0, 0, 320, 240);
      q.globalCompositeOperation = 'destination-in';
      q.setTransform(1, 0, 0, .75, 0, 30); const m = q.createRadialGradient(160, 160, 80, 160, 160, 158); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
      q.fillStyle = m; q.fillRect(0, 0, 320, 320); q.setTransform(1, 0, 0, 1, 0, 0);
      return c;
    }
    const G = o.guard || null, gim = G ? await img(G.th) : null, gcv = gim ? figCut(gim) : null;
    // 舞い上がる場面（2026-11-01〜、重吉さんの決め）：額縁から抜け出した作品（細い金のふち）と、分かれて飛ぶ精霊の姿。
    // 動き（3Dの位置）は Blender が決め、last.json の f[].x にコマごとの画面の位置と奥行きがある。ここでは奥から順に描くだけ
    const X = J.asc || null, AW = 260, AH = Math.round(AW / .652);
    const arts = X ? await Promise.all(J.wins.map(async (w, i) => {
      const c = o.cards[i]; if (!c) return null; const im = await img(c.art ? MUS + c.art : ''), a = document.createElement('canvas'); a.width = AW; a.height = AH; const q = a.getContext('2d');
      if (im) cover(q, im, 0, 0, AW, AH); else { q.fillStyle = TYC[c.t] || '#8a96a6'; q.fillRect(0, 0, AW, AH); }
      q.strokeStyle = '#e2bd6a'; q.lineWidth = 8; q.strokeRect(4, 4, AW - 8, AH - 8); q.strokeStyle = 'rgba(255,242,205,.85)'; q.lineWidth = 1.5; q.strokeRect(11, 11, AW - 22, AH - 22);
      return a;
    })) : [];
    const sprs = X ? await Promise.all(J.wins.map(async (w, i) => {
      const c = o.cards[i]; if (!c) return null; const fg = c.fig ? await img(c.fig) : null; if (fg) return fg; const th = await img(c.th); return th ? figCut(th) : null;
    })) : [];
    const lay = X ? Object.assign(document.createElement('canvas'), { width: J.w, height: J.h }) : null;
    // あなたの写真（2026-11-01〜、重吉さんの決め）：光の柱の真ん中に、ふちをぼかした楕円で浮かべる。守り神はそのそばで静かに見守る。
    // 自撮りでも、前からある写真でもよい。顔は探さず、写真の真ん中（少し上寄り）を使う。この端末の中だけで、AI にも当方にも送らず、残さない
    let meCv = null, mePt = null, meAt = 0, meJob = 0, meMix = null, meURL = null;
    const ME_W = 300, ME_H = 380;
    function meCrop(im) {  // 写真の真ん中（少し上寄り）を 300×380 に
      if (!im) return null;
      const c = document.createElement('canvas'); c.width = ME_W; c.height = ME_H; const q = c.getContext('2d', { willReadFrequently: true });
      const r = ME_W / ME_H, iw = im.width, ih = im.height, sw = iw / ih > r ? ih * r : iw, sh = iw / ih > r ? ih : iw / r;
      q.drawImage(im, (iw - sw) / 2, Math.max(0, (ih - sh) * .35), sw, sh, 0, 0, ME_W, ME_H);
      return c;
    }
    function meMask(c) {  // ふちをぼかした楕円
      const q = c.getContext('2d'); q.globalCompositeOperation = 'destination-in';
      q.setTransform(1, 0, 0, ME_H / ME_W, 0, 0); const m = q.createRadialGradient(150, 150, 75, 150, 150, 150); m.addColorStop(0, '#000'); m.addColorStop(1, 'rgba(0,0,0,0)');
      q.fillStyle = m; q.fillRect(0, 0, ME_W, ME_W); q.setTransform(1, 0, 0, 1, 0, 0); q.globalCompositeOperation = 'source-over';
      return c;
    }
    // 光の肖像（2026-11-04〜、重吉さんの決め）：あなたの写真を、端末の中だけで名画の肖像画のように描きかえる（はじめ控えめにしたら「ほとんど変わらない、大胆に」）。
    // 筆の面（クワハラの筆を重ねる）・色の段・輪郭の線・古典の絵の色の並び（こげ茶→琥珀→象牙）・明暗法（まわりを闇に）・画布の目・ほのかな発光。
    // 真ん中（顔のあたり）は元の細かさを少し残す。顔の作りは変えない（美形化・笑顔・性別の変換はしない）。外のライブラリも AI も使わず、この端末の中の計算だけ。
    // 段を分けて少しずつ計算し、画面を止めない。できたら光の中でゆっくり切り替える（できる前は元の写真）。待たせない・失敗も出さない
    const PORTRAIT = {  // A 油絵（明暗法）・B 金の光・C 厚塗りの油絵（見本は共有フォルダ lantern-portrait/）
      A: { kuw: [5, 3], detail: .05, face: .45, step: 20, ink: .35, sat: 1.05, tone: .55, gam: .9, pal: [[28, 16, 10], [96, 56, 30], [190, 130, 70], [244, 214, 160], [255, 246, 220]], spot: .8, canvas: 1, glow: .5, glowT: 190 },
      B: { kuw: [4], detail: .05, face: .4, step: 0, ink: .2, sat: .35, tone: .9, gam: .85, pal: [[20, 12, 6], [110, 70, 25], [214, 160, 70], [255, 226, 150], [255, 250, 235]], spot: .55, canvas: .6, glow: 1.1, glowT: 160 },
      C: { kuw: [6, 3], detail: 0, face: .4, step: 0, ink: .55, sat: 1.15, tone: .4, gam: 1, pal: [[24, 18, 14], [110, 66, 40], [210, 150, 90], [250, 228, 185]], spot: .6, canvas: 1.6, glow: .35, glowT: 205 },
    }.A;
    const tick = () => new Promise(r => setTimeout(r, 0));
    async function portrait(src, job) {
      const S = PORTRAIT, w = ME_W, h = ME_H, n = w * h, d = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data;
      const W1 = w + 1, sum = (T, x0, y0, x1, y1) => T[y1 * W1 + x1] - T[y0 * W1 + x1] - T[y1 * W1 + x0] + T[y0 * W1 + x0];
      const integ = f => { const T = new Float64Array(W1 * (h + 1)); for (let y = 0; y < h; y++) { let a = 0; for (let x = 0; x < w; x++) { a += f(y * w + x); T[(y + 1) * W1 + x + 1] = T[y * W1 + x + 1] + a; } } return T; };
      const gone = async () => { await tick(); return job !== meJob; };
      let R = new Float32Array(n), G = new Float32Array(n), B = new Float32Array(n);
      for (let i = 0; i < n; i++) { R[i] = d[i * 4]; G[i] = d[i * 4 + 1]; B[i] = d[i * 4 + 2]; }
      const R0 = R.slice(), G0 = G.slice(), B0 = B.slice();
      // 1) 筆の面：クワハラの筆（4つの区画のうち、いちばんむらの少ない区画の色）を、太い筆→細い筆と重ねる
      for (const K of S.kuw) {
        const Y = new Float32Array(n); for (let i = 0; i < n; i++) Y[i] = .299 * R[i] + .587 * G[i] + .114 * B[i];
        const SR = integ(i => R[i]), SG = integ(i => G[i]), SB = integ(i => B[i]), SY = integ(i => Y[i]), SY2 = integ(i => Y[i] * Y[i]);
        if (await gone()) return null;
        const nR = new Float32Array(n), nG = new Float32Array(n), nB = new Float32Array(n);
        for (let y = 0; y < h; y++) {
          for (let x = 0; x < w; x++) {
            let best = 1e18, br = 0, bg = 0, bb = 0;
            for (let k = 0; k < 4; k++) {
              const x0 = Math.max(0, k & 1 ? x : x - K), x1 = Math.min(w, (k & 1 ? x + K : x) + 1), y0 = Math.max(0, k & 2 ? y : y - K), y1 = Math.min(h, (k & 2 ? y + K : y) + 1), c = (x1 - x0) * (y1 - y0);
              const m = sum(SY, x0, y0, x1, y1) / c, v = sum(SY2, x0, y0, x1, y1) / c - m * m;
              if (v < best) { best = v; br = sum(SR, x0, y0, x1, y1) / c; bg = sum(SG, x0, y0, x1, y1) / c; bb = sum(SB, x0, y0, x1, y1) / c; }
            }
            const i = y * w + x; nR[i] = br; nG[i] = bg; nB[i] = bb;
          }
          if (y % 24 === 23 && await gone()) return null;
        }
        R = nR; G = nG; B = nB;
      }
      const Y0 = new Float32Array(n); for (let i = 0; i < n; i++) Y0[i] = .299 * R[i] + .587 * G[i] + .114 * B[i];
      const out = new Uint8ClampedArray(n * 4), cx = w / 2, cy = h * .42, pal = S.pal;
      const hash = (x, y) => { const v = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return v - Math.floor(v); };
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const i = y * w + x;
          // 2) 真ん中（顔のあたり）ほど元の細かさを残す（別人にしない）
          const dc = Math.hypot((x - cx) / (w * .3), (y - cy) / (h * .3)), dt = S.detail + S.face * Math.max(0, 1 - dc);
          let r = R[i] * (1 - dt) + R0[i] * dt, g2 = G[i] * (1 - dt) + G0[i] * dt, b = B[i] * (1 - dt) + B0[i] * dt;
          if (S.step) { const st = S.step; r = Math.round(r / st) * st; g2 = Math.round(g2 / st) * st; b = Math.round(b / st) * st; }  // 3) 色の段
          if (S.ink) {  // 4) 輪郭を筆の線のように暗く
            const xl = Math.max(0, x - 1), xr = Math.min(w - 1, x + 1), yu = Math.max(0, y - 1), yd = Math.min(h - 1, y + 1);
            const e = Math.min(1, Math.hypot(Y0[y * w + xr] - Y0[y * w + xl], Y0[yd * w + x] - Y0[yu * w + x]) / 90) * S.ink; r *= 1 - e; g2 *= 1 - e; b *= 1 - e * .8;
          }
          // 5) 色：明るさの並びだけを古典の絵の色へ寄せ、肌や服の色の違いは残す（暗い肌を白っぽくしない）
          const l = .299 * r + .587 * g2 + .114 * b;
          r = l + (r - l) * S.sat; g2 = l + (g2 - l) * S.sat; b = l + (b - l) * S.sat;
          const sg = Math.pow(l / 255, S.gam) * (pal.length - 1), k = Math.min(pal.length - 2, Math.floor(sg)), f = sg - k, P0 = pal[k], P1 = pal[k + 1];
          r = r * (1 - S.tone) + (P0[0] + (P1[0] - P0[0]) * f + (r - l) * .6) * S.tone; g2 = g2 * (1 - S.tone) + (P0[1] + (P1[1] - P0[1]) * f + (g2 - l) * .6) * S.tone; b = b * (1 - S.tone) + (P0[2] + (P1[2] - P0[2]) * f + (b - l) * .6) * S.tone;
          // 6) 明暗法：真ん中に光、まわりは闇へ
          const sp = 1 - S.spot * Math.min(1, Math.max(0, (Math.hypot((x - cx) / (w * .42), (y - cy) / (h * .5)) - .35) / .75)); r *= sp; g2 *= sp; b *= sp * .95;
          // 7) 画布の目と筆のむら
          const wv = (Math.sin(x * 2.1) * Math.sin(y * 2.1) * 6 + (hash(x >> 1, y >> 2) - .5) * 14) * S.canvas; r += wv; g2 += wv; b += wv * .9;
          out[i * 4] = r; out[i * 4 + 1] = g2; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
        }
        if (y % 48 === 47 && await gone()) return null;
      }
      // 8) ほのかな発光：明るい所をぼかして、金色に足す
      const SL = integ(i => Math.max(0, .299 * out[i * 4] + .587 * out[i * 4 + 1] + .114 * out[i * 4 + 2] - S.glowT)), GR = 9;
      if (await gone()) return null;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = y * w + x, x0 = Math.max(0, x - GR), x1 = Math.min(w, x + GR + 1), y0 = Math.max(0, y - GR), y1 = Math.min(h, y + GR + 1), gl = sum(SL, x0, y0, x1, y1) / ((x1 - x0) * (y1 - y0)) * S.glow;
        out[i * 4] += gl; out[i * 4 + 1] += gl * .85; out[i * 4 + 2] += gl * .55;
      }
      const c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').putImageData(new ImageData(out, w, h), 0, 0);
      return meMask(c);
    }
    // 光の柱の中のあなたの写真を描く。肖像ができていれば、できた時から1.6秒かけて重ねて切り替える
    function meDraw(x, y, w, h, a) {
      const k = mePt ? clamp((performance.now() - meAt) / 1600) : 0;
      if (k >= 1) { g.globalAlpha = a; g.drawImage(mePt, x, y, w, h); g.globalAlpha = 1; return; }
      let src = meCv;
      if (k > 0) {
        if (!meMix) meMix = Object.assign(document.createElement('canvas'), { width: ME_W, height: ME_H });
        const mq = meMix.getContext('2d'); mq.clearRect(0, 0, ME_W, ME_H); mq.drawImage(meCv, 0, 0); mq.globalAlpha = k; mq.drawImage(mePt, 0, 0); mq.globalAlpha = 1; src = meMix;
        halo(x + w / 2, y + h * .45, w * .7, 'rgba(255,236,190,1)', .35 * Math.sin(Math.PI * k) * a);  // 切り替わるとき、光がふわっと
      }
      g.globalAlpha = a; g.drawImage(src, x, y, w, h); g.globalAlpha = 1;
    }
    // 好きな画像（2026-10-27〜、重吉さんの決め）：1枚を、柱と柱のあいだの壁ごとに壁いっぱいに貼る（はみ出しは切る）。画像はこの端末の中だけで、どこにも送らない。
    // 壁の所は、動画の抜きの濃さが 128（encode-film.sh wall）。壁の上の点は last.json の cam（カメラの位置と光線の向き）と円い壁の交わりで求める
    const RR = J.rr || 4.2, WALL = J.wall || 4.4, BAYS = J.bays || 8, A0 = J.a0 || -Math.PI / 2, SB = 2 * Math.PI / BAYS;
    const TW = 768, TH = Math.round(TW * WALL / (SB * RR));  // 柱と柱のあいだの壁1枚の形
    let texs = null, picURL = null;
    const texOf = im => { const c = document.createElement('canvas'); c.width = TW; c.height = TH; const q = c.getContext('2d', { willReadFrequently: true }); cover(q, im, 0, 0, TW, TH); return q.getImageData(0, 0, TW, TH).data; };
    function setPic(im) { texs = im ? [texOf(im)] : null; }
    // おまかせ（2026-10-28〜、重吉さんの決め）：その夜の7体の作品を、石の壁の色の上に金色の淡い模様として重ねる。
    // 地は WL_LIT（絵の壁の色）なので、作品の無い所はもとの石の壁のまま。壁ごとに並びをずらす
    const autoArts = (await Promise.all(o.cards.map(c => img(c.art ? MUS + c.art : '')))).filter(Boolean);
    function autoTex(b) {
      const c = document.createElement('canvas'); c.width = TW; c.height = TH; const q = c.getContext('2d', { willReadFrequently: true });
      q.fillStyle = `rgb(${WL_LIT.join(',')})`; q.fillRect(0, 0, TW, TH);
      const n = autoArts.length, cols = 3, cw = TW / cols * 1.15, rows = Math.ceil(TH / (cw * .9)) + 1;
      q.filter = 'sepia(.55) saturate(1.1) brightness(1.05)'; q.globalCompositeOperation = 'source-over';
      for (let r = 0; r < rows; r++) for (let k = -1; k <= cols; k++) {
        const im = autoArts[(b * 3 + r * 2 + k + 7 * n) % n], x = k * TW / cols + (r % 2 ? TW / cols / 2 : 0) - cw * .075, y = r * cw * .9 - cw * .3;
        q.globalAlpha = .62; q.save(); q.beginPath(); q.rect(x, y, cw, cw * .9); q.clip(); cover(q, im, x, y, cw, cw * .9); q.restore();
      }
      q.filter = 'none'; q.globalCompositeOperation = 'source-over';
      const e = q.createRadialGradient(TW / 2, TH / 2, Math.min(TW, TH) * .25, TW / 2, TH / 2, Math.max(TW, TH) * .7);  // ふちは石の壁へ溶かす
      e.addColorStop(0, 'rgba(0,0,0,0)'); e.addColorStop(1, `rgba(${WL_LIT.join(',')},.7)`); q.globalAlpha = 1; q.fillStyle = e; q.fillRect(0, 0, TW, TH);
      return q.getImageData(0, 0, TW, TH).data;
    }
    const setAuto = () => { texs = autoArts.length ? Array.from({ length: BAYS }, (_, b) => autoTex(b)) : null; };
    // 20秒のときの時刻（コマ）→ この映像のコマ（lastroom.py の T と同じ。2026-10-27 に40秒にした）
    const L0 = J.lit0 || 70, GP = J.gap || 30, NW = J.wins.length;  // 額縁の数（2026-11-01 に7つから4つへ。額縁の所の長さは同じ）
    const T = f => { if (!J.lit0) return f; const P = J.seg || [[0, 70, 0, L0], [70, 280, L0, L0 + NW * GP], [280, 380, L0 + NW * GP, Math.round(J.n * 795 / 960)], [380, 480, Math.round(J.n * 795 / 960), J.n]];  // 55秒（2026-11-01〜）は last.json の seg
      for (const [a0, a1, b0, b1] of P) if (f <= a1) return b0 + (f - a0) * (b1 - b0) / (a1 - a0); return J.n; };
    const K = GP / 30, lit = i => L0 + i * GP;  // 額縁 i が灯るコマ
    if (o.pic) setPic(await img(o.pic));
    const glowRnd = seeded('glow' + (o.seed || '')), glows = J.wins.map(() => ({ r: .55 + glowRnd() * .35, ph: glowRnd() * 6.28 }));
    const beam = document.createElement('canvas');
    // 舞い上がる場面を描く：作品・精霊・あなたの写真・守り神を、奥（カメラから遠い）から順に。昇りきるところで光に溶ける
    function halo(x, y, r, col, a) {
      if (a <= 0 || r <= 0) return; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.globalCompositeOperation = 'screen'; g.globalAlpha = clamp(a); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    }
    function ascend(f, x) {
      const up = clamp((f - X[2]) / (X[3] - X[2])), fade = 1 - clamp((f - (X[3] - 26)) / 30), ga = clamp((f - T(330)) / (T(380) - T(330))), it = [];
      x.a.forEach((a, i) => arts[i] && it.push({ d: a[1], k: 'a', i, a }));
      x.s.forEach((p, i) => sprs[i] && it.push({ d: p[3], k: 's', i, p }));
      if (meCv && ga > 0) it.push({ d: x.me[3], k: 'me', p: x.me });
      if (G && ga > 0) it.push({ d: x.g[3], k: 'g', p: x.g });
      it.sort((p, q) => q.d - p.d);
      const white = clamp((up - .55) / .45);  // 天窓に近づくほど白く光る
      for (const t of it) {
        if (t.d <= .1) continue;
        if (t.k === 'a') {
          const e = clamp((f - (X[0] + t.i * 10)) / 10) * fade; if (e <= 0) continue;
          const cs = t.a[0].map(([u, v]) => [u * W, v * H]), cx = (cs[0][0] + cs[2][0]) / 2, cy = (cs[0][1] + cs[2][1]) / 2, sz = Math.hypot(cs[2][0] - cs[0][0], cs[2][1] - cs[0][1]);
          halo(cx, cy, sz * 1.1, TYC[o.cards[t.i].t] || '#e8d79a', .55 * e);
          const lg = lay.getContext('2d'); lg.clearRect(0, 0, W, H); warp(lg, arts[t.i], homography([[0, 0], [AW, 0], [AW, AH], [0, AH]], cs), 4);
          if (white > 0) { lg.globalCompositeOperation = 'source-atop'; lg.fillStyle = `rgba(255,248,232,${white * .85})`; lg.fillRect(0, 0, W, H); lg.globalCompositeOperation = 'source-over'; }
          g.globalAlpha = e; g.drawImage(lay, 0, 0); g.globalAlpha = 1;
        } else if (t.k === 's') {
          const e = clamp((f - (X[0] + t.i * 10 + 15)) / 20) * fade; if (e <= 0) continue;
          const [u, v, m, , sm] = t.p, z = m * H * sm, cx = u * W, cy = v * H, fl = 1 + .05 * Math.sin(f / 5 + t.i);
          halo(cx, cy, z * 1.1, '#fff4dc', .7 * e); halo(cx, cy, z * .8, TYC[o.cards[t.i].t] || '#e8d79a', .5 * e);
          const im = sprs[t.i], ar = im.width / im.height, dw = ar >= 1 ? z : z * ar, dh = (ar >= 1 ? z / ar : z) * fl;
          g.globalAlpha = e * (1 - white * .6); g.drawImage(im, cx - dw / 2, cy - dh / 2, dw, dh); g.globalAlpha = 1;
        } else if (t.k === 'me') {
          const [u, v, m] = t.p, mh = m * H * 1.6, mw = mh * 300 / 380, cx = u * W, cy = v * H;
          halo(cx, cy, mh * .85, '#fff1d0', .45 * ga * fade);
          meDraw(cx - mw / 2, cy - mh / 2, mw, mh, ga * fade * (1 - white * .5));
        } else {
          const [u, v, m] = t.p, gh = m * H * .62, gw = gh * 4 / 3, cx = u * W, cy = v * H + Math.sin(f / 30) * H * .004;
          halo(cx, cy, gw * .75, 'rgba(255,236,190,.9)', (.3 + .1 * Math.sin(f / 20)) * ga * fade);
          g.globalAlpha = ga * fade * (1 - white * .6); if (gcv) g.drawImage(gcv, cx - gw / 2, cy - gh / 2, gw, gh); g.globalAlpha = 1;
          const na = clamp((f - T(350)) / (T(370) - T(350))) * (1 - up);  // 名前は昇りはじめるまで
          if (G.n && na > 0) {
            g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `600 ${Math.round(W / 32)}px "Noto Serif JP", serif`;
            g.fillStyle = `rgba(255,240,205,${na})`; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8; g.fillText(G.n, cx, cy + gh / 2 + 4); g.shadowBlur = 0;
          }
        }
      }
      // みんなが天窓の光に入るとき、天窓がふわっと大きく光る
      if (F_oc(f) && up > .5) { const [ox, oy] = F_oc(f); halo(ox, oy, W * (.3 + .5 * clamp((up - .5) / .5)), 'rgba(255,248,230,1)', clamp((up - .5) / .4) * .9); }
    }
    const F_oc = f => { const q = J.f[Math.min(J.n, Math.max(1, f)) - 1].oc; return q[2] ? [q[0] * W, Math.max(0, q[1] * H)] : null; };
    function draw(f) {  // f：1〜n
      const F = J.f[Math.min(J.n, Math.max(1, f)) - 1];
      g.fillStyle = '#f7efe0'; g.fillRect(0, 0, W, H);
      F.w.forEach((q, i) => {
        if (!q[5]) return;
        const P = FR[J.wins[i].kind], map = winMap(P, q, W, H), b = q[4];
        warp(g, fcs[i], map);
        if (b < 1) {  // 灯る前は暗い（額縁の外側の四隅を暗く塗る）
          const cs = [[0, 0], [P.w, 0], [P.w, P.h], [0, P.h]].map(([x, y]) => map(x, y));
          g.fillStyle = `rgba(6,7,12,${.72 * (1 - b)})`; g.beginPath(); cs.forEach((p, k) => k ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
        }
        if (X && F.x) {  // 作品と精霊が抜け出したあとの窓は、やわらかい光だけになる
          const S = P.s, k = P.ww * SMALL / S.ww, x0 = (P.w - S.w * k) / 2 + S.l * k, y0 = P.top - S.top * k + S.t * k;
          [[P.l, P.t, P.ww, P.wh, X[0] + i * 10], [x0, y0, S.ww * k, S.wh * k, X[0] + i * 10 + 15]].forEach(([l, t, ww, wh, f0]) => {
            const e = clamp((f - f0) / 40); if (e <= 0) return;
            const cs = [[l, t], [l + ww, t], [l + ww, t + wh], [l, t + wh]].map(([x, y]) => map(x, y)), [cx, cy] = map(l + ww / 2, t + wh / 2);
            const gr = g.createRadialGradient(cx, cy, 0, cx, cy, Math.hypot(cs[2][0] - cs[0][0], cs[2][1] - cs[0][1]) * .6);
            gr.addColorStop(0, `rgba(255,244,214,${e})`); gr.addColorStop(1, `rgba(214,170,96,${e * .9})`);
            g.fillStyle = gr; g.beginPath(); cs.forEach((p, k2) => k2 ? g.lineTo(...p) : g.moveTo(...p)); g.closePath(); g.fill();
          });
        }
      });
      // Blender の絵：上半分の色に、下半分の濃さを抜きとして入れて重ねる
      vg.drawImage(v, 0, 0, W, H * 2);
      const d = vg.getImageData(0, 0, W, H * 2).data, od = out.data, n = W * H * 4;
      const C = F.cam;
      for (let i = 0, p = 0; i < n; i += 4, p++) {
        const a = d[n + i]; od[i] = d[i]; od[i + 1] = d[i + 1]; od[i + 2] = d[i + 2]; od[i + 3] = a;
        if (!C || a < 40 || a > 215) continue;
        // 壁の印（128）と、そのふちのまじり。画面の点からの光線が円い壁に当たる所
        od[i + 3] = 255;
        if (!texs) continue;
        const u = (p % W + .5) / W, v = ((p / W | 0) + .5) / H;
        const dx = C[3] * u + C[6] * v + C[9], dy = C[4] * u + C[7] * v + C[10], dz = C[5] * u + C[8] * v + C[11];
        const qa = dx * dx + dy * dy, qb = C[0] * dx + C[1] * dy, qc = C[0] * C[0] + C[1] * C[1] - RR * RR, sq = qb * qb - qa * qc;
        if (qa <= 0 || sq < 0) continue;
        const t = (-qb + Math.sqrt(sq)) / qa, X = C[0] + t * dx, Y = C[1] + t * dy, Z = C[2] + t * dz;
        let th = Math.atan2(Y, X) - A0 + SB / 2; th -= Math.floor(th / (2 * Math.PI)) * 2 * Math.PI;
        const tex = texs[Math.floor(th / SB) % texs.length], tu = (th % SB) / SB, tx = Math.min(TW - 1, Math.max(0, tu * TW | 0)), ty = Math.min(TH - 1, Math.max(0, (1 - Z / WALL) * TH | 0)), k = (ty * TW + tx) * 4;
        // 明るさと色は、絵の壁の明るさに合わせる（灯り・影・燭台の色が画像にのる）
        const w = clamp(1 - Math.abs(a - 128) / 88);
        for (let c = 0; c < 3; c++) od[i + c] = d[i + c] * (1 - w) + Math.min(255, tex[k + c] * Math.min(1.3, d[i + c] / WL_LIT[c])) * w;  // 灯籠のそばの明るい石で白く飛ばないように
      }
      const tmp = draw.t || (draw.t = Object.assign(document.createElement('canvas'), { width: W, height: H }));
      tmp.getContext('2d').putImageData(out, 0, 0); g.drawImage(tmp, 0, 0);
      // 灯った額縁のまわりに、その精霊の属性の色のうすい灯り（ゆっくりゆらぐ。大きさとゆらぎはその夜のカードから）。額縁そのものの色の灯りは frameCanvas の glow
      g.globalCompositeOperation = 'screen';
      F.w.forEach((q, i) => {
        const c = o.cards[i]; if (!q[5] || !c || q[4] <= 0) return;
        const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4 * W, cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4 * H;
        const sz = Math.hypot((q[1][0] - q[0][0]) * W, (q[1][1] - q[0][1]) * H) * (1.1 + glows[i].r), a = q[4] * (.24 + .08 * Math.sin(f / 9 + glows[i].ph));
        const gr = g.createRadialGradient(cx, cy, sz * .15, cx, cy, sz); gr.addColorStop(0, TYC[c.t] || '#e8d79a'); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = clamp(a); g.fillStyle = gr; g.fillRect(cx - sz, cy - sz, sz * 2, sz * 2);
      });
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 特別な精霊の額縁が灯るとき（2026-10-25〜）：金の光＝天窓から金の柱と金の粉、銀の光＝銀の雨。強さには関係しない（見た目と音だけ）。
      // 縁の子（2つの光がひとつに・親子の額縁を光の糸でつなぐ）は 2026-11-02 に受け継ぎをなくしたので外した
      const rr = n => { const x = Math.sin(n * 12.9898 + 78.233) * 43758.5453; return x - Math.floor(x); };
      const ctr = q => [(q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4 * W, (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4 * H];
      g.globalCompositeOperation = 'screen';
      F.w.forEach((q, i) => {
        const c = o.cards[i]; if (!c || !q[5] || (c.rar !== 'gold' && c.rar !== 'silver')) return;
        const age = (f - lit(i)) / K; if (age < -8 || age > 52) return;
        const k = clamp(Math.min((age + 8) / 10, (52 - age) / 14)), [cx, cy] = ctr(q);
        const fw = Math.hypot((q[1][0] - q[0][0]) * W, (q[1][1] - q[0][1]) * H), fh = Math.hypot((q[3][0] - q[0][0]) * W, (q[3][1] - q[0][1]) * H);
        if (c.rar === 'gold') {
          const gr = g.createLinearGradient(0, 0, 0, cy + fh * .6); gr.addColorStop(0, 'rgba(255,226,150,.05)'); gr.addColorStop(.7, 'rgba(255,214,120,.55)'); gr.addColorStop(1, 'rgba(255,214,120,0)');
          g.globalAlpha = k * .85; g.fillStyle = gr; g.beginPath(); g.moveTo(cx - fw * .28, 0); g.lineTo(cx + fw * .28, 0); g.lineTo(cx + fw * .7, cy + fh * .6); g.lineTo(cx - fw * .7, cy + fh * .6); g.closePath(); g.fill();
          for (let n = 0; n < 28; n++) { const x = cx + (rr(n) - .5) * fw * 1.5, y = cy - fh * 1.1 + ((rr(n + 50) * fh * 2.2 + (age + 8) * (1.4 + rr(n + 90))) % (fh * 2.2)); g.globalAlpha = k * (.5 + .5 * rr(n + 7)); g.fillStyle = '#ffe2a0'; g.beginPath(); g.arc(x, y, 1.2 + rr(n + 3) * 1.8, 0, 6.29); g.fill(); }
        } else if (c.rar === 'silver') {
          g.strokeStyle = '#dfe8f6'; g.lineWidth = 1.3;
          for (let n = 0; n < 40; n++) { const x = cx + (rr(n) - .5) * fw * 2, y = cy - fh * 1.2 + ((rr(n + 40) * fh * 2.4 + (age + 8) * (9 + rr(n + 80) * 6)) % (fh * 2.4)); g.globalAlpha = k * (.35 + .4 * rr(n + 9)); g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y + 12 + rr(n + 5) * 10); g.stroke(); }
        }
      });
      g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
      // 灯った額縁の下に、その精霊の名前（灯ってから1.6秒）
      g.textAlign = 'center'; g.textBaseline = 'top';
      F.w.forEach((q, i) => {
        const c = o.cards[i]; if (!q[5] || !c || !c.n) return;
        const age = (f - lit(i)) / K; if (age < 4 || age > 60) return;
        const a = clamp(Math.min((age - 4) / 8, (60 - age) / 10)), x = (q[2][0] + q[3][0]) / 2 * W, y = Math.max(q[2][1], q[3][1]) * H + 10;
        if (y > H - 30 || x < 20 || x > W - 20) return;
        g.font = `600 ${Math.round(W / 24)}px "Noto Serif JP", serif`; g.fillStyle = `rgba(246,226,170,${a})`; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 6;
        g.fillText((c.ace ? '★ ' : '') + c.n, x, y); g.shadowBlur = 0;
      });
      // 天窓の光：守り神の人生地図の色（どの人生も同じ大きさ・同じ明るさ）
      const la = clamp((f - T(300)) / (T(390) - T(300)));
      if (la > 0 && F.oc[2]) {
        // 天窓から床へ下りる光の柱。横に人生地図の色を並べ、上下と左右のはしは消える。天窓のまわりは小さくにじむだけ
        const ox = F.oc[0] * W, oy = Math.max(0, F.oc[1] * H), bw = W * (.10 + .08 * clamp((f - T(300)) / (T(450) - T(300))));
        beam.width = W; beam.height = H; const b = beam.getContext('2d'); b.clearRect(0, 0, W, H);
        const gx = b.createLinearGradient(ox - bw, 0, ox + bw, 0); gx.addColorStop(0, 'rgba(0,0,0,0)');
        hues.forEach((h, k) => gx.addColorStop(.15 + .7 * k / Math.max(1, hues.length - 1), h)); gx.addColorStop(1, 'rgba(0,0,0,0)');
        b.fillStyle = gx; b.beginPath(); b.moveTo(ox - bw * .55, oy); b.lineTo(ox + bw * .55, oy); b.lineTo(ox + bw * 1.3, H); b.lineTo(ox - bw * 1.3, H); b.closePath(); b.fill();
        b.globalCompositeOperation = 'destination-in';
        const gy = b.createLinearGradient(0, oy, 0, H); gy.addColorStop(0, 'rgba(0,0,0,.9)'); gy.addColorStop(.55, 'rgba(0,0,0,.55)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
        b.fillStyle = gy; b.fillRect(0, 0, W, H); b.globalCompositeOperation = 'source-over';
        g.globalCompositeOperation = 'screen'; g.globalAlpha = la * .7; g.drawImage(beam, 0, 0);
        const gr = g.createRadialGradient(ox, oy, 0, ox, oy, W * .3); gr.addColorStop(0, hues[Math.floor(hues.length / 2)]); gr.addColorStop(1, 'rgba(0,0,0,0)');
        g.globalAlpha = la * .35; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
        // 光の柱の真ん中に、あなたの写真（入れた夜だけ）。2026-11-01〜
        const ga = clamp((f - T(330)) / (T(380) - T(330)));
        if (!X && meCv && ga > 0) {
          const mw = W * .42, mh = mw * 380 / 300, mx = ox - mw / 2, my = H * .47 - mh / 2 - (1 - ga) * H * .02;
          meDraw(mx, my, mw, mh, ga);
        }
        // 守り神は柱のそば（右下・灯籠のそば）で、静かに見守る。浮かび上がらず、ゆっくり光るだけ（2026-11-01 重吉さんの決め。どの人生も同じ大きさ・同じ明るさ）
        if (!X && G && ga > 0) {
          const gw = W * .24, gh = gw * .75, gcx = Math.min(W - gw * .6, ox + W * .27), gcy = H * .66 + Math.sin(f / 30) * H * .004, gx0 = gcx - gw / 2, gy0 = gcy - gh / 2;
          const halo = g.createRadialGradient(gcx, gcy, 0, gcx, gcy, gw * .75); halo.addColorStop(0, `rgba(255,236,190,${.28 + .1 * Math.sin(f / 20)})`); halo.addColorStop(1, 'rgba(255,220,150,0)');
          g.globalAlpha = ga; g.fillStyle = halo; g.fillRect(gcx - gw, gcy - gw, gw * 2, gw * 2);
          if (gcv) g.drawImage(gcv, gx0, gy0, gw, gh);
          g.globalAlpha = 1;
          const na = clamp((f - T(350)) / (T(370) - T(350)));
          if (G.n && na > 0) {
            g.textAlign = 'center'; g.textBaseline = 'top'; g.font = `600 ${Math.round(W / 32)}px "Noto Serif JP", serif`;
            g.fillStyle = `rgba(255,240,205,${na})`; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 8; g.fillText(G.n, gcx, gy0 + gh + 4); g.shadowBlur = 0;
          }
        }
      }
      if (X && F.x) ascend(f, F.x);
      // AI のお話の字幕：額縁が灯るたびにその精霊の一言、天窓の光で結びの一言
      const ST = o.story;
      if (ST && f < T(440)) {
        const i = Math.floor((f - lit(0) - 4) / GP), last = J.wins.length - 1;
        if (f >= lit(0) + 4 && i >= 0 && i <= last && f < T(300)) { const s0 = lit(i) + 4, s1 = i === last ? T(296) : s0 + GP; subtitle(g, W, H, ST.lines[i], clamp(Math.min((f - s0) / 8, (s1 - f) / 8))); }
        if (f >= T(318)) subtitle(g, W, H, ST.close, clamp(Math.min((f - T(318)) / 12, (T(436) - f) / 12)));
      }
      // おわり：白い光に包まれて、題名（AI のお話があれば、その題。館の名前は小さく上に）
      const wa = clamp((f - T(425)) / 40);
      if (wa > 0) {
        g.fillStyle = `rgba(255,248,232,${wa * .88})`; g.fillRect(0, 0, W, H);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = `rgba(122,86,30,${clamp((f - T(440)) / 24)})`;
        const big = ST && ST.title ? ST.title : o.title; let fs = Math.round(W / 13);
        g.font = `600 ${fs}px "Noto Serif JP", serif`; while (fs > W / 26 && g.measureText(big).width > W * .88) { fs -= 2; g.font = `600 ${fs}px "Noto Serif JP", serif`; }
        g.fillText(big, W / 2, H * .46);
        if (big !== o.title) { g.font = `500 ${Math.round(W / 30)}px "Noto Serif JP", serif`; g.fillText(o.title, W / 2, H * .395); }
        g.font = `500 ${Math.round(W / 26)}px "Noto Serif JP", serif`; g.fillText(o.sub, W / 2, H * .53);
        // その夜の7体を小さく並べる（この動画だけの顔ぶれ）
        const ta = clamp((f - T(446)) / 20), tw = Math.min(W * .11, W * .86 / Math.max(1, ths.length) - 6), th0 = tw * 1.45, gap = 6, tx0 = (W - (tw + gap) * ths.length + gap) / 2, ty = H * .68;
        if (ta > 0) ths.forEach((im, k) => {
          const x = tx0 + k * (tw + gap); g.globalAlpha = ta;
          g.fillStyle = 'rgba(122,86,30,.25)'; g.fillRect(x - 1, ty - 1, tw + 2, th0 + 2);
          if (im) { g.save(); g.beginPath(); g.rect(x, ty, tw, th0); g.clip(); cover(g, im, x, ty, tw, th0); g.restore(); }
          else { g.fillStyle = TYC[o.cards[k].t] || '#8a96a6'; g.fillRect(x, ty, tw, th0); }
          if (o.cards[k].no) { g.fillStyle = 'rgba(122,86,30,.9)'; g.font = `500 ${Math.round(W / 46)}px "Noto Serif JP", serif`; g.fillText('No.' + o.cards[k].no, x + tw / 2, ty + th0 + W / 40); }
        });
        g.globalAlpha = 1;
        if (o.only) { g.fillStyle = `rgba(122,86,30,${ta})`; g.font = `500 ${Math.round(W / 30)}px "Noto Serif JP", serif`; g.fillText(o.only, W / 2, ty + th0 + W / 40 + W / 18); }
        if (G && G.line) { g.fillStyle = `rgba(122,86,30,${ta})`; g.font = `500 ${Math.round(W / 32)}px "Noto Serif JP", serif`; g.fillText(G.line, W / 2, ty + th0 + W / 40 + W / 18 * 2); }
        if (o.congrats) { g.fillStyle = `rgba(122,86,30,${clamp((f - T(452)) / 20)})`; g.font = `600 ${Math.round(W / 20)}px "Noto Serif JP", serif`; g.fillText(o.congrats, W / 2, H * .62); }
      }
    }
    v.currentTime = 0; await new Promise(r => { v.onseeked = r; setTimeout(r, 400); }); draw(1);
    L.cap.textContent = '';
    // 今夜は AI のお話が付いたか（付かない夜は、字幕なし・いつもの題と曲）を、押す前に一言で見せる
    if (o.tx.ai) {
      const b = document.createElement('span'), h = document.createElement('b'), sm = document.createElement('small');
      b.className = 'nf-ai' + (o.story ? ' on' : ''); h.textContent = o.tx.ai; sm.textContent = o.tx.aiSub || ''; b.append(h, sm); L.cap.append(b);
    }
    // おまかせ／好きな画像を床に（2026-10-27〜、重吉さんの決め）。選んだ画像は、すぐ床に映して見せる
    if (o.tx.modeAuto) {
      const p = document.createElement('div'); p.className = 'nf-pick';
      p.innerHTML = '<div class="nf-modes"><button type="button" class="nf-mode" data-m="auto" aria-pressed="false"></button><button type="button" class="nf-mode" data-m="pic" aria-pressed="false"></button></div>'
        + '<div class="nf-drop" role="button" tabindex="0" hidden><b></b><small></small><input type="file" accept="image/*" hidden></div>';
      const [ma, mp] = p.querySelectorAll('.nf-mode'), dz = p.querySelector('.nf-drop'), fi = dz.querySelector('input');
      ma.textContent = o.tx.modeAuto; mp.textContent = o.tx.modePic; dz.querySelector('b').textContent = o.tx.picDrop; dz.querySelector('small').textContent = o.tx.picNote || '';
      // はじめはどちらも選ばない（石の壁のまま）。選んだボタンをもう一度押すと外す（2026-10-28 重吉さんの決め）
      let cur = null;
      const mode = m => { if (m === cur) m = null; cur = m; ma.classList.toggle('on', m === 'auto'); mp.classList.toggle('on', m === 'pic'); ma.setAttribute('aria-pressed', m === 'auto'); mp.setAttribute('aria-pressed', m === 'pic'); dz.hidden = m !== 'pic'; if (m === 'auto') setAuto(); else setPic(null); dz.classList.remove('has'); draw(1); };
      ma.onclick = () => mode('auto'); mp.onclick = () => mode('pic');
      const use = async f => {
        if (!f || !/^image\//.test(f.type)) return;
        if (picURL) URL.revokeObjectURL(picURL);
        picURL = URL.createObjectURL(f); setPic(await img(picURL)); dz.classList.add('has'); draw(1);
      };
      dz.onclick = () => fi.click(); dz.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fi.click(); } };
      fi.onchange = () => { use(fi.files[0]); fi.value = ''; };
      dz.ondragover = e => { e.preventDefault(); dz.classList.add('over'); }; dz.ondragleave = () => dz.classList.remove('over');
      dz.ondrop = e => { e.preventDefault(); dz.classList.remove('over'); use(e.dataTransfer.files[0]); };
      // あなたの写真を光の中に（2026-11-01〜）。スマホでは押すと、その場で撮るか写真から選べる
      if (o.tx.meDrop) {
        const me = document.createElement('div'); me.className = 'nf-drop nf-me'; me.setAttribute('role', 'button'); me.tabIndex = 0;
        me.innerHTML = '<i class="nf-mepic" hidden><i></i></i><span><b></b><small></small></span><input type="file" accept="image/*" hidden>';
        me.querySelector('b').textContent = o.tx.meDrop; me.querySelector('small').textContent = o.tx.meNote || '';
        const mi = me.querySelector('input'), mp2 = me.querySelector('.nf-mepic');
        const useMe = async f => {
          if (!f || !/^image\//.test(f.type)) return;
          if (meURL) URL.revokeObjectURL(meURL);
          meURL = URL.createObjectURL(f); const job = ++meJob, raw = meCrop(await img(meURL)); if (job !== meJob) return;
          mePt = null; mp2.classList.remove('pt'); mp2.firstChild.style.backgroundImage = '';
          meCv = null; if (raw) { meCv = Object.assign(document.createElement('canvas'), { width: ME_W, height: ME_H }); meCv.getContext('2d').drawImage(raw, 0, 0); meMask(meCv); }
          mp2.style.backgroundImage = raw ? `url('${raw.toDataURL('image/jpeg', .9)}')` : ''; mp2.hidden = !meCv; me.classList.toggle('has', !!meCv);
          me.querySelector('b').textContent = meCv ? o.tx.meOk || o.tx.meDrop : o.tx.meDrop;
          // 確認の絵は元の写真をすぐ出し、肖像ができたら光の中でふわりと切り替える。できなければ元の写真のまま（何も出さない）
          if (raw) portrait(raw, job).then(pt => {
            if (!pt || job !== meJob) return; mePt = pt; meAt = performance.now();
            mp2.firstChild.style.backgroundImage = `url('${pt.toDataURL('image/jpeg', .9)}')`; mp2.classList.add('pt');
          }).catch(() => { /* 元の写真のまま */ });
        };
        me.onclick = () => mi.click(); me.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); mi.click(); } };
        mi.onchange = () => { useMe(mi.files[0]); mi.value = ''; };
        me.ondragover = e => { e.preventDefault(); me.classList.add('over'); }; me.ondragleave = () => me.classList.remove('over');
        me.ondrop = e => { e.preventDefault(); me.classList.remove('over'); useMe(e.dataTransfer.files[0]); };
        p.append(me);
        // その場で撮る（2026-11-01〜）：PC の Webカメラでも、スマホの前のカメラでも。楕円の中が光の柱に入る
        if (o.tx.cam) {
          const cb = document.createElement('button'); cb.type = 'button'; cb.className = 'nf-mode nf-camgo'; cb.textContent = o.tx.cam.go;
          cb.onclick = async () => { const f = await camera({ face: 'user', oval: true, tx: o.tx.cam, onPick: () => mi.click() }); if (f) useMe(f); };
          // 写真の箱の横に並べる（狭い画面では下へ折り返す）。縦に積むと、背の低い画面で「光の中へ」に重なった
          const row = document.createElement('div'); row.className = 'nf-merow'; me.replaceWith(row); row.append(me, cb);
        }
      }
      L.cap.append(p); cv.parentNode.classList.add('pick');  // 選ぶあいだは絵を小さくして、選ぶ所とボタンを入れる
    }
    // 押してから始める（音を出すには、押した手が要る）
    await new Promise(r => btn(L, o.tx.play, '', r));
    L.btns.replaceChildren(); L.cap.textContent = ''; cv.parentNode.classList.remove('pick');
    const A = audio(); let S = null, rec = null, parts = [], done = false, blob = null;
    return new Promise(resolve => {
      const finish = async (all) => {
        if (done) return; done = true; stopDraw(); v.pause(); if (S) S.stop();
        if (rec && rec.state !== 'inactive') { await new Promise(r => { rec.onstop = r; rec.stop(); }); if (all && parts.length) blob = new Blob(parts, { type: rec.mimeType }); }
        setTimeout(() => A && A.ac.close(), 800);
        draw(J.n); L.btns.replaceChildren();
        // 終わりの絵を描いたら、使い終わった物をすぐ捨てる（2026-11-04。iPhone で保存を押すとページが止まって黒くなった＝メモリ不足。
        // 額縁の絵・動画の元の絵（色と透明の縦2段）・作業用の絵・録画の切れ端・最後の部屋の動画そのもの）
        parts = []; free(fcs, vc, draw.t); draw.t = null; meJob++; meCv = mePt = meMix = null;
        try { v.removeAttribute('src'); v.load(); } catch (e) { /* 捨てられなくても進む */ }
        delete VID[GAL + 'lastroom'];
        if (blob) {
          L.cap.textContent = o.tx.made; btn(L, o.tx.save, '', () => save(blob, rec.ext, o.file));
          // スマホは「保存」とは別に「Instagram・X に共有」（2026-11-04 重吉さんの決め。共有できると分かるように）。投稿文はクリップボードにも写す（Instagram は文を受け取らない）
          if (o.tx.share && canShareFile(blob, rec.ext, o.file)) {
            const n = document.createElement('span'); n.className = 'nf-note'; n.textContent = o.tx.shareNote || ''; L.cap.append(n);
            btn(L, o.tx.share, '', () => share(blob, rec.ext, o.file, o.shareText || '', () => { n.textContent = o.tx.shareCopied || n.textContent; }));
          } else if (o.tx.shareX && o.shareText) {
            // PC（と共有できない端末）は「𝕏 で共有」（2026-11-04 重吉さんの決め）：X の投稿画面を文入りで開き、動画は保存する。X の投稿画面には動画を自動で添えられない。
            // Instagram は PC のブラウザから渡す入口が無いので出さない
            const n = document.createElement('span'); n.className = 'nf-note'; n.textContent = o.tx.shareXNote || ''; L.cap.append(n);
            btn(L, o.tx.shareX, '', () => shareX(blob, rec.ext, o.file, o.shareText));
          }
        }
        else if (all && !rec) L.cap.textContent = o.tx.noRec;
        btn(L, o.tx.close, 'ghost', () => { close(); if (picURL) URL.revokeObjectURL(picURL); if (meURL) URL.revokeObjectURL(meURL); meJob++; meCv = mePt = meMix = null; free(fcs, vc, draw.t); draw.t = null; resolve(blob ? { blob, ext: rec.ext } : null); });
      };
      const stopDraw = onFrames(v, t => draw(Math.floor(t * J.fps) + 1));
      btn(L, o.tx.skip, 'ghost nf-skip', () => finish(false));
      if (A) { A.ac.resume(); S = score(A.ac, A.out, ROOM_PLAN(seeded(o.seed || ''), o.cards.map(c => ({ rar: c.rar })), J.wins.map((w, i) => lit(i) / J.fps), X ? X.map(x => x / J.fps) : null), o.story && o.story.music, 'D', J.n / J.fps); rec = recorder(cv, A.dest); }
      if (rec) { rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); }; rec.start(500); }
      v.onended = () => { draw(J.n); setTimeout(() => finish(true), 900); };
      v.play().catch(() => finish(false));
    });
  }
  // スマホ（iPhone・iPad・Android）は、ダウンロードの形では動画を写真に入れにくい（iPhone は別の画面が開くだけ）。
  // 共有の画面を出して「ビデオを保存」などから写真・ギャラリーへ（2026-10-28 重吉さん）。共有できないときと PC は、いままでのダウンロード
  const isMobile = () => /iP(hone|ad|od)|Android/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const vfile = (blob, ext, name) => new File([blob], `${name || 'lantern-museum'}.${ext}`, { type: ext === 'mp4' ? 'video/mp4' : 'video/webm' });  // 型は codecs を付けない（受け取る側のアプリが「動画」と分かるように）
  function canShareFile(blob, ext, name) {
    try { return isMobile() && !!navigator.share && !!window.File && (!navigator.canShare || navigator.canShare({ files: [vfile(blob, ext, name)] })); } catch (e) { return false; }
  }
  // 動画を共有の画面へ（files と text。url は渡さない＝iPhone でファイルが落ちる先があるため。URL は文の中）
  function share(blob, ext, name, text, onCopied) {
    const f = vfile(blob, ext, name);
    let withText = !!text; try { if (withText && navigator.canShare && !navigator.canShare({ files: [f], text })) withText = false; } catch (e) { withText = false; }
    navigator.share(withText ? { files: [f], text } : { files: [f] }).catch(() => {});
    try { if (text && navigator.clipboard) navigator.clipboard.writeText(text).then(() => onCopied && onCopied(), () => {}); } catch (e) { /* 写せない端末 */ }
    try { if (typeof gtag === 'function') gtag('event', 'share_film'); } catch (e) { /* 計測が止められていても */ }
  }
  // X の投稿画面を（押した直後のうちに）開いてから、動画をダウンロード（「今夜の記録を共有」の PC と同じやり方）
  function shareX(blob, ext, name, text) {
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank', 'noopener');
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name || 'lantern-museum'}.${ext}`;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
    try { if (typeof gtag === 'function') gtag('event', 'share_film'); } catch (e) { /* 計測が止められていても */ }
  }
  function save(blob, ext, name) {
    const fn = `${name || 'lantern-museum'}.${ext}`, mobile = /iP(hone|ad|od)|Android/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    if (mobile && navigator.share && window.File) {
      const f = vfile(blob, ext, name);
      if (!navigator.canShare || navigator.canShare({ files: [f] })) { navigator.share({ files: [f] }).catch(() => {}); return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = fn;
    document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 4000);
  }

  // ======== 2. 最後の通路を進む ========
  // o = { frames:[{k, art, th, rar, n}]（新しい順。0 がいま飾った額縁）, tx:{skip, close, done} }
  async function walk(o) {
    const L = layer('walk'), cv = L.cv, g = cv.getContext('2d');
    L.cap.textContent = o.tx.loading || '';
    let J, v;
    try { [J, v] = await Promise.all([getJSON(GAL + 'walk.json'), videoEl(GAL + 'lastwalk')]); } catch (e) { close(); return; }
    const W = J.w, H = J.h; cv.width = W; cv.height = H;
    const fcs = await Promise.all(J.slots.map((s, i) => o.frames[i] ? frameCanvas(o.frames[i], FS) : null));
    let glow = 0;
    function draw(f) {
      const F = J.f[Math.min(J.n, Math.max(1, f)) - 1];
      g.drawImage(v, 0, 0, W, H);
      F.forEach((q, i) => {
        if (!q[5] || !fcs[i]) return;
        const P = FR[o.frames[i].k] || FR.dawn, map = winMap(P, q, W, H);
        g.globalAlpha = i === 0 ? clamp(glow * 1.4) : 1; warp(g, fcs[i], map); g.globalAlpha = 1;
        if (i === 0 && glow > 0) {  // いま飾った額縁を、金の光で迎える
          const c = map(P.w / 2, P.h / 2), r = Math.hypot(...[0, 1].map(k => map(P.w, P.h)[k] - map(0, 0)[k])) * .7;
          const gr = g.createRadialGradient(c[0], c[1], 0, c[0], c[1], r); const a = .55 * Math.sin(Math.min(1, glow) * Math.PI) + .12 * (glow >= 1);
          gr.addColorStop(0, `rgba(255,226,150,${a})`); gr.addColorStop(1, 'rgba(255,226,150,0)');
          g.globalCompositeOperation = 'screen'; g.fillStyle = gr; g.fillRect(0, 0, W, H); g.globalCompositeOperation = 'source-over';
        }
      });
      const wa = clamp((f - 200) / 40); if (wa > 0) { g.fillStyle = `rgba(255,246,228,${wa * .92})`; g.fillRect(0, 0, W, H); }
    }
    v.currentTime = 0; await new Promise(r => { v.onseeked = r; setTimeout(r, 400); }); draw(1);
    L.cap.textContent = '';
    const A = audio(); let S = null, done = false;
    return new Promise(resolve => {
      let stopDraw = () => {};
      const finish = () => {
        if (done) return; done = true; stopDraw(); v.pause(); if (S) S.stop(); setTimeout(() => A && A.ac.close(), 800);
        draw(J.n); L.btns.replaceChildren(); L.cap.textContent = o.tx.done;
        btn(L, o.tx.close, '', () => { close(); free(fcs); resolve(); });
      };
      btn(L, o.tx.skip, 'ghost nf-skip', finish);
      if (A) { A.ac.resume(); S = score(A.ac, A.out, WALK_PLAN); }
      // はじめの2秒は止まったまま、いま飾った額縁が光の中から掛かる
      const t0 = performance.now(), hang = () => {
        if (done) return; glow = (performance.now() - t0) / (reduce ? 300 : 2000); draw(1);
        if (glow < 1) return requestAnimationFrame(hang);
        glow = 1; stopDraw = onFrames(v, t => draw(Math.floor(t * J.fps) + 1)); v.onended = () => setTimeout(finish, 600); v.play().catch(finish);
      };
      requestAnimationFrame(hang);
    });
  }


  // ---- その場で撮る（2026-11-01〜、重吉さんの決め）：PC の Webカメラ・Android・iPhone で、ページの中にカメラの映像を出して1枚撮る ----
  // 撮った1枚は File で返すだけ（呼んだ側が objectURL で画面に出す）。どこにも送らず、残さない。
  // カメラは「撮る」の画面が開いているあいだだけ使い、閉じたらすぐ止める。使えない・許されなかったときは「写真を選ぶ」へ（onPick）
  // o：{ face: 'user'|'environment', oval: true（光の柱に入る範囲の楕円・その形に切って返す）, tx: { shot, use, retake, cancel, flip, no, pick, wait }, onPick }
  const camOK = () => !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  function camera(o) {
    const tx = o.tx || {};
    return new Promise(resolve => {
      const w = document.createElement('div'); w.className = 'nf-cam'; w.setAttribute('role', 'dialog'); w.setAttribute('aria-modal', 'true');
      w.innerHTML = '<div class="nf-camv"><video playsinline muted autoplay></video><canvas hidden></canvas><i class="nf-camo" hidden></i><b class="nf-camn" hidden></b></div><p class="nf-camm" role="status"></p><div class="btns nf-camb"></div>';
      document.body.append(w);
      const box = w.querySelector('.nf-camv'), v = box.querySelector('video'), c = box.querySelector('canvas'), ov = box.querySelector('.nf-camo'), num = box.querySelector('.nf-camn'), msg = w.querySelector('.nf-camm'), bar = w.querySelector('.nf-camb');
      let st = null, face = o.face || 'user', mirror = false, cams = 0, timer = null, done = false, crop = null;
      const stop = () => { if (st) st.getTracks().forEach(t => t.stop()); st = null; v.srcObject = null; };
      const end = r => { if (done) return; done = true; clearInterval(timer); stop(); c.width = c.height = 0; w.remove(); removeEventListener('keydown', key); resolve(r); };
      const key = e => { if (e.key === 'Escape') end(null); };
      addEventListener('keydown', key);
      const b = (t, cls, fn) => { const x = document.createElement('button'); x.type = 'button'; x.className = 'btn ' + (cls || ''); x.textContent = t; x.onclick = fn; bar.append(x); return x; };
      const live = () => {
        bar.replaceChildren(); v.hidden = false; c.hidden = true; num.hidden = true; ov.hidden = !o.oval; msg.textContent = '';
        b(tx.shot || '📷', 'nf-shot', shoot).focus();
        if (cams > 1) b(tx.flip, 'ghost', () => { face = face === 'user' ? 'environment' : 'user'; start(); });
        b(tx.cancel, 'ghost', () => end(null));
      };
      const fail = () => {
        stop(); bar.replaceChildren(); v.hidden = true; c.hidden = true; ov.hidden = true; box.style.removeProperty('--ar'); box.classList.add('none'); msg.textContent = tx.no || '';
        // 押した手のまま「写真を選ぶ」を開く（iPhone は押した手が無いと選ぶ画面を開かない）
        if (o.onPick) b(tx.pick, '', () => { end(null); o.onPick(); });
        b(tx.cancel, 'ghost', () => end(null));
      };
      async function start() {
        stop(); bar.replaceChildren(); box.classList.remove('none'); msg.textContent = tx.wait || '';
        try { st = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 1280 } } }); }
        catch (e) { return done || fail(); }
        if (done) return stop();
        v.srcObject = st;
        await v.play().catch(() => {});
        if (!v.videoWidth) await new Promise(r => { v.onloadedmetadata = r; setTimeout(r, 1500); });
        if (done) return stop();
        if (!v.videoWidth) return fail();
        const tr = st.getVideoTracks()[0], s = tr && tr.getSettings ? tr.getSettings() : {};
        mirror = s.facingMode ? s.facingMode === 'user' : face === 'user';  // PC の Webカメラは向きを言わないので、自撮りとして鏡にする
        box.classList.toggle('mirror', mirror);
        const vw = v.videoWidth, vh = v.videoHeight; box.style.setProperty('--ar', vw / vh);
        // 楕円の範囲：光の柱に入る形（縦 380：横 300）。映像の中で、その形のいちばん大きな四角の中に楕円を出す
        if (o.oval) {
          const r = 300 / 380, cw = vw / vh > r ? vh * r : vw, ch = vw / vh > r ? vh : vw / r;
          crop = { x: (vw - cw) / 2, y: (vh - ch) * .35, w: cw, h: ch };
          Object.assign(ov.style, { left: (crop.x + cw * .12) / vw * 100 + '%', top: (crop.y + ch * .1) / vh * 100 + '%', width: cw * .76 / vw * 100 + '%', height: ch * .8 / vh * 100 + '%' });
        } else crop = null;
        if (!cams && navigator.mediaDevices.enumerateDevices) cams = (await navigator.mediaDevices.enumerateDevices().catch(() => [])).filter(d => d.kind === 'videoinput').length;
        if (!done) live();
      }
      function shoot() {
        if (face !== 'user') return snap();
        // 自撮りは3つ数えてから
        bar.replaceChildren(); b(tx.cancel, 'ghost', () => end(null));
        let n = 3; num.hidden = false; num.textContent = n;
        timer = setInterval(() => { n--; if (n > 0) num.textContent = n; else { clearInterval(timer); num.hidden = true; snap(); } }, 1000);
      }
      function snap() {
        if (done || !v.videoWidth) return;
        const vw = v.videoWidth, vh = v.videoHeight, k = crop || { x: 0, y: 0, w: vw, h: vh }, sc = Math.min(1, 1600 / Math.max(k.w, k.h));
        c.width = Math.round(k.w * sc); c.height = Math.round(k.h * sc);
        const g = c.getContext('2d');
        // 見えていたとおり（自撮りは鏡のまま）に残す
        if (mirror) { g.translate(c.width, 0); g.scale(-1, 1); g.drawImage(v, vw - k.x - k.w, k.y, k.w, k.h, 0, 0, c.width, c.height); }
        else g.drawImage(v, k.x, k.y, k.w, k.h, 0, 0, c.width, c.height);
        v.hidden = true; c.hidden = false; ov.hidden = true; box.style.setProperty('--ar', c.width / c.height); v.pause();
        bar.replaceChildren();
        b(tx.use, '', () => c.toBlob(bl => end(bl ? new File([bl], 'camera.jpg', { type: 'image/jpeg' }) : null), 'image/jpeg', .9)).focus();
        b(tx.retake, 'ghost', () => { box.style.setProperty('--ar', vw / vh); v.play().catch(() => {}); live(); });
        b(tx.cancel, 'ghost', () => end(null));
      }
      w.addEventListener('click', e => { if (e.target === w) end(null); });
      if (camOK()) start(); else fail();
    });
  }

  window.NightFilm = { room, walk, save, warm, dawn, frameCanvas, warp, homography, camera };
})();
