// 夜の美術館を灯す：2つの映像（2026-10-25〜、重吉さんの決め）
//  1. 最後の部屋（20秒・縦9:16）…光の扉の鍵で最後の部屋に入ったら流す。BGM つきの動画にして、保存できる（特典）
//  2. 最後の通路を進む（10秒・横3:2）…4段階目の朝に精霊を額縁に飾ったときだけ流す。保存はしない
// 絵は Blender で前もって書き出した物（tools/blender/lastroom.py・lastwalk.py）。額縁の窓の四隅はコマごとに JSON にある。
// 最後の部屋の映像は、窓を「抜き」にしてあり、上半分が色・下半分が抜きの濃さ（lastroom.webm / .mp4。tools/blender/encode-film.sh）。その夜の作品・精霊は、ここで窓の下に描く。
// 動画はこの端末の中だけで作る（canvas と、その場で合成した音を MediaRecorder で録る）。どこにも送らない
(() => {
  const GAL = '/play/gallery/', MUS = '/play/museum/';
  // 額縁の絵の寸法（frame.py の JSON。night-app.js の FR と同じ数）
  const FR = {
    dawn: { w: 720, h: 1149, l: 141, t: 336, ww: 438, wh: 672, top: 208, s: { w: 300, h: 398, l: 59, t: 59, ww: 182, wh: 280, top: 6 } },
    quiet: { w: 720, h: 968, l: 128, t: 128, ww: 464, wh: 711, top: 14, s: { w: 300, h: 403, l: 53, t: 53, ww: 193, wh: 296, top: 6 } }
  };
  const SMALL = 0.26;
  const TYC = { 炎: '#c8553d', 水: '#3d7fc8', 森: '#4f9a52', 雷: '#d6b740', 風: '#8fc7b8', 土: '#9a7448', 光: '#e8d79a', 闇: '#5b4a8a', 夢: '#c37fb4', 鋼: '#8a96a6' };
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const img = src => new Promise(ok => { if (!src) return ok(null); const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = src; });
  const getJSON = u => fetch(u).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));

  // ---- 額縁の絵を1枚の canvas に：窓いっぱいの作品・額縁・上のふちの小さな額縁と精霊（night-app.js の fbox と同じ並び） ----
  function cover(g, im, x, y, w, h) {
    const s = Math.max(w / im.width, h / im.height), iw = im.width * s, ih = im.height * s;
    g.drawImage(im, x + (w - iw) / 2, y + (h - ih) / 2, iw, ih);
  }
  async function frameCanvas(o) {
    const P = FR[o.k] || FR.dawn, S = P.s, c = document.createElement('canvas'); c.width = P.w; c.height = P.h;
    const g = c.getContext('2d');
    const [big, sm, art, th] = await Promise.all([img(`${GAL}frame-${o.k}.webp`), img(`${GAL}frame-${o.k}-s.webp`), img(o.art ? MUS + o.art : ''), img(o.th)]);
    g.save(); g.beginPath(); g.rect(P.l - 2, P.t - 2, P.ww + 4, P.wh + 4); g.clip();
    if (art) cover(g, art, P.l - 2, P.t - 2, P.ww + 4, P.wh + 4);
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
    if (o.rar === 'gold' || o.rar === 'silver') {  // 金の光・銀の光の子は、額縁が箔で光る
      g.globalCompositeOperation = 'source-atop';
      const gr = g.createLinearGradient(0, 0, P.w, P.h); const col = o.rar === 'gold' ? '255,214,120' : '220,230,245';
      gr.addColorStop(0, `rgba(${col},0)`); gr.addColorStop(.45, `rgba(${col},.28)`); gr.addColorStop(.55, `rgba(${col},.05)`); gr.addColorStop(1, `rgba(${col},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, P.w, P.h); g.globalCompositeOperation = 'source-over';
    }
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
    const W = im.width, H = im.height, P = [];
    for (let j = 0; j <= n; j++) { P.push([]); for (let i = 0; i <= n; i++) P[j].push([[W * i / n, H * j / n], map(W * i / n, H * j / n)]); }
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const a = P[j][i], b = P[j][i + 1], c = P[j + 1][i + 1], d = P[j + 1][i];
      tri(g, im, a[0], b[0], c[0], a[1], b[1], c[1]); tri(g, im, a[0], c[0], d[0], a[1], c[1], d[1]);
    }
    g.setTransform(1, 0, 0, 1, 0, 0);
  }
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
  function score(ac, out, plan, bp) {
    bp = bp || {};
    const inst = Array.isArray(bp.inst) && bp.inst.length ? bp.inst : ['bell', 'strings'], build = bp.build || 'rise', shift = KEY_SHIFT[bp.key] || 0;
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
    if (build === 'wave') swell.gain.setValueAtTime(.7, T0), [[0, .7], [4, 1.05], [7.5, .75], [12, 1.1], [15.5, .85], [18, 1]].forEach(([t, v]) => swell.gain.linearRampToValueAtTime(v, T0 + t));
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
    const arp = (c, t0, t1, v0, v1, rate = 1) => { for (let t = t0, i = 0; t < t1; t += STEP / rate, i++) { const a = ARP[i % 16], k = (t - t0) / (t1 - t0); spark(a === 4 ? c.t[0] + 12 : c.t[a], t, v0 + (v1 - v0) * k); } };
    plan({ bell, haze, spark, sub, boom: (t, v) => boom(t, v * soft), riser: (t, d, v) => riser(t, d, v * soft), arp, CH, STEP, mel, pad });
    return { T0, stop: () => { master.gain.cancelScheduledValues(ac.currentTime); master.gain.setTargetAtTime(0, ac.currentTime, .15); } };
  }
  // 最後の部屋の曲（20秒）：光の扉 → 額縁が1つ灯るたびに鈴が1つ上へ → 光の粒が集まる → 天窓の光で和音がひらく
  const ROOM_PLAN = ({ mel: bell, pad: haze, sub, boom, riser, arp, CH }) => {
    haze(CH.Bb.pad.concat([69]), 0, 2.8, .03, 2600);
    [81, 77, 74].forEach((n, i) => bell(n, .2 + i * .25, 2.6, .07));
    const up = [58, 62, 65, 69, 70, 74, 77];
    up.forEach((n, i) => bell(n, 2.95 + i * 1.25, 2.8, .1));                       // 額縁が灯る（70コマ目から30コマごと）
    haze(CH.Gm.pad, 2.8, 2.6, .018, 1200); haze(CH.Cm.pad, 5.3, 2.6, .02); haze(CH.Eb.pad, 7.8, 2.6, .022); haze(CH.Gm.pad, 10.3, 2.4, .022);
    arp(CH.Gm, 3.2, 5.4, .008, .016); arp(CH.Cm, 5.4, 7.9, .016, .022); arp(CH.Eb, 7.9, 10.4, .022, .028); arp(CH.Gm, 10.4, 12.4, .028, .03);
    for (let t = 4.2; t < 12.3; t += .625 * 2) sub((t < 5.4 ? CH.Gm.b : t < 7.9 ? CH.Cm.b : t < 10.4 ? CH.Eb.b : CH.Gm.b) - 12, t, .1);
    haze(CH.Eb.pad.concat([70]), 12.3, 3.5, .026, 2000); arp(CH.Eb, 12.4, 15.6, .03, .05, 2);   // 光の粒が灯籠へ
    riser(14.0, 1.8, .05);
    boom(15.8, .5); sub(CH.Bb.b - 12, 15.8, .3, 2.4);                                       // 天窓の光
    haze(CH.Bb.pad.concat([69, 74]), 15.8, 4.0, .036, 2800);
    [58, 62, 65, 69, 74, 77, 81].forEach((n, i) => bell(n, 15.8 + i * .08, 3.6, .1));
    [[17.6, 70], [17.9, 74], [18.2, 77], [18.6, 82]].forEach(([t, n]) => bell(n, t, 2.4, .07));
  };
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
    try { const r = new MediaRecorder(st, { mimeType: type, videoBitsPerSecond: 6e6 }); r.ext = type.startsWith('video/mp4') ? 'mp4' : 'webm'; return r; } catch (e) { return null; }
  }
  function videoEl(base) {
    const v = document.createElement('video'); v.muted = true; v.playsInline = true; v.preload = 'auto';
    v.src = base + (v.canPlayType('video/webm; codecs="vp9"') ? '.webm' : '.mp4');
    return new Promise((ok, ng) => { v.oncanplaythrough = () => ok(v); v.onerror = () => ng(new Error('video')); v.load(); });
  }
  const onFrames = (v, fn) => {  // コマが変わるたびに描く
    let stop = false;
    if (v.requestVideoFrameCallback) { const cb = (_, m) => { if (stop) return; fn(m.mediaTime); v.requestVideoFrameCallback(cb); }; v.requestVideoFrameCallback(cb); }
    else { const cb = () => { if (stop) return; fn(v.currentTime); requestAnimationFrame(cb); }; requestAnimationFrame(cb); }
    return () => { stop = true; };
  };

  // ======== 1. 最後の部屋 ========
  // o = { cards:[{art, th, rar, t, n}]（7体まで）, hues:[色]（守り神の人生地図の色。無ければ金）, title, sub, tx:{play, skip, save, close, noRec, made},
  //       story:{title, lines:[精霊ごと], close, music}（AI が書いたその夜のお話。無ければ字幕なし・いつもの題と曲） }
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
    try { [J, v] = await Promise.all([getJSON(GAL + 'last.json'), videoEl(GAL + 'lastroom')]); } catch (e) { close(); return null; }
    const W = J.w, H = J.h; cv.width = W; cv.height = H;
    const vc = document.createElement('canvas'); vc.width = W; vc.height = H * 2; const vg = vc.getContext('2d', { willReadFrequently: true });
    const out = g.createImageData(W, H);
    const fcs = await Promise.all(J.wins.map((w, i) => o.cards[i] ? frameCanvas(Object.assign({ k: w.kind }, o.cards[i])) : frameCanvas({ k: w.kind, t: '光' })));
    const hues = (o.hues && o.hues.length ? o.hues : ['#f3d79a', '#f6e2b0', '#ffe9c0']);
    const beam = document.createElement('canvas');
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
      });
      // Blender の絵：上半分の色に、下半分の濃さを抜きとして入れて重ねる
      vg.drawImage(v, 0, 0, W, H * 2);
      const d = vg.getImageData(0, 0, W, H * 2).data, od = out.data, n = W * H * 4;
      for (let i = 0; i < n; i += 4) { od[i] = d[i]; od[i + 1] = d[i + 1]; od[i + 2] = d[i + 2]; od[i + 3] = d[n + i]; }
      const tmp = draw.t || (draw.t = Object.assign(document.createElement('canvas'), { width: W, height: H }));
      tmp.getContext('2d').putImageData(out, 0, 0); g.drawImage(tmp, 0, 0);
      // 灯った額縁の下に、その精霊の名前（灯ってから1.6秒）
      g.textAlign = 'center'; g.textBaseline = 'top';
      F.w.forEach((q, i) => {
        const c = o.cards[i]; if (!q[5] || !c || !c.n) return;
        const age = f - (70 + i * 30); if (age < 4 || age > 60) return;
        const a = clamp(Math.min((age - 4) / 8, (60 - age) / 10)), x = (q[2][0] + q[3][0]) / 2 * W, y = Math.max(q[2][1], q[3][1]) * H + 10;
        if (y > H - 30 || x < 20 || x > W - 20) return;
        g.font = `600 ${Math.round(W / 24)}px "Noto Serif JP", serif`; g.fillStyle = `rgba(246,226,170,${a})`; g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = 6;
        g.fillText((c.ace ? '★ ' : '') + c.n, x, y); g.shadowBlur = 0;
      });
      // 天窓の光：守り神の人生地図の色（どの人生も同じ大きさ・同じ明るさ）
      const la = clamp((f - 300) / 90);
      if (la > 0 && F.oc[2]) {
        // 天窓から床へ下りる光の柱。横に人生地図の色を並べ、上下と左右のはしは消える。天窓のまわりは小さくにじむだけ
        const ox = F.oc[0] * W, oy = Math.max(0, F.oc[1] * H), bw = W * (.10 + .08 * clamp((f - 300) / 150));
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
      }
      // AI のお話の字幕：額縁が灯るたびにその精霊の一言、天窓の光で結びの一言
      const ST = o.story;
      if (ST && f < 440) {
        const i = Math.floor((f - 74) / 30), last = J.wins.length - 1;
        if (f >= 74 && i >= 0 && i <= last && f < 300) { const s0 = 74 + i * 30, s1 = i === last ? 296 : s0 + 30; subtitle(g, W, H, ST.lines[i], clamp(Math.min((f - s0) / 6, (s1 - f) / 6))); }
        if (f >= 318) subtitle(g, W, H, ST.close, clamp(Math.min((f - 318) / 10, (436 - f) / 10)));
      }
      // おわり：白い光に包まれて、題名（AI のお話があれば、その題。館の名前は小さく上に）
      const wa = clamp((f - 425) / 40);
      if (wa > 0) {
        g.fillStyle = `rgba(255,248,232,${wa * .88})`; g.fillRect(0, 0, W, H);
        g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = `rgba(122,86,30,${clamp((f - 440) / 24)})`;
        const big = ST && ST.title ? ST.title : o.title; let fs = Math.round(W / 13);
        g.font = `600 ${fs}px "Noto Serif JP", serif`; while (fs > W / 26 && g.measureText(big).width > W * .88) { fs -= 2; g.font = `600 ${fs}px "Noto Serif JP", serif`; }
        g.fillText(big, W / 2, H * .46);
        if (big !== o.title) { g.font = `500 ${Math.round(W / 30)}px "Noto Serif JP", serif`; g.fillText(o.title, W / 2, H * .395); }
        g.font = `500 ${Math.round(W / 26)}px "Noto Serif JP", serif`; g.fillText(o.sub, W / 2, H * .53);
      }
    }
    v.currentTime = 0; await new Promise(r => { v.onseeked = r; setTimeout(r, 400); }); draw(1);
    L.cap.textContent = '';
    // 押してから始める（音を出すには、押した手が要る）
    await new Promise(r => btn(L, o.tx.play, '', r));
    L.btns.replaceChildren();
    const A = audio(); let S = null, rec = null, parts = [], done = false, blob = null;
    return new Promise(resolve => {
      const finish = async (all) => {
        if (done) return; done = true; stopDraw(); v.pause(); if (S) S.stop();
        if (rec && rec.state !== 'inactive') { await new Promise(r => { rec.onstop = r; rec.stop(); }); if (all && parts.length) blob = new Blob(parts, { type: rec.mimeType }); }
        setTimeout(() => A && A.ac.close(), 800);
        draw(J.n); L.btns.replaceChildren();
        if (blob) { L.cap.textContent = o.tx.made; btn(L, o.tx.save, '', () => save(blob, rec.ext, o.file)); }
        else if (all && !rec) L.cap.textContent = o.tx.noRec;
        btn(L, o.tx.close, 'ghost', () => { close(); resolve(blob ? { blob, ext: rec.ext } : null); });
      };
      const stopDraw = onFrames(v, t => draw(Math.floor(t * J.fps) + 1));
      btn(L, o.tx.skip, 'ghost nf-skip', () => finish(false));
      if (A) { A.ac.resume(); S = score(A.ac, A.out, ROOM_PLAN, o.story && o.story.music); rec = recorder(cv, A.dest); }
      if (rec) { rec.ondataavailable = e => { if (e.data && e.data.size) parts.push(e.data); }; rec.start(500); }
      v.onended = () => { draw(J.n); setTimeout(() => finish(true), 900); };
      v.play().catch(() => finish(false));
    });
  }
  function save(blob, ext, name) {
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${name || 'lantern-museum'}.${ext}`;
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
    const fcs = await Promise.all(J.slots.map((s, i) => o.frames[i] ? frameCanvas(o.frames[i]) : null));
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
        btn(L, o.tx.close, '', () => { close(); resolve(); });
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

  window.NightFilm = { room, walk, save };
})();
