// monster-app.js — モンスタードロッパーのプログラム（ja / en / in で共用）
// play/・en/play/・in/play/ の3フォルダでバイト同一に保つこと（コミット前のフックが確かめる）。
// 文言は monster-i18n.js（window.I18N）。window.LANG はページが先に決める
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  // ---- 言語 ----
  // 生まれたときに作る文（名前・技・説明）は、文そのものではなく「どの言葉を選んだか」で持つ（文の仕様）。
  // 描くたびに見ているページの言語で組み立てるので、同じカードが ja / en / in のどのページでもその言語で読める。
  // AI が書いた文と、人生の記録に書かれた名前は、文そのもの（生まれたときの言語のまま）。前の版で生まれたカードも文そのもの
  //   文字列            … そのまま
  //   {k, v}            … 辞書の文言 k に v を差し込む（v の中身も文の仕様）
  //   {d, p}            … 辞書の表 d を p の順にたどった言葉（名前の音・技など）
  //   {cat: [...]}      … つなげる
  //   {sl, from, to}    … 文字を切り出す（子・合体の名前。幅は辞書の sliceUnit 倍）
  //   {ty}              … 属性の名前
  //   {nm, tail}        … 名前のつなぎ目を直し、辞書の minName 字に満たなければおしりを足す（子の名前）
  const LANG = window.LANG || 'ja';
  const tr = (k, v) => window.t(k, v), D = k => window.tdata(k);
  function txt(s) {
    if (s === undefined || s === null) return '';
    if (typeof s !== 'object') return String(s);
    if (Array.isArray(s)) return s.map(txt).join('');
    if (s.cat) return s.cat.map(txt).join('');
    if (s.k) { const v = {}; for (const key in (s.v || {})) v[key] = txt(s.v[key]); return tr(s.k, v); }
    if (s.d) { let x = D(s.d); for (const i of s.p) x = x === undefined ? undefined : x[i]; return x === undefined ? '' : String(x); }
    if (s.ty) return (D('types') || {})[s.ty] || s.ty;
    if (s.sl !== undefined) { // 切る幅は言語ごと（英語は1字だと短すぎるので2字ずつ）
      const ch = [...txt(s.sl)], u = D('sliceUnit') || 1;
      return (s.to === undefined ? ch.slice(s.from * u) : ch.slice(s.from * u, s.to * u)).join('');
    }
    if (s.nm !== undefined) {
      let n = txt(s.nm).replace(/([ッャュョァィゥェォーン])\1+/g, '$1').replace(/^[ッャュョァィゥェォーン]+/, '');
      if ([...n].length < (D('minName') || 3)) n += D('tail')[s.tail || 0];
      return n;
    }
    return '';
  }
  const nameOf = M => txt(M.name);
  // カードに描く字体。言語ごとに辞書で（韓国語・繁体字・ベトナム語は、日本語の字体に無い字があるため）
  const FF = D('canvasFont') || '"Noto Sans JP", sans-serif';

  // ---- 指紋（cyrb128）と乱数（sfc32）。迷路ドロッパーと同じもの ----
  function fingerprint(bytes) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0; i < bytes.length; i++) {
      const k = bytes[i];
      h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
      h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
      h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
      h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
    }
    h1 ^= bytes.length;
    h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
    h1 ^= (h2 ^ h3 ^ h4); h2 ^= h1; h3 ^= h1; h4 ^= h1;
    return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
  }
  function sfc32(a, b, c, d) {
    return () => {
      a >>>= 0; b >>>= 0; c >>>= 0; d >>>= 0;
      let t = (a + b) | 0;
      a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11); d = (d + 1) | 0;
      t = (t + d) | 0; c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  // ---- 属性 ----
  const TYPES = {
    '炎': { icon: '🔥', frame: ['#ff7a45', '#d9361b'] },
    '水': { icon: '💧', frame: ['#4aa8ff', '#1f5fd6'] },
    '森': { icon: '🌿', frame: ['#46c47a', '#1d8a4c'] },
    '雷': { icon: '⚡', frame: ['#ffd23a', '#e09a00'] },
    '土': { icon: '🪨', frame: ['#c08a5a', '#7a4f2a'] },
    '風': { icon: '🌀', frame: ['#5fd3d3', '#22928f'] },
    '夢': { icon: '🌸', frame: ['#ff8ad1', '#c2479a'] },
    '闇': { icon: '🌙', frame: ['#7b6bd6', '#3b2f8f'] },
    '光': { icon: '✨', frame: ['#ffe28a', '#f0b429'] },
    '鋼': { icon: '⚙️', frame: ['#9aa7b8', '#5b6778'] }
  };
  // 名前の音（syl・mid・tail）と技は、辞書（monster-i18n.js）の表から番号で選ぶ。表の長さは3言語でそろえること

  function rgb2hsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
    if (mx === mn) return [0, 0, l];
    const d = mx - mn, s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    let h = mx === r ? (g - b) / d + (g < b ? 6 : 0) : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
    return [h * 60, s, l];
  }
  function typeOfColor([r, g, b]) {
    const [h, s, l] = rgb2hsl(r, g, b);
    if (l < 0.16) return '闇';
    if (s < 0.16) return l > 0.72 ? '光' : '鋼';
    if (h < 15 || h >= 335) return '炎';
    if (h < 45) return l < 0.42 ? '土' : '炎';
    if (h < 70) return '雷';
    if (h < 165) return '森';
    if (h < 200) return '風';
    if (h < 255) return '水';
    if (h < 290) return '闇';
    return '夢';
  }
  const css = ([r, g, b]) => `rgb(${r | 0} ${g | 0} ${b | 0})`;
  function shade([r, g, b], k) { return k < 0 ? [r * (1 + k), g * (1 + k), b * (1 + k)] : [r + (255 - r) * k, g + (255 - g) * k, b + (255 - b) * k]; }

  // キャラの色はビビッドが基本：色合い（色相）は写真・データのまま、あざやかさを上げ、明るさを中くらいにそろえる。
  // 灰色・白・黒は色合いが無いので、タイプの色（光＝金、鋼＝青）から、3色ずらして取る
  function vivid(c, shift, type) {
    let [h, s, l] = rgb2hsl(...c);
    if (s < 0.16) { h = (type === '光' ? 48 : 205) + shift; s = type === '光' ? 0.9 : 0.75; }
    return hsl2rgb(((h % 360) + 360) % 360, Math.max(0.85, s), Math.min(0.62, Math.max(0.45, l)));
  }

  // 写真を 48×48 に縮め、多い色を3つ取る。鮮やかな色ほど重く数える
  function paletteOf(img) {
    const c = document.createElement('canvas'); c.width = c.height = 48;
    const x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, 48, 48);
    const d = x.getImageData(0, 0, 48, 48).data, buckets = new Map();
    let sat = 0, lum = 0;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i + 1], b = d[i + 2];
      const [, s, l] = rgb2hsl(r, g, b); sat += s; lum += l;
      const k = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5);
      const e = buckets.get(k) || { n: 0, w: 0, r: 0, g: 0, b: 0 };
      e.n++; e.w += 1 + s * 2; e.r += r; e.g += g; e.b += b; buckets.set(k, e);
    }
    const list = [...buckets.values()].sort((a, b) => b.w - a.w).map(e => [e.r / e.n, e.g / e.n, e.b / e.n]);
    const out = [];
    for (const col of list) {
      if (out.every(o => Math.hypot(o[0] - col[0], o[1] - col[1], o[2] - col[2]) > 70)) out.push(col);
      if (out.length === 3) break;
    }
    while (out.length < 3) out.push(shade(out[0], out.length === 1 ? 0.45 : -0.35));
    const n = d.length / 4;
    return { colors: out, sat: sat / n, lum: lum / n };
  }

  // ---- モンスターの設計図（同じ写真なら同じ設計図） ----
  // bias を渡すと、強さのかたよりをそれで決める（文章・音声。中身を数えた値から作る）
  function makeGenome(fp, pal, imgBytes, bias) {
    const rnd = sfc32(fp[0], fp[1], fp[2], fp[3]);
    for (let i = 0; i < 12; i++) rnd();
    const pickI = a => Math.floor(rnd() * a.length);
    const type = typeOfColor(pal.colors[0]);
    const name = { cat: [{ d: 'syl', p: [type, pickI(D('syl')[type])] }, { d: 'mid', p: [pickI(D('mid'))] }, { d: 'tail', p: [pickI(D('tail'))] }] };
    // 技は4つの並びを乱数で並べ替えて先頭2つ（並べ替えは中身によらないので、番号で並べても同じ順になる）
    const moves = [0, 1, 2, 3].sort(() => rnd() - 0.5).slice(0, 2).map(i => ({ d: 'moves', p: [type, i] }));
    const pick = a => a[pickI(a)];
    const stat = (bias) => Math.max(8, Math.min(99, Math.round(30 + rnd() * 50 + bias)));
    return {
      type, name, moves, no: (fp[3] % 999) + 1,
      stats: {
        'たいりょく': stat(bias ? bias.hp : Math.log2(imgBytes / 1024 + 1) * 1.5 - 8),
        'こうげき': stat(bias ? bias.atk : pal.sat * 30 - 10),
        'まもり': stat(bias ? bias.def : (0.5 - pal.lum) * 30),
        'すばやさ': stat(bias ? bias.spd : pal.lum * 30 - 12)
      },
      main: vivid(pal.colors[0], 0, type), second: vivid(pal.colors[1], 40, type), third: vivid(pal.colors[2], 200, type),
      rx: 0.62 + rnd() * 0.3, ry: 0.55 + rnd() * 0.3,
      wob: { k: 3 + Math.floor(rnd() * 4), amp: rnd() * 0.07, ph: rnd() * 6.28 },
      sq: 2 + rnd() * 1.6,
      pattern: pick(['spots', 'spots', 'belly', 'stripes', 'none']),
      spots: Array.from({ length: 3 + Math.floor(rnd() * 5) }, () => [rnd() * 2 - 1, rnd() * 2 - 1, 0.08 + rnd() * 0.14]),
      top: pick(['ears', 'horns', 'antenna', 'type', 'type']),
      eyes: pick([1, 2, 2, 2, 3]), eyeSize: 0.11 + rnd() * 0.07,
      mouth: pick(['smile', 'fang', 'o', 'zig']),
      arms: rnd() < 0.7, cheeks: rnd() < 0.6
    };
  }

  // ---- 描く ----
  // ---- キャラの種類（AIモードで、写真に何が写っているかで決まる） ----
  // AI が答える言葉 → 体の形（shape）とキャラの呼び名。AI を使わないとき・どれでもないときはモンスターのまま
  const KINDS = {
    '料理': { shape: 'food' },
    '動物': { shape: 'animal' },
    '植物': { shape: 'plant' },
    '乗り物': { shape: 'robot' },
    '建物': { shape: 'building' },
    '空': { shape: 'sky' },
    '書類': { shape: 'paper' },
    '絵': { shape: 'drawing' },
    '画面': { shape: 'screen' },
    // 人間は AI の答えでは選ばれない。「80億分の1」の人生の記録をドロップしたときだけ（readLifeCard）
    '人間': { shape: 'human' }
  };
  const shapeOf = g => (KINDS[g.kind] || {}).shape || 'monster';
  // 動物は、さらに何の動物かで姿を描き分ける（AI が答える）
  const ANIMALS = { '犬': {}, '猫': {}, 'うさぎ': {}, 'くま': {}, '鳥': {}, '魚': {}, '虫': {}, 'は虫類': {} };
  // キャラの呼び名は、描くときにページの言語で
  const charaOf = g => (g.kind === '動物' && ANIMALS[g.animal]) ? D('animalCharas')[g.animal] : KINDS[g.kind] ? D('charas')[g.kind] : undefined;
  // 体の輪かく。種類ごとに形が違う
  function bodyPath(shape, cx, cy, rx, ry, R, g) {
    const p = new Path2D();
    if (shape === 'food') { // 器（どんぶり）
      p.moveTo(cx - rx, cy - ry * 0.15); p.lineTo(cx + rx, cy - ry * 0.15);
      p.bezierCurveTo(cx + rx, cy + ry * 0.75, cx + rx * 0.5, cy + ry * 0.95, cx, cy + ry * 0.95);
      p.bezierCurveTo(cx - rx * 0.5, cy + ry * 0.95, cx - rx, cy + ry * 0.75, cx - rx, cy - ry * 0.15);
    } else if (shape === 'plant') { // しずく形（上がとがる）
      p.moveTo(cx, cy - ry * 1.1);
      p.bezierCurveTo(cx + rx * 0.9, cy - ry * 0.5, cx + rx * 1.05, cy + ry * 0.6, cx, cy + ry * 0.95);
      p.bezierCurveTo(cx - rx * 1.05, cy + ry * 0.6, cx - rx * 0.9, cy - ry * 0.5, cx, cy - ry * 1.1);
    } else if (shape === 'robot') {
      p.roundRect(cx - rx * 0.9, cy - ry * 0.85, rx * 1.8, ry * 1.75, R * 0.12);
    } else if (shape === 'building') { // 家の形
      p.moveTo(cx - rx * 0.85, cy - ry * 0.35); p.lineTo(cx, cy - ry * 1.05); p.lineTo(cx + rx * 0.85, cy - ry * 0.35);
      p.lineTo(cx + rx * 0.85, cy + ry * 0.95); p.lineTo(cx - rx * 0.85, cy + ry * 0.95);
    } else if (shape === 'sky') { // 星の形
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.58 : 1.08;
        const x = cx + Math.cos(a) * rx * r, y = cy + ry * 0.12 + Math.sin(a) * ry * r;
        i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
    } else if (shape === 'paper') { // 右上の角が折れた紙
      p.moveTo(cx - rx * 0.8, cy - ry * 0.95); p.lineTo(cx + rx * 0.45, cy - ry * 0.95); p.lineTo(cx + rx * 0.8, cy - ry * 0.6);
      p.lineTo(cx + rx * 0.8, cy + ry * 0.95); p.lineTo(cx - rx * 0.8, cy + ry * 0.95);
    } else { // モンスター・けもの・絵・ドット：今までの丸い体
      for (let i = 0; i <= 90; i++) {
        const t = i / 90 * Math.PI * 2, w = 1 + g.wob.amp * Math.sin(g.wob.k * t + g.wob.ph);
        const co = Math.cos(t), si = Math.sin(t), q = 2 / g.sq;
        const x = cx + Math.sign(co) * Math.pow(Math.abs(co), q) * rx * w;
        const y = cy + Math.sign(si) * Math.pow(Math.abs(si), q) * ry * w;
        i ? p.lineTo(x, y) : p.moveTo(x, y);
      }
    }
    p.closePath();
    return p;
  }
  // 顔の高さ（体の形によって、顔を置く場所が違う）
  const FACE_Y = { food: 0.45, plant: 0.12, building: 0.12, sky: 0.15, paper: -0.1 };

  // 頭の下に胴体と手足を付ける形。丸い体のキャラと、けもの（犬・猫・うさぎ・くま・その他）だけ。
  // 魚・鳥・虫・は虫類は体の形そのものが動物らしさなので、今までどおり1つの体で描く
  let WITH_BODY = false;
  function hasBody(g) {
    const shape = shapeOf(g);
    if (['monster', 'drawing', 'screen'].includes(shape)) return true;
    return shape === 'animal' && !['鳥', '魚', '虫', 'は虫類'].includes(g.animal);
  }
  function drawMonster(c, cx, cy, R, g, gender) {
    if (shapeOf(g) === 'human') return drawHuman(c, cx, cy, R, g, gender);
    if (!hasBody(g)) return drawHead(c, cx, cy, R, g);
    const shape = shapeOf(g), HS = 0.66, hy = cy - R * 0.22;
    const main = css(g.main), dark = css(shade(g.main, -0.35)), outline = Math.max(2, R * HS * 0.035);
    const ty = cy + R * 0.42, trx = R * (0.26 + g.rx * 0.16), tr = R * 0.29;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = dark; c.lineWidth = outline;
    const limb = (x1, y1, x2, y2, w, fill) => { // 丸い先の太い線を、ふちどりしてから塗る
      c.strokeStyle = dark; c.lineWidth = w + outline * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = fill; c.lineWidth = w; c.stroke();
    };
    // 足（胴のうしろから出す）
    for (const s of [-1, 1]) {
      const x = cx + s * trx * 0.45;
      limb(x, ty + tr * 0.4, x + s * R * 0.02, cy + R * 0.74, R * 0.13, main);
      c.fillStyle = dark; c.beginPath(); c.ellipse(x + s * R * 0.04, cy + R * 0.79, R * 0.1, R * 0.05, 0, 0, 7); c.fill();
    }
    // しっぽ（けものだけ）
    if (shape === 'animal') {
      const a = g.animal, x0 = cx + trx * 0.8, y0 = ty + tr * 0.3;
      c.strokeStyle = dark; c.lineWidth = outline;
      if (a === '犬') { limb(x0, y0, x0 + R * 0.22, y0 - R * 0.25, R * 0.07, main); }
      else if (a === '猫') { c.strokeStyle = main; c.lineWidth = R * 0.06; c.beginPath(); c.moveTo(x0, y0 + R * 0.1); c.bezierCurveTo(x0 + R * 0.4, y0 + R * 0.1, x0 + R * 0.1, y0 - R * 0.35, x0 + R * 0.35, y0 - R * 0.45); c.stroke(); }
      else if (a === 'うさぎ') { c.fillStyle = '#fff'; c.beginPath(); c.arc(x0 + R * 0.04, y0 + R * 0.08, R * 0.09, 0, 7); c.fill(); c.stroke(); }
      else { c.fillStyle = main; c.beginPath(); c.arc(x0 + R * 0.03, y0 + R * 0.08, R * 0.07, 0, 7); c.fill(); c.stroke(); }
    }
    // 胴
    const body = new Path2D(); body.ellipse(cx, ty, trx, tr, 0, 0, 7);
    const gr = c.createRadialGradient(cx - trx * 0.3, ty - tr * 0.4, R * 0.05, cx, ty, R * 0.5);
    gr.addColorStop(0, css(shade(g.main, 0.25))); gr.addColorStop(1, main);
    c.fillStyle = shape === 'drawing' ? main : gr; c.fill(body);
    c.save(); c.clip(body);
    if (shape === 'animal') animalTexture(c, cx, ty, trx, tr, R * HS, g);
    // おなか：明るい色のだ円（けものは白っぽく）
    c.fillStyle = shape === 'animal' ? 'rgba(255,255,255,.55)' : css(shade(g.second, 0.45));
    c.beginPath(); c.ellipse(cx, ty + tr * 0.25, trx * 0.58, tr * 0.7, 0, 0, 7); c.fill();
    c.restore();
    if (shape === 'drawing') { c.strokeStyle = '#222'; c.lineWidth = outline * 1.6; } else { c.strokeStyle = dark; c.lineWidth = outline; }
    c.stroke(body);
    // 腕：腕のある子は片手を上げてあいさつ、ない子は短い腕をおろす
    for (const s of [-1, 1]) {
      const x = cx + s * trx * 0.85, y = ty - tr * 0.35, up = g.arms && s > 0;
      const ex = x + s * R * (up ? 0.2 : 0.14), ey = up ? y - R * 0.24 : y + R * 0.2;
      limb(x, y, ex, ey, R * 0.1, main);
      c.fillStyle = css(shade(g.main, 0.2)); c.strokeStyle = dark; c.lineWidth = outline;
      c.beginPath(); c.arc(ex, ey, R * 0.065, 0, 7); c.fill(); c.stroke();
    }
    // 頭
    WITH_BODY = true;
    try { drawHead(c, cx, hy, R * HS, g); } finally { WITH_BODY = false; }
    if (shape === 'screen') pixelate(c, cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6, Math.max(4, Math.round(R * 0.07)));
    c.restore();
  }
  function drawHead(c, cx, cy, R, g) {
    const shape = shapeOf(g);
    const prop = shape === 'animal' ? (ANIMAL_PROP[g.animal] || [1, 1]) : [1, 1];
    const rx = R * g.rx * prop[0], ry = R * g.ry * prop[1], main = css(g.main), dark = css(shade(g.main, -0.35)), acc = css(g.third);
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round';
    const outline = Math.max(2, R * 0.035);
    const blob = ['monster', 'animal', 'drawing', 'screen'].includes(shape);
    c.fillStyle = dark; c.strokeStyle = dark; c.lineWidth = outline;
    // ---- 体のうしろ：足・腕・頭の飾り ----
    if (shape === 'robot') {
      for (const s of [-1, 1]) { c.fillRect(cx + s * rx * 0.45 - rx * 0.13, cy + ry * 0.85, rx * 0.26, ry * 0.2); c.fillRect(cx + s * rx * 0.9 - (s < 0 ? rx * 0.22 : 0), cy - ry * 0.1, rx * 0.22, ry * 0.5); }
      c.beginPath(); c.moveTo(cx, cy - ry * 0.85); c.lineTo(cx, cy - ry * 1.2); c.stroke();
      c.fillStyle = acc; c.beginPath(); c.arc(cx, cy - ry * 1.25, rx * 0.1, 0, 7); c.fill(); c.stroke();
    } else if (shape === 'plant') {
      c.strokeStyle = '#7a4f2a'; c.lineWidth = outline * 1.4;
      for (const s of [-1, 0, 1]) { c.beginPath(); c.moveTo(cx + s * rx * 0.25, cy + ry * 0.85); c.quadraticCurveTo(cx + s * rx * 0.45, cy + ry * 1.0, cx + s * rx * 0.55, cy + ry * 1.12); c.stroke(); }
      c.fillStyle = '#3fbf6a'; c.strokeStyle = dark; c.lineWidth = outline;
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx, cy - ry * 1.05); c.quadraticCurveTo(cx + s * rx * 0.75, cy - ry * 1.55, cx + s * rx * 0.55, cy - ry * 1.05); c.quadraticCurveTo(cx + s * rx * 0.3, cy - ry * 0.95, cx, cy - ry * 1.05); c.fill(); c.stroke(); }
      if (g.arms) for (const s of [-1, 1]) { c.fillStyle = '#3fbf6a'; c.beginPath(); c.ellipse(cx + s * rx * 0.95, cy + ry * 0.2, rx * 0.25, ry * 0.1, s * -0.5, 0, 7); c.fill(); c.stroke(); }
    } else if (shape === 'food') {
      c.beginPath(); c.ellipse(cx, cy + ry * 0.98, rx * 0.45, ry * 0.1, 0, 0, 7); c.fill();
      // 器に盛った中身と、湯気と、おはし
      c.fillStyle = css(g.second); c.beginPath(); c.ellipse(cx, cy - ry * 0.15, rx * 0.95, ry * 0.5, 0, Math.PI, 0); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(160,160,180,.7)'; c.lineWidth = outline * 0.9;
      for (const s of [-1, 0, 1]) { c.beginPath(); const x = cx + s * rx * 0.35; c.moveTo(x, cy - ry * 0.75); c.bezierCurveTo(x - rx * 0.12, cy - ry * 0.9, x + rx * 0.12, cy - ry * 1.0, x, cy - ry * 1.15); c.stroke(); }
      c.strokeStyle = '#8a5a2b'; c.lineWidth = outline * 1.3;
      for (const d of [0, 0.12]) { c.beginPath(); c.moveTo(cx + rx * (0.35 + d), cy - ry * 0.35); c.lineTo(cx + rx * (0.95 + d), cy - ry * 1.05); c.stroke(); }
      c.strokeStyle = dark; c.lineWidth = outline;
    } else if (shape === 'building') {
      c.fillRect(cx + rx * 0.4, cy - ry * 1.0, rx * 0.18, ry * 0.45);
    } else if (shape === 'sky') {
      c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(cx - rx * 0.9, cy - ry * 0.9, rx * 0.28, 0, 7); c.fill();
      c.fillStyle = '#f5f5fb'; c.beginPath(); c.arc(cx - rx * 0.8, cy - ry * 0.98, rx * 0.24, 0, 7); c.fill();
    } else if (shape === 'paper') {
      for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.4, cy + ry * 1.0, rx * 0.16, ry * 0.08, 0, 0, 7); c.fill(); }
      if (g.arms) for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.85, cy + ry * 0.2, rx * 0.12, ry * 0.2, s * 0.6, 0, 7); c.fill(); }
    } else {
      if (shape !== 'animal' && !WITH_BODY) {
        for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.45, cy + ry * 0.92, rx * 0.22, ry * 0.16, 0, 0, 7); c.fill(); }
        if (g.arms) for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.98, cy + ry * 0.15, rx * 0.16, ry * 0.26, s * 0.6, 0, 7); c.fill(); }
      }
      if (shape === 'animal') {
        animalBack(c, cx, cy, rx, ry, R, g, main, dark, outline);
      } else drawTop(c, cx, cy - ry * 0.85, rx, ry, g, acc, dark);
    }
    // ---- 体 ----
    const body = bodyPath(shape, cx, cy, rx, ry, R, g);
    if (shape === 'drawing') c.fillStyle = main; // 手描きの絵は、ぬりつぶしの平らな色
    else {
      const gr = c.createRadialGradient(cx - rx * 0.3, cy - ry * 0.4, R * 0.1, cx, cy, R * 1.1);
      gr.addColorStop(0, css(shade(g.main, 0.25))); gr.addColorStop(1, main);
      c.fillStyle = gr;
    }
    c.fill(body);
    // 模様（体の中だけ）。紙は模様の代わりに文字の行
    c.save(); c.clip(body); c.fillStyle = css(g.second); c.globalAlpha = 0.85;
    if (shape === 'paper') { c.fillStyle = 'rgba(40,40,70,.25)'; for (let i = 0; i < 4; i++) c.fillRect(cx - rx * 0.6, cy + ry * (0.35 + i * 0.13), rx * (i === 3 ? 0.7 : 1.2), ry * 0.04); }
    else if (shape === 'robot') { c.fillStyle = 'rgba(0,0,0,.12)'; c.fillRect(cx - rx * 0.9, cy + ry * 0.35, rx * 1.8, ry * 0.06); }
    else if (shape !== 'food' && shape !== 'building') {
      if (shape === 'animal') { animalTexture(c, cx, cy, rx, ry, R, g); c.fillStyle = css(g.second); c.globalAlpha = 0.22; }
      if (g.pattern === 'spots') for (const [x, y, r] of g.spots) { c.beginPath(); c.arc(cx + x * rx * 0.8, cy + y * ry * 0.4 + ry * 0.35, r * R, 0, 7); c.fill(); }
      if (g.pattern === 'belly') { c.fillStyle = css(shade(g.second, 0.35)); c.beginPath(); c.ellipse(cx, cy + ry * 0.45, rx * 0.55, ry * 0.5, 0, 0, 7); c.fill(); }
      if (g.pattern === 'stripes') for (let i = -3; i <= 3; i++) { c.fillRect(cx + i * rx * 0.32 - rx * 0.06, cy - ry, rx * 0.12, ry * 2); }
    }
    c.restore();
    if (shape === 'drawing') { // クレヨンで何度もなぞったような太い線
      c.strokeStyle = '#222'; c.lineWidth = outline * 1.6;
      for (const [dx, dy] of [[0, 0], [1.5, -1], [-1, 1.5]]) { c.save(); c.translate(dx * Math.cos(g.wob.ph), dy * Math.sin(g.wob.ph)); c.stroke(body); c.restore(); }
    } else { c.lineWidth = outline; c.strokeStyle = dark; c.stroke(body); }
    // ---- 体の前：屋根・ドア・折り目・ボルト・星くず ----
    c.strokeStyle = dark; c.lineWidth = outline;
    if (shape === 'building') {
      c.fillStyle = acc; c.beginPath(); c.moveTo(cx - rx, cy - ry * 0.3); c.lineTo(cx, cy - ry * 1.12); c.lineTo(cx + rx, cy - ry * 0.3); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark; roundRect(c, cx - rx * 0.16, cy + ry * 0.55, rx * 0.32, ry * 0.4, rx * 0.06); c.fill();
      c.fillStyle = '#ffe9a8'; for (const s of [-1, 1]) { c.fillRect(cx + s * rx * 0.55 - rx * 0.1, cy + ry * 0.55, rx * 0.2, ry * 0.18); c.strokeRect(cx + s * rx * 0.55 - rx * 0.1, cy + ry * 0.55, rx * 0.2, ry * 0.18); }
    } else if (shape === 'paper') {
      c.fillStyle = css(shade(g.main, 0.4)); c.beginPath(); c.moveTo(cx + rx * 0.45, cy - ry * 0.95); c.lineTo(cx + rx * 0.45, cy - ry * 0.6); c.lineTo(cx + rx * 0.8, cy - ry * 0.6); c.closePath(); c.fill(); c.stroke();
    } else if (shape === 'robot') {
      c.fillStyle = acc; for (const [x, y] of [[-0.75, -0.7], [0.75, -0.7], [-0.75, 0.75], [0.75, 0.75]]) { c.beginPath(); c.arc(cx + x * rx, cy + y * ry, rx * 0.05, 0, 7); c.fill(); }
    } else if (shape === 'sky') {
      c.fillStyle = '#ffe14d';
      for (const [x, y, r] of [[-1.15, 0.3, 0.07], [1.15, -0.5, 0.09], [1.0, 0.75, 0.06], [-0.95, -0.25, 0.05]]) { c.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, k = i % 2 ? r * 0.35 : r; c.lineTo(cx + x * rx + Math.cos(a) * k * R, cy + y * ry + Math.sin(a) * k * R); } c.closePath(); c.fill(); }
    } else if (shape === 'animal') {
      animalFront(c, cx, cy, rx, ry, R, g, main, dark, outline);
    }
    // ---- 顔 ----
    if (shape === 'animal') { animalFace(c, cx, cy, rx, ry, R, g, outline); c.restore(); return; }
    const ey = cy + ry * ((FACE_Y[shape] || 0) - 0.18), es = R * g.eyeSize;
    const xs = g.eyes === 1 ? [0] : g.eyes === 2 ? [-0.36, 0.36] : [-0.45, 0, 0.45];
    c.strokeStyle = dark;
    xs.forEach((ex, i) => {
      const x = cx + ex * rx, y = ey - (g.eyes === 3 && i === 1 ? es * 0.9 : 0);
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x, y, es, 0, 7); c.fill(); c.lineWidth = outline * 0.8; c.stroke();
      c.fillStyle = '#1a1a2e'; c.beginPath(); c.arc(x + es * 0.15, y + es * 0.1, es * 0.55, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x + es * 0.32, y - es * 0.15, es * 0.2, 0, 7); c.fill();
    });
    if (shape === 'paper') { // めがね
      c.strokeStyle = '#1a1a2e'; c.lineWidth = outline * 0.9;
      xs.forEach(ex => { c.beginPath(); c.arc(cx + ex * rx, ey, es * 1.35, 0, 7); c.stroke(); });
      if (xs.length > 1) { c.beginPath(); c.moveTo(cx + xs[0] * rx + es * 1.35, ey); c.lineTo(cx + xs[1] * rx - es * 1.35, ey); c.stroke(); }
    }
    if (g.cheeks) { c.fillStyle = 'rgba(255,110,150,.45)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.6, ey + es * 1.6, es * 0.8, es * 0.45, 0, 0, 7); c.fill(); } }
    const my = ey + es * 2.1, mw = rx * 0.28;
    c.strokeStyle = '#1a1a2e'; c.lineWidth = outline;
    c.beginPath();
    if (g.mouth === 'smile' || g.mouth === 'fang') { c.arc(cx, my - mw * 0.5, mw, 0.2 * Math.PI, 0.8 * Math.PI); c.stroke(); }
    if (g.mouth === 'fang') { c.fillStyle = '#fff'; c.beginPath(); c.moveTo(cx + mw * 0.3, my + mw * 0.38); c.lineTo(cx + mw * 0.5, my + mw * 0.75); c.lineTo(cx + mw * 0.65, my + mw * 0.3); c.fill(); }
    if (g.mouth === 'o') { c.fillStyle = '#7a1f2b'; c.ellipse(cx, my + mw * 0.2, mw * 0.32, mw * 0.4, 0, 0, 7); c.fill(); }
    if (g.mouth === 'zig') { for (let i = 0; i <= 4; i++) c.lineTo(cx - mw + i * mw / 2, my + (i % 2 ? mw * 0.25 : 0)); c.stroke(); }
    c.restore();
    // 画面のキャラは、描いたあとで粗いマス目（ドット絵）にする
    if (shape === 'screen' && !WITH_BODY) pixelate(c, cx - R * 1.3, cy - R * 1.3, R * 2.6, R * 2.6, Math.max(4, Math.round(R * 0.07)));
  }
  // ---- 動物（AI が何の動物かを答えたとき）。毛並み・目・鼻を、なるべく本物らしく描く ----
  const ANIMAL_PROP = { '鳥': [0.85, 1.05], '魚': [1.15, 0.72], '虫': [0.8, 0.85], 'は虫類': [1.1, 0.75], 'うさぎ': [0.9, 0.95] };
  const rndOf = g => sfc32(Math.floor(g.wob.ph * 1e6), Math.floor(g.rx * 1e6), Math.floor(g.ry * 1e6), Math.floor(g.eyeSize * 1e6));
  function animalBack(c, cx, cy, rx, ry, R, g, main, dark, outline) {
    const a = g.animal, light = css(shade(g.main, 0.25)), inner = '#f2a7b5';
    c.fillStyle = dark; c.strokeStyle = dark; c.lineWidth = outline;
    const paws = () => { if (!WITH_BODY) for (const s of [-1, 1]) { c.fillStyle = dark; c.beginPath(); c.ellipse(cx + s * rx * 0.42, cy + ry * 0.93, rx * 0.2, ry * 0.13, 0, 0, 7); c.fill(); } };
    if (a === '犬') {
      paws();
      if (!WITH_BODY) { c.strokeStyle = main; c.lineWidth = rx * 0.13; c.beginPath(); c.moveTo(cx + rx * 0.8, cy + ry * 0.35); c.quadraticCurveTo(cx + rx * 1.3, cy + ry * 0.1, cx + rx * 1.25, cy - ry * 0.35); c.stroke(); }
    } else if (a === '猫') {
      paws();
      for (const s of [-1, 1]) {
        c.fillStyle = main; c.strokeStyle = dark; c.lineWidth = outline;
        c.beginPath(); c.moveTo(cx + s * rx * 0.25, cy - ry * 0.75); c.lineTo(cx + s * rx * 0.62, cy - ry * 1.32); c.lineTo(cx + s * rx * 0.85, cy - ry * 0.5); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = inner; c.beginPath(); c.moveTo(cx + s * rx * 0.38, cy - ry * 0.75); c.lineTo(cx + s * rx * 0.6, cy - ry * 1.15); c.lineTo(cx + s * rx * 0.74, cy - ry * 0.62); c.closePath(); c.fill();
      }
      if (!WITH_BODY) { c.strokeStyle = main; c.lineWidth = rx * 0.11; c.beginPath(); c.moveTo(cx + rx * 0.8, cy + ry * 0.6); c.bezierCurveTo(cx + rx * 1.5, cy + ry * 0.6, cx + rx * 1.1, cy - ry * 0.3, cx + rx * 1.45, cy - ry * 0.55); c.stroke(); }
    } else if (a === 'うさぎ') {
      paws();
      for (const s of [-1, 1]) {
        c.fillStyle = main; c.strokeStyle = dark; c.lineWidth = outline;
        c.beginPath(); c.ellipse(cx + s * rx * 0.32, cy - ry * 1.35, rx * 0.17, ry * 0.62, s * 0.15, 0, 7); c.fill(); c.stroke();
        c.fillStyle = inner; c.beginPath(); c.ellipse(cx + s * rx * 0.32, cy - ry * 1.3, rx * 0.08, ry * 0.45, s * 0.15, 0, 7); c.fill();
      }
      if (!WITH_BODY) { c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + rx * 0.9, cy + ry * 0.55, rx * 0.17, 0, 7); c.fill(); }
    } else if (a === '鳥') {
      c.strokeStyle = '#e09a2b'; c.lineWidth = outline * 1.2;
      for (const s of [-1, 1]) { const x = cx + s * rx * 0.3; c.beginPath(); c.moveTo(x, cy + ry * 0.85); c.lineTo(x, cy + ry * 1.12); c.moveTo(x, cy + ry * 1.12); c.lineTo(x - rx * 0.12, cy + ry * 1.2); c.moveTo(x, cy + ry * 1.12); c.lineTo(x + rx * 0.12, cy + ry * 1.2); c.stroke(); }
      c.fillStyle = dark; for (const d of [-0.15, 0, 0.15]) { c.beginPath(); c.ellipse(cx + d * rx, cy - ry * 1.02, rx * 0.06, ry * 0.18, d * 2, 0, 7); c.fill(); }
      c.beginPath(); c.moveTo(cx + rx * 0.7, cy + ry * 0.4); c.lineTo(cx + rx * 1.25, cy + ry * 0.75); c.lineTo(cx + rx * 1.15, cy + ry * 0.45); c.lineTo(cx + rx * 1.3, cy + ry * 0.35); c.closePath(); c.fill();
    } else if (a === '魚') {
      c.fillStyle = css(g.second); c.strokeStyle = dark; c.lineWidth = outline;
      c.beginPath(); c.moveTo(cx + rx * 0.85, cy); c.lineTo(cx + rx * 1.4, cy - ry * 0.6); c.quadraticCurveTo(cx + rx * 1.2, cy, cx + rx * 1.4, cy + ry * 0.6); c.closePath(); c.fill(); c.stroke();
      c.beginPath(); c.moveTo(cx - rx * 0.3, cy - ry * 0.85); c.quadraticCurveTo(cx + rx * 0.1, cy - ry * 1.5, cx + rx * 0.45, cy - ry * 0.8); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(120,180,230,.7)'; c.lineWidth = outline * 0.7;
      for (const [x, y, r] of [[-1.2, -0.6, 0.08], [-1.35, -0.95, 0.05], [-1.1, -1.2, 0.035]]) { c.beginPath(); c.arc(cx + x * rx, cy + y * ry, r * R, 0, 7); c.stroke(); }
    } else if (a === '虫') {
      c.fillStyle = 'rgba(210,235,255,.65)'; c.strokeStyle = 'rgba(80,110,150,.6)'; c.lineWidth = outline * 0.6;
      for (const s of [-1, 1]) for (const [dy, sc] of [[-0.35, 1], [0.05, 0.75]]) { c.beginPath(); c.ellipse(cx + s * rx * 0.85, cy + ry * dy, rx * 0.55 * sc, ry * 0.3 * sc, s * -0.5, 0, 7); c.fill(); c.stroke(); }
      c.strokeStyle = dark; c.lineWidth = outline * 0.9;
      for (const s of [-1, 1]) for (const k of [0, 1, 2]) { const y = cy + ry * (0.25 + k * 0.25); c.beginPath(); c.moveTo(cx + s * rx * 0.7, y); c.lineTo(cx + s * rx * 1.05, y + ry * 0.12); c.lineTo(cx + s * rx * 1.15, y + ry * 0.35); c.stroke(); }
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * rx * 0.2, cy - ry * 0.85); c.quadraticCurveTo(cx + s * rx * 0.3, cy - ry * 1.4, cx + s * rx * 0.6, cy - ry * 1.45); c.stroke(); c.fillStyle = dark; c.beginPath(); c.arc(cx + s * rx * 0.6, cy - ry * 1.45, rx * 0.06, 0, 7); c.fill(); }
    } else if (a === 'は虫類') {
      c.fillStyle = main; c.strokeStyle = dark; c.lineWidth = outline;
      c.beginPath(); c.moveTo(cx + rx * 0.7, cy + ry * 0.1); c.quadraticCurveTo(cx + rx * 1.5, cy + ry * 0.3, cx + rx * 1.55, cy + ry * 0.95); c.quadraticCurveTo(cx + rx * 1.2, cy + ry * 0.6, cx + rx * 0.7, cy + ry * 0.6); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = dark; for (const s of [-1, 1]) for (const dy of [0.05, 0.75]) { c.beginPath(); c.ellipse(cx + s * rx * 0.85, cy + ry * dy, rx * 0.2, ry * 0.12, s * 0.6, 0, 7); c.fill(); }
      c.fillStyle = css(g.second); for (let i = -3; i <= 3; i++) { const x = cx + i * rx * 0.22, y = cy - ry * Math.sqrt(Math.max(0, 1 - Math.pow(i * 0.22, 2))) * 0.97; c.beginPath(); c.moveTo(x - rx * 0.08, y + ry * 0.05); c.lineTo(x, y - ry * 0.22); c.lineTo(x + rx * 0.08, y + ry * 0.05); c.closePath(); c.fill(); c.stroke(); }
    } else { // くま・その他：丸い耳と短いしっぽ
      paws();
      for (const s of [-1, 1]) { c.fillStyle = main; c.beginPath(); c.arc(cx + s * rx * 0.62, cy - ry * 0.8, rx * 0.26, 0, 7); c.fill(); c.stroke(); c.fillStyle = css(shade(g.main, -0.15)); c.beginPath(); c.arc(cx + s * rx * 0.62, cy - ry * 0.8, rx * 0.14, 0, 7); c.fill(); }
    }
    c.fillStyle = dark; c.strokeStyle = dark; c.lineWidth = outline;
  }
  // 毛・羽・うろこの手ざわり（体の中に、細かい線を何百本も描く）
  function animalTexture(c, cx, cy, rx, ry, R, g) {
    const a = g.animal, r = rndOf(g);
    c.save(); c.globalAlpha = 1;
    // 下に向かってだんだん暗く（体の丸み）
    const lg = c.createLinearGradient(0, cy - ry, 0, cy + ry); lg.addColorStop(0, 'rgba(255,255,255,.18)'); lg.addColorStop(0.55, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.28)');
    c.fillStyle = lg; c.fillRect(cx - rx * 1.2, cy - ry * 1.2, rx * 2.4, ry * 2.4);
    if (a === '魚' || a === 'は虫類') { // うろこ
      c.strokeStyle = 'rgba(0,0,0,.18)'; c.lineWidth = 1.2; const sz = R * 0.09;
      for (let y = cy - ry; y < cy + ry; y += sz * 0.7) for (let x = cx - rx; x < cx + rx; x += sz) { const o = (Math.round((y - cy) / (sz * 0.7)) % 2) * sz / 2; c.beginPath(); c.arc(x + o, y, sz / 2, 0, Math.PI); c.stroke(); }
    } else if (a === '鳥') { // 羽
      c.strokeStyle = 'rgba(0,0,0,.14)'; c.lineWidth = 1.4;
      for (let i = 0; i < 60; i++) { const x = cx + (r() * 2 - 1) * rx, y = cy + (r() * 1.6 - 0.4) * ry, w = R * (0.06 + r() * 0.05); c.beginPath(); c.arc(x, y, w, 0.1 * Math.PI, 0.9 * Math.PI); c.stroke(); }
    } else if (a === '虫') { // 節（しま）とつや
      c.fillStyle = 'rgba(0,0,0,.18)'; for (let k = 0; k < 4; k++) c.fillRect(cx - rx, cy + ry * (0.05 + k * 0.22), rx * 2, ry * 0.07);
      c.fillStyle = 'rgba(255,255,255,.35)'; c.beginPath(); c.ellipse(cx - rx * 0.35, cy - ry * 0.45, rx * 0.18, ry * 0.08, -0.5, 0, 7); c.fill();
    } else { // 毛並み：外へ向かって流れる短い毛
      for (let i = 0; i < 420; i++) {
        const t = r() * Math.PI * 2, d = Math.sqrt(r()), x = cx + Math.cos(t) * rx * d, y = cy + Math.sin(t) * ry * d;
        const len = R * (0.035 + r() * 0.04), ang = t + (r() - 0.5) * 0.6;
        c.strokeStyle = r() < 0.5 ? 'rgba(0,0,0,.16)' : 'rgba(255,255,255,.22)'; c.lineWidth = 1 + r();
        c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke();
      }
    }
    c.restore();
  }
  function animalFront(c, cx, cy, rx, ry, R, g, main, dark, outline) {
    const a = g.animal;
    c.strokeStyle = dark; c.lineWidth = outline;
    if (a === '犬') { // たれた耳
      for (const s of [-1, 1]) { c.fillStyle = css(shade(g.main, -0.3)); c.beginPath(); c.ellipse(cx + s * rx * 0.78, cy - ry * 0.25, rx * 0.2, ry * 0.45, s * -0.35, 0, 7); c.fill(); c.stroke(); }
    }
    if (a === '鳥') { // つばさ
      for (const s of [-1, 1]) { c.fillStyle = css(shade(g.main, -0.2)); c.beginPath(); c.ellipse(cx + s * rx * 0.82, cy + ry * 0.2, rx * 0.22, ry * 0.42, s * -0.3, 0, 7); c.fill(); c.stroke();
        c.strokeStyle = 'rgba(0,0,0,.25)'; for (const k of [-0.15, 0, 0.15]) { c.beginPath(); c.moveTo(cx + s * rx * 0.82, cy + ry * (0.0 + k)); c.lineTo(cx + s * rx * 0.9, cy + ry * (0.45 + k)); c.stroke(); } c.strokeStyle = dark; }
    }
    if (a === '魚') { c.fillStyle = css(g.second); c.beginPath(); c.ellipse(cx + rx * 0.15, cy + ry * 0.45, rx * 0.22, ry * 0.12, 0.5, 0, 7); c.fill(); c.stroke(); }
    // 口のまわり（犬・くま・その他の毛の動物）
    if (['犬', 'くま', undefined, 'その他'].includes(a) || !ANIMALS[a]) { c.fillStyle = css(shade(g.main, 0.45)); c.beginPath(); c.ellipse(cx, cy + ry * 0.24, rx * 0.32, ry * 0.22, 0, 0, 7); c.fill(); }
  }
  // 本物らしい目（色のついた虹彩・瞳・光）と、鼻・口・ひげ
  function animalFace(c, cx, cy, rx, ry, R, g, outline) {
    const a = g.animal, ey = cy - ry * 0.18, es = R * g.eyeSize * 0.85;
    const iris = { '猫': '#9ccf3a', '犬': '#6b3f1f', 'くま': '#3b2410', '鳥': '#1a1a1a', '魚': '#d9c04a', '虫': '#111', 'は虫類': '#e0b020', 'うさぎ': '#7a1f2b' }[a] || '#6b4a2a';
    const xs = a === '魚' || a === 'は虫類' ? [-0.45, 0.45] : [-0.32, 0.32];
    for (const ex of xs) {
      const x = cx + ex * rx;
      if (a === '虫') { c.fillStyle = '#111'; c.beginPath(); c.ellipse(x, ey, es * 1.15, es * 1.3, 0, 0, 7); c.fill(); c.fillStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.arc(x - es * 0.35, ey - es * 0.45, es * 0.25, 0, 7); c.fill(); continue; }
      c.fillStyle = '#fbfbf5'; c.beginPath(); c.ellipse(x, ey, es * 1.05, es, 0, 0, 7); c.fill();
      const ig = c.createRadialGradient(x, ey, es * 0.1, x, ey, es * 0.85); ig.addColorStop(0, css(shade(hex2rgb(iris), 0.35))); ig.addColorStop(1, iris);
      c.fillStyle = ig; c.beginPath(); c.arc(x, ey, es * 0.82, 0, 7); c.fill();
      c.fillStyle = '#0d0d12'; c.beginPath();
      if (a === '猫' || a === 'は虫類') c.ellipse(x, ey, es * 0.16, es * 0.7, 0, 0, 7); else c.arc(x, ey, es * 0.42, 0, 7);
      c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - es * 0.28, ey - es * 0.3, es * 0.2, 0, 7); c.fill();
      c.beginPath(); c.arc(x + es * 0.25, ey + es * 0.25, es * 0.08, 0, 7); c.fill();
      c.strokeStyle = 'rgba(0,0,0,.55)'; c.lineWidth = outline * 0.7; c.beginPath(); c.ellipse(x, ey, es * 1.05, es, 0, 0, 7); c.stroke();
    }
    const ny = cy + ry * 0.12;
    c.strokeStyle = '#1a1a2e'; c.lineWidth = outline * 0.9;
    if (a === '鳥') { c.fillStyle = '#f0a43a'; c.beginPath(); c.moveTo(cx - rx * 0.13, ny - ry * 0.05); c.lineTo(cx + rx * 0.13, ny - ry * 0.05); c.lineTo(cx, ny + ry * 0.2); c.closePath(); c.fill(); c.stroke(); return; }
    if (a === '魚') { c.beginPath(); c.ellipse(cx, ny + ry * 0.12, rx * 0.08, ry * 0.07, 0, 0, 7); c.stroke(); return; }
    if (a === '虫') { for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * rx * 0.08, ny + ry * 0.05); c.quadraticCurveTo(cx + s * rx * 0.2, ny + ry * 0.2, cx + s * rx * 0.05, ny + ry * 0.28); c.stroke(); } return; }
    if (a === 'は虫類') { c.fillStyle = '#1a1a2e'; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * rx * 0.08, ny, rx * 0.025, 0, 7); c.fill(); } c.beginPath(); c.moveTo(cx - rx * 0.4, ny + ry * 0.18); c.quadraticCurveTo(cx, ny + ry * 0.28, cx + rx * 0.4, ny + ry * 0.18); c.stroke(); return; }
    // 鼻（犬・くま・その他は黒くてつやつや、猫・うさぎは小さなピンク）
    const pink = a === '猫' || a === 'うさぎ';
    c.fillStyle = pink ? '#e8879a' : '#1a1a1e';
    c.beginPath(); c.moveTo(cx - rx * 0.11, ny - ry * 0.04); c.quadraticCurveTo(cx, ny - ry * 0.09, cx + rx * 0.11, ny - ry * 0.04); c.quadraticCurveTo(cx, ny + ry * 0.12, cx - rx * 0.11, ny - ry * 0.04);
    if (pink) c.scale(1, 1); c.fill();
    if (!pink) { c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(cx - rx * 0.04, ny - ry * 0.035, rx * 0.035, ry * 0.015, 0, 0, 7); c.fill(); }
    // 口（ω の形）
    c.beginPath(); c.moveTo(cx, ny + ry * 0.07); c.lineTo(cx, ny + ry * 0.12);
    c.moveTo(cx - rx * 0.14, ny + ry * 0.12); c.quadraticCurveTo(cx - rx * 0.07, ny + ry * 0.2, cx, ny + ry * 0.12); c.quadraticCurveTo(cx + rx * 0.07, ny + ry * 0.2, cx + rx * 0.14, ny + ry * 0.12); c.stroke();
    if (g.mouth === 'fang' || a === '犬') { c.fillStyle = '#e06a7a'; c.beginPath(); c.ellipse(cx, ny + ry * 0.2, rx * 0.06, ry * 0.07, 0, 0, Math.PI); c.fill(); }
    if (pink) { // ひげ
      c.strokeStyle = 'rgba(40,40,40,.6)'; c.lineWidth = 1.4;
      for (const s of [-1, 1]) for (const k of [-1, 0, 1]) { c.beginPath(); c.moveTo(cx + s * rx * 0.2, ny + ry * 0.05 + k * ry * 0.04); c.lineTo(cx + s * rx * 0.75, ny + k * ry * 0.1); c.stroke(); }
    }
    if (g.cheeks) { c.fillStyle = 'rgba(255,110,150,.25)'; for (const s of [-1, 1]) { c.beginPath(); c.ellipse(cx + s * rx * 0.55, ny + ry * 0.05, es * 0.8, es * 0.45, 0, 0, 7); c.fill(); } }
  }
  const hex2rgb = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  // ---- 人間（人生の記録から生まれた子） ----
  // 肌・髪の色と髪型は指紋から。70歳より長く生きた人は白髪。服はキャラの色（ビビッド）、服の柄は模様の遺伝子から
  const SKINS = ['#f6d7c3', '#eec1a0', '#d9a27c', '#b97a52', '#8d5a3b', '#6b4329'];
  const HAIRS = ['#2b2222', '#4a3020', '#6e4a2a', '#a8743c', '#d8b26a', '#8a3b22'];
  function humanLook(fp, life) {
    const j = life.joy || '', mean = j.length ? [...j].reduce((a, v) => a + Number(v), 0) / j.length / 9 : 0.5;
    return { skin: fp[1] % SKINS.length, hair: (fp[1] >>> 8) % HAIRS.length, hairStyle: (fp[1] >>> 16) % 4,
      gray: life.age >= 70, glasses: ((fp[1] >>> 20) & 3) === 0, mood: mean, item: null };
  }
  // 男性と女性は、ひと目で分かるように描き分ける：男性＝短い髪（ふつう・つんつん）と太いまゆ、
  // 女性＝長い髪（まっすぐ・リボン付き）とまつげ。どちらの髪型になるかは指紋で決まる
  function drawHuman(c, cx, cy, R, g, gender) {
    const female = gender === 'f', style = female ? ((g.hairStyle || 0) % 2 ? 4 : 1) : ((g.hairStyle || 0) % 2 ? 3 : 0);
    const skin = SKINS[g.skin || 0], hair = g.gray ? '#e2e2ea' : HAIRS[g.hair || 0], hairDark = g.gray ? '#b9b9c6' : css(shade(hex2rgb(HAIRS[g.hair || 0]), -0.35));
    const main = css(g.main), pants = css(shade(g.third, -0.4)), ol = Math.max(2, R * 0.022), line = '#2a2433';
    const hy = cy - R * 0.5, hr = R * 0.3, sy = cy - R * 0.14, sw = R * 0.62, sh = R * 0.56;
    c.save(); c.lineJoin = 'round'; c.lineCap = 'round'; c.strokeStyle = line; c.lineWidth = ol;
    // うしろ髪（長い髪）
    if (style === 1 || style === 4) { c.fillStyle = hair; roundRect(c, cx - hr * 1.08, hy - hr * 0.4, hr * 2.16, hr * 2.0, hr * 0.6); c.fill(); c.stroke(); }
    // 足と靴
    for (const s of [-1, 1]) {
      c.fillStyle = pants; roundRect(c, cx + (s < 0 ? -sw * 0.42 : sw * 0.04), sy + sh - R * 0.06, sw * 0.38, R * 0.42, R * 0.05); c.fill(); c.stroke();
      c.fillStyle = '#3a3340'; c.beginPath(); c.ellipse(cx + s * sw * 0.24, sy + sh + R * 0.37, R * 0.13, R * 0.06, 0, 0, 7); c.fill();
    }
    // 腕（右手は、腕のある子なら上げてあいさつ）
    const arm = (s, up) => {
      const x1 = cx + s * sw * 0.47, y1 = sy + R * 0.1, x2 = x1 + s * R * (up ? 0.16 : 0.08), y2 = up ? y1 - R * 0.3 : y1 + R * 0.38;
      c.strokeStyle = line; c.lineWidth = R * 0.15 + ol * 2; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      c.strokeStyle = main; c.lineWidth = R * 0.15; c.stroke();
      c.fillStyle = skin; c.strokeStyle = line; c.lineWidth = ol; c.beginPath(); c.arc(x2, y2, R * 0.07, 0, 7); c.fill(); c.stroke();
      return [x2, y2];
    };
    const left = arm(-1, false);
    arm(1, !!g.arms);
    // 胴（服）。柄：しま＝ボーダー、水玉＝ボタン、おなか＝エプロン
    const torso = new Path2D(); torso.roundRect(cx - sw / 2, sy, sw, sh, R * 0.14);
    c.fillStyle = main; c.fill(torso);
    c.save(); c.clip(torso); c.fillStyle = css(shade(g.second, 0.35));
    if (g.pattern === 'stripes') for (let i = 1; i < 6; i += 2) c.fillRect(cx - sw / 2, sy + sh * i / 6, sw, sh / 12);
    if (g.pattern === 'belly') { c.fillRect(cx - sw * 0.3, sy + sh * 0.35, sw * 0.6, sh); }
    if (g.pattern === 'spots') for (let i = 0; i < 3; i++) { c.beginPath(); c.arc(cx, sy + sh * (0.3 + i * 0.22), R * 0.025, 0, 7); c.fill(); }
    c.restore();
    c.strokeStyle = line; c.lineWidth = ol; c.stroke(torso);
    // 首とえり
    c.fillStyle = skin; c.beginPath(); c.moveTo(cx - R * 0.08, sy - R * 0.02); c.lineTo(cx + R * 0.08, sy - R * 0.02); c.lineTo(cx, sy + R * 0.1); c.closePath(); c.fill();
    // 頭・耳
    for (const s of [-1, 1]) { c.fillStyle = skin; c.beginPath(); c.arc(cx + s * hr * 0.98, hy + hr * 0.1, hr * 0.17, 0, 7); c.fill(); c.stroke(); }
    c.fillStyle = skin; c.beginPath(); c.arc(cx, hy, hr, 0, 7); c.fill(); c.stroke();
    // 前髪と髪型
    c.fillStyle = hair; c.strokeStyle = line;
    c.beginPath(); c.arc(cx, hy, hr * 1.04, Math.PI * 1.02, Math.PI * 1.98); c.quadraticCurveTo(cx + hr * 0.5, hy - hr * 0.35, cx, hy - hr * 0.5); c.quadraticCurveTo(cx - hr * 0.6, hy - hr * 0.3, cx - hr * 1.03, hy - hr * 0.05); c.closePath(); c.fill(); c.stroke();
    if (style === 4) { // 頭の横のリボン
      c.fillStyle = css(shade(g.second, 0.1));
      for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + hr * 0.62, hy - hr * 0.72); c.lineTo(cx + hr * (0.62 + s * 0.32), hy - hr * (0.72 + 0.22)); c.lineTo(cx + hr * (0.62 + s * 0.32), hy - hr * (0.72 - 0.22)); c.closePath(); c.fill(); c.stroke(); }
      c.beginPath(); c.arc(cx + hr * 0.62, hy - hr * 0.72, hr * 0.08, 0, 7); c.fill(); c.stroke(); c.fillStyle = hair;
    }
    if (style === 0) for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * hr * 0.98, hy - hr * 0.2); c.lineTo(cx + s * hr * 1.0, hy + hr * 0.2); c.lineTo(cx + s * hr * 0.86, hy + hr * 0.12); c.lineTo(cx + s * hr * 0.84, hy - hr * 0.3); c.closePath(); c.fill(); } // もみあげ
    if (style === 3) for (let k = 0; k < 7; k++) { // つんつんした短い髪（頭のふちに沿って、小さな毛先を並べる）
      const a = Math.PI * (1.15 + k * 0.7 / 6), bx = cx + Math.cos(a) * hr * 0.98, by = hy + Math.sin(a) * hr * 0.98;
      c.beginPath(); c.moveTo(bx - Math.sin(a) * hr * 0.16, by + Math.cos(a) * hr * 0.16); c.lineTo(bx + Math.cos(a) * hr * 0.2, by + Math.sin(a) * hr * 0.2); c.lineTo(bx + Math.sin(a) * hr * 0.16, by - Math.cos(a) * hr * 0.16); c.closePath(); c.fill();
    }
    // 顔：まゆ・目・ほお・口（口は一生の幸せの平均で変わる）
    const ey = hy + hr * 0.12;
    c.strokeStyle = hairDark; c.lineWidth = ol * (female ? 1.1 : 2.2);
    for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * hr * 0.24, ey - hr * (female ? 0.3 : 0.27)); c.lineTo(cx + s * hr * 0.56, ey - hr * (female ? 0.36 : 0.3)); c.stroke(); }
    if (female) { c.strokeStyle = '#2a2433'; c.lineWidth = ol; for (const s of [-1, 1]) for (const k of [0, 1]) { const x0 = cx + s * hr * (0.42 + k * 0.08); c.beginPath(); c.moveTo(x0, ey - hr * 0.1); c.lineTo(x0 + s * hr * 0.08, ey - hr * 0.2); c.stroke(); } }
    for (const s of [-1, 1]) {
      c.fillStyle = '#2a2433'; c.beginPath(); c.ellipse(cx + s * hr * 0.38, ey, hr * 0.1, hr * 0.13, 0, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(cx + s * hr * 0.38 + hr * 0.035, ey - hr * 0.05, hr * 0.04, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,120,140,.35)'; c.beginPath(); c.ellipse(cx + s * hr * 0.6, ey + hr * 0.28, hr * 0.14, hr * 0.08, 0, 0, 7); c.fill();
    }
    if (g.glasses) { c.strokeStyle = '#2a2433'; c.lineWidth = ol; for (const s of [-1, 1]) { c.beginPath(); c.arc(cx + s * hr * 0.38, ey, hr * 0.22, 0, 7); c.stroke(); } c.beginPath(); c.moveTo(cx - hr * 0.16, ey); c.lineTo(cx + hr * 0.16, ey); c.stroke(); }
    const my = hy + hr * 0.55, mood = g.mood === undefined ? 0.5 : g.mood;
    c.strokeStyle = '#7a2e3a'; c.lineWidth = ol * 1.2;
    if (female) c.strokeStyle = '#c23b5a'; // 女性は口もとを少し赤く
    if (mood > 0.62) { c.fillStyle = female ? '#d23f62' : '#b8434f'; c.beginPath(); c.arc(cx, my - hr * 0.05, hr * 0.2, 0.1, Math.PI - 0.1); c.closePath(); c.fill(); }
    else if (mood > 0.4) { c.beginPath(); c.arc(cx, my - hr * 0.12, hr * 0.17, 0.35, Math.PI - 0.35); c.stroke(); }
    else { c.beginPath(); c.moveTo(cx - hr * 0.12, my); c.lineTo(cx + hr * 0.12, my); c.stroke(); }
    if (g.gray) { c.strokeStyle = 'rgba(80,50,40,.35)'; c.lineWidth = ol * 0.7; for (const s of [-1, 1]) { c.beginPath(); c.moveTo(cx + s * hr * 0.62, ey - hr * 0.02); c.lineTo(cx + s * hr * 0.74, ey + hr * 0.06); c.stroke(); } }
    drawItem(c, left[0], left[1], R, g.item, line, ol, cx, sy, sw);
    c.restore();
  }
  // 仕事の道具（AI が最後の仕事から選ぶ。左手に持つ。聴診器だけは首にかける）
  function drawItem(c, x, y, R, item, line, ol, cx, sy, sw) {
    if (!item) return;
    c.save(); c.strokeStyle = line; c.lineWidth = ol;
    if (item === 'ノートPC') { c.fillStyle = '#c9ced8'; roundRect(c, x - R * 0.2, y - R * 0.02, R * 0.34, R * 0.22, R * 0.02); c.fill(); c.stroke(); c.fillStyle = '#6fb6ff'; c.fillRect(x - R * 0.17, y + R * 0.01, R * 0.28, R * 0.15); }
    else if (item === '本') { c.fillStyle = '#d94f4f'; roundRect(c, x - R * 0.16, y - R * 0.08, R * 0.26, R * 0.32, R * 0.02); c.fill(); c.stroke(); c.fillStyle = '#fff6dd'; c.fillRect(x + R * 0.06, y - R * 0.06, R * 0.03, R * 0.28); }
    else if (item === 'くわ') { c.strokeStyle = '#8a5a2b'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(x, y + R * 0.2); c.lineTo(x, y - R * 0.55); c.stroke(); c.fillStyle = '#9aa3ad'; c.strokeStyle = line; c.lineWidth = ol; c.beginPath(); c.moveTo(x, y - R * 0.55); c.lineTo(x - R * 0.22, y - R * 0.48); c.lineTo(x - R * 0.2, y - R * 0.4); c.lineTo(x, y - R * 0.46); c.closePath(); c.fill(); c.stroke(); }
    else if (item === '聴診器') { c.strokeStyle = '#3b4250'; c.lineWidth = R * 0.025; c.beginPath(); c.moveTo(cx - sw * 0.25, sy + R * 0.02); c.quadraticCurveTo(cx - sw * 0.2, sy + R * 0.32, cx + sw * 0.05, sy + R * 0.36); c.moveTo(cx + sw * 0.25, sy + R * 0.02); c.quadraticCurveTo(cx + sw * 0.25, sy + R * 0.25, cx + sw * 0.05, sy + R * 0.36); c.stroke(); c.fillStyle = '#c9ced8'; c.strokeStyle = line; c.lineWidth = ol; c.beginPath(); c.arc(cx + sw * 0.05, sy + R * 0.38, R * 0.045, 0, 7); c.fill(); c.stroke(); }
    else if (item === 'フライパン') { c.strokeStyle = '#3a3340'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(x, y); c.lineTo(x - R * 0.05, y + R * 0.2); c.stroke(); c.fillStyle = '#3a3340'; c.beginPath(); c.ellipse(x - R * 0.12, y + R * 0.34, R * 0.16, R * 0.08, 0.3, 0, 7); c.fill(); }
    else if (item === '工具') { c.strokeStyle = '#9aa3ad'; c.lineWidth = R * 0.05; c.beginPath(); c.moveTo(x, y - R * 0.05); c.lineTo(x, y + R * 0.28); c.stroke(); c.lineWidth = ol; c.strokeStyle = line; c.fillStyle = '#9aa3ad'; c.beginPath(); c.arc(x, y + R * 0.31, R * 0.06, 0, 7); c.fill(); c.stroke(); }
    else if (item === '筆') { c.strokeStyle = '#c08a5a'; c.lineWidth = R * 0.035; c.beginPath(); c.moveTo(x, y - R * 0.05); c.lineTo(x, y + R * 0.25); c.stroke(); c.fillStyle = '#2a2433'; c.beginPath(); c.ellipse(x, y + R * 0.3, R * 0.03, R * 0.06, 0, 0, 7); c.fill(); }
    else if (item === 'マイク') { c.strokeStyle = '#3a3340'; c.lineWidth = R * 0.04; c.beginPath(); c.moveTo(x, y + R * 0.05); c.lineTo(x, y - R * 0.12); c.stroke(); c.fillStyle = '#9aa3ad'; c.strokeStyle = line; c.lineWidth = ol; c.beginPath(); c.arc(x, y - R * 0.16, R * 0.07, 0, 7); c.fill(); c.stroke(); }
    else if (item === 'ボール') { c.fillStyle = '#ff9a3c'; c.beginPath(); c.arc(x, y + R * 0.1, R * 0.11, 0, 7); c.fill(); c.stroke(); c.beginPath(); c.moveTo(x - R * 0.11, y + R * 0.1); c.lineTo(x + R * 0.11, y + R * 0.1); c.stroke(); }
    c.restore();
  }

  // ---- 人生の記録（「80億分の1」の共有カード）を見分けて、人生地図を読む ----
  // 画像に埋め込みの印は無いので、絵の決まった形で見分ける：縦横 4:5・上の帯のえんじ色・地の色・左下の人生地図。
  // 幅1080にそろえて測る。写真アプリで縮んだ JPEG でも通るように、色には幅を持たせる。
  // 人生地図はマスの大きさが毎回違う（段の数で変わる）ので、1段目の右端からマスの間隔を出す。
  // 読むのは、生きた年ごとの幸せ（青緑の濃さ）・亡くなった年（濃い紺のマス）・平均寿命（太枠のマス）だけ
  function readLifeCard(img) {
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || w < 400 || Math.abs(h / w - 1.25) > 0.02) return null;
    const cv = document.createElement('canvas'); cv.width = 1080; cv.height = 1350;
    const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0, 1080, 1350);
    const d = x.getImageData(0, 0, 1080, 1350).data;
    const P = (px, py) => { const i = (Math.round(py) * 1080 + Math.round(px)) * 4; return [d[i], d[i + 1], d[i + 2]]; };
    const near = (cl, t, tol) => cl.every((v, i) => Math.abs(v - t[i]) <= tol);
    const share = (pts, t, tol) => pts.filter(q => near(P(q[0], q[1]), t, tol)).length / pts.length;
    const band = [], bg = [];
    for (let px = 20; px < 1060; px += 40) for (const py of [20, 60, 100]) band.push([px, py]);
    for (let py = 150; py < 1300; py += 50) bg.push([20, py], [1060, py]);
    if (share(band, [140, 29, 60], 24) < 0.8 || share(bg, [235, 240, 237], 14) < 0.85) return null;
    const teal = cl => cl[1] - cl[0] > 30, dark = cl => Math.max(...cl) < 95;
    let y0 = -1; for (let py = 905; py < 960 && y0 < 0; py++) if (teal(P(75, py))) y0 = py;
    let x0 = -1; for (let px = 50; px < 120 && x0 < 0 && y0 >= 0; px++) if (teal(P(px, y0 + 10))) x0 = px;
    if (x0 < 0) return null;
    let x1 = x0, miss = 0;
    for (let px = x0; px < 640 && miss < 12; px++) { if (teal(P(px, y0 + 10))) { x1 = px; miss = 0; } else miss++; }
    const pitch = (x1 - x0 + 1) / (10 - 0.146), cell = pitch * 0.854;
    if (pitch < 18 || pitch > 60) return null;
    const joy = []; let age = -1, avg = null;
    for (let r = 0; r < 14; r++) {
      const yc = y0 + r * pitch + cell / 2;
      if (yc > 1215) break;
      for (let k = 0; k < 10; k++) {
        const xl = x0 + k * pitch, cl = P(xl + cell / 2, yc), i = r * 10 + k;
        const yt = y0 + r * pitch, edge = f => [0, 1, 2, 3].some(o => dark(f(o))); // 太枠：マスの左と上のふちが濃い（JPEG ではにじむので、内側へ数画素たどる）
        if (avg === null && !dark(cl) && edge(o => P(xl + o, yc)) && edge(o => P(xl + cell / 2, yt + o))) avg = i;
        if (age >= 0) continue;
        if (teal(cl)) joy.push(clamp01((205 - cl[1]) / 90));
        else if (dark(cl)) age = i;
        else return null; // 亡くなった年より前に、色の無いマスがあるのはおかしい
      }
    }
    if (age < 1) return null;
    return { age, avg, joy: joy.map(v => Math.round(v * 9)).join('') };
  }
  // 人生地図から強さのかたよりを出す：たいりょく＝享年、こうげき＝とても幸せな年の多さ、
  // まもり＝幸せの浮き沈みの少なさ、すばやさ＝0〜20歳の幸せ
  function lifeMeas(life) {
    const j = [...life.joy].map(v => Number(v) / 9), n = j.length || 1;
    const mean = j.reduce((a, b) => a + b, 0) / n, sd = Math.sqrt(j.reduce((a, b) => a + (b - mean) ** 2, 0) / n);
    const y = j.slice(0, 20), ym = y.length ? y.reduce((a, b) => a + b, 0) / y.length : mean;
    return { bias: { hp: toBias(life.age / 100), atk: toBias(j.filter(v => v > 0.7).length / n * 2), def: toBias(1 - sd * 4), spd: toBias(ym) }, lively: mean, mean };
  }
  // 子ども・合体の人生地図：親の年を1年ずつ交互に編む（亡くなった年は無し）
  function mixLife(lives) {
    const ls = lives.filter(l => l && l.joy);
    if (!ls.length) return undefined;
    let joy = '';
    for (let i = 0; joy.length < 100 && i < 100; i++) for (const l of ls) if (l.joy.length > i && joy.length < 100) joy += l.joy[i];
    return { age: null, avg: null, joy };
  }
  // 人の技（humanMoves・fieldMoves）は辞書の表から番号で選ぶ
  const FIELD = { '技術': '雷', '医療': '光', '農業': '森', '海': '水', '芸術': '夢', '事務': '鋼', '教育': '光', '体を使う': '炎', 'その他': '風' };
  const ITEMS = ['ノートPC', '本', 'くわ', '聴診器', 'フライパン', '工具', '筆', 'マイク', 'ボール'];
  // 人間のカードの背景：その人の一生を左（生まれた朝）から右（日が沈む）へたどる風景。
  // 丘の高さ＝その年の幸せの濃さ。旗＝平均寿命、ろうそく＝亡くなった年。AIオンなら学校・子ども・仕事の道具を丘に置く
  function drawLife(c, x, y, w, h, M) {
    const joy = [...M.life.joy].map(Number), age = M.life.age, avg = M.life.avg;
    const n = Math.max(joy.length, age || 0, avg !== null ? avg + 3 : 0) + 2;
    const X = (yr) => x + 14 + (w - 28) * yr / n;
    const base = y + h - 14, amp = h * 0.32;
    const J = (i) => { // 前後の年とならした幸せ（0〜1）
      let s = 0, k = 0;
      for (let d = -2; d <= 2; d++) if (joy[i + d] !== undefined) { s += joy[i + d] * (3 - Math.abs(d)); k += 3 - Math.abs(d); }
      return k ? s / k / 9 : 0;
    };
    const end = joy.length;
    c.save(); roundRect(c, x, y, w, h, 16); c.clip();
    // 空：朝 → 昼 → 夕方（亡くなった年で日が沈む）→ その先は夜
    const sky = c.createLinearGradient(x, 0, x + w, 0), t = (yr) => Math.max(0, Math.min(1, (X(yr) - x) / w));
    sky.addColorStop(0, '#ffe3c2'); sky.addColorStop(t(end * 0.3), '#d4efff'); sky.addColorStop(t(end * 0.75), '#cfe6ff');
    sky.addColorStop(t(end), '#ffc49a'); sky.addColorStop(Math.min(1, t(end) + 0.06), '#b9b1dd'); sky.addColorStop(1, '#a9a3cf');
    c.fillStyle = sky; c.fillRect(x, y, w, h);
    // 夕日（亡くなった年の地平に沈みかけ）と、生まれた朝の日
    const sun = (sx, sy, r, col) => { const g = c.createRadialGradient(sx, sy, 0, sx, sy, r * 3); g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.beginPath(); c.arc(sx, sy, r * 3, 0, 7); c.fill(); c.fillStyle = col; c.beginPath(); c.arc(sx, sy, r, 0, 7); c.fill(); };
    sun(X(0) + 8, base - amp * 1.25, 10, 'rgba(255,214,140,.9)');
    if (age !== null) sun(X(end), base - amp * 0.55, 16, 'rgba(255,140,90,.85)');
    // 幸せの丘（その年の濃さで高さと色が変わる）
    const gy = (i) => base - amp * (0.15 + J(i) * 0.85);
    const hill = c.createLinearGradient(X(0), 0, X(end), 0);
    for (let i = 0; i < end; i++) { const v = J(i); hill.addColorStop((i + 0.5) / Math.max(1, end), `hsl(${30 + v * 105},${22 + v * 58}%,${46 + v * 12}%)`); }
    c.beginPath(); c.moveTo(x, base + 20); c.lineTo(x, gy(0));
    for (let i = 0; i < end; i++) { const mx = (X(i) + X(i + 1)) / 2; c.quadraticCurveTo(X(i), gy(i), mx, (gy(i) + gy(Math.min(end - 1, i + 1))) / 2); }
    c.lineTo(X(end), gy(end - 1)); c.lineTo(X(end), base + 20); c.closePath();
    c.fillStyle = end ? hill : '#9fc98a'; c.globalAlpha = 0.85; c.fill(); c.globalAlpha = 1;
    // 亡くなったあとの道は、平らな薄い地面
    c.fillStyle = 'rgba(120,110,160,.35)'; c.fillRect(X(end), base - amp * 0.15, x + w - X(end), h);
    // 年の目もり（10年ごと）
    c.font = `700 15px ${FF}`; c.textAlign = 'center'; c.fillStyle = 'rgba(40,40,60,.55)';
    for (let yr = 10; yr < end; yr += 10) { c.fillRect(X(yr) - 0.5, base + 2, 1, 5); }
    const on = (yr) => gy(Math.max(0, Math.min(end - 1, yr)));
    // 平均寿命の旗
    if (avg !== null) {
      const fx = X(avg), fy = avg < end ? on(avg) : base - amp * 0.15;
      c.strokeStyle = '#4a4560'; c.lineWidth = 2; c.beginPath(); c.moveTo(fx, fy); c.lineTo(fx, fy - 34); c.stroke();
      c.fillStyle = '#ffffff'; c.beginPath(); c.moveTo(fx, fy - 34); c.lineTo(fx + 18, fy - 28); c.lineTo(fx, fy - 22); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = 'rgba(40,40,60,.6)'; c.fillText(tr('lifeAvg', { n: avg }), fx, fy - 40);
    }
    // 亡くなった年のろうそく
    if (age !== null) {
      const cx = X(end) - 2, cy = on(end - 1);
      c.fillStyle = '#fff6e0'; c.strokeStyle = '#4a4560'; c.lineWidth = 1.5; c.fillRect(cx - 4, cy - 20, 8, 20); c.strokeRect(cx - 4, cy - 20, 8, 20);
      c.fillStyle = '#ff9a3c'; c.beginPath(); c.ellipse(cx, cy - 27, 3.5, 6, 0, 0, 7); c.fill();
      c.fillStyle = 'rgba(40,40,60,.75)'; c.fillText(tr('lifeAge', { n: age }), cx, cy - 38);
    }
    // AIで読んだ人生の出来事（学校・子ども・仕事）。人物の陰に隠れないよう、空に浮かべた吹き出しから、その年の丘へ点線を下ろす
    const ev = M.lifeEv;
    const bubble = (bx, by, r, yr, draw) => {
      const hx = X(yr), hy = on(Math.round(yr));
      c.strokeStyle = 'rgba(74,69,96,.5)'; c.lineWidth = 1.5; c.setLineDash([3, 4]);
      c.beginPath(); c.moveTo(bx, by + r); c.lineTo(hx, hy - 2); c.stroke(); c.setLineDash([]);
      c.fillStyle = '#4a4560'; c.beginPath(); c.arc(hx, hy - 2, 3, 0, 7); c.fill();
      c.fillStyle = 'rgba(255,255,255,.88)'; c.strokeStyle = 'rgba(74,69,96,.6)'; c.lineWidth = 1.5;
      c.beginPath(); c.arc(bx, by, r, 0, 7); c.fill(); c.stroke();
      draw(bx, by);
    };
    if (ev && end) {
      if (ev.edu) bubble(x + w * 0.11, y + h * 0.36, 20, Math.min(12, end - 1), (bx, by) => { // 学校
        c.fillStyle = '#fff'; c.strokeStyle = '#4a4560'; c.lineWidth = 1.5;
        c.fillRect(bx - 10, by - 4, 20, 13); c.strokeRect(bx - 10, by - 4, 20, 13);
        c.fillStyle = '#e8584f'; c.beginPath(); c.moveTo(bx - 13, by - 4); c.lineTo(bx, by - 14); c.lineTo(bx + 13, by - 4); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#6fb6ff'; c.fillRect(bx - 3, by + 2, 6, 7);
      });
      if (ev.kids) bubble(x + w * 0.2, y + h * 0.13, 24, Math.min(30, end - 1), (bx, by) => { // 子ども（4人まで描いて、人数を添える）
        const k = Math.min(4, ev.kids);
        for (let i = 0; i < k; i++) {
          const px = bx + (i - (k - 1) / 2) * 9, py = by + 8;
          c.fillStyle = `hsl(${(i * 67 + 10) % 360},80%,60%)`; c.strokeStyle = '#4a4560'; c.lineWidth = 1.2;
          c.beginPath(); c.arc(px, py - 12, 3.4, 0, 7); c.fill(); c.stroke();
          roundRect(c, px - 3.4, py - 8, 6.8, 10, 3); c.fill(); c.stroke();
        }
        c.fillStyle = 'rgba(40,40,60,.8)'; c.font = `700 11px ${FF}`; c.fillText(tr('lifeKids', { n: ev.kids }), bx, by - 10);
      });
      if (M.g.item && end > 25) bubble(x + w * 0.84, y + h * 0.16, 22, Math.min(45, end - 6), (bx, by) => { // 仕事の道具
        drawItem(c, bx + 2, by - 6, 40, M.g.item, '#4a4560', 1.5, bx, by - 8, 32);
      });
    }
    c.restore();
  }

  function pixelate(c, x, y, w, h, b) {
    x = Math.max(0, Math.floor(x)); y = Math.max(0, Math.floor(y));
    w = Math.min(c.canvas.width - x, Math.ceil(w)); h = Math.min(c.canvas.height - y, Math.ceil(h));
    const img = c.getImageData(x, y, w, h), d = img.data;
    for (let by = 0; by < h; by += b) for (let bx = 0; bx < w; bx += b) {
      const i0 = ((by + Math.min(b >> 1, h - by - 1)) * w + bx + Math.min(b >> 1, w - bx - 1)) * 4;
      for (let yy = by; yy < Math.min(by + b, h); yy++) for (let xx = bx; xx < Math.min(bx + b, w); xx++) {
        const i = (yy * w + xx) * 4; d[i] = d[i0]; d[i + 1] = d[i0 + 1]; d[i + 2] = d[i0 + 2]; d[i + 3] = d[i0 + 3];
      }
    }
    c.putImageData(img, x, y);
  }
  function drawTop(c, x, y, rx, ry, g, acc, dark) {
    c.fillStyle = acc; c.strokeStyle = dark; c.lineWidth = Math.max(2, rx * 0.05);
    const kind = g.top === 'type' ? g.type : g.top;
    const tri = (pts) => { c.beginPath(); pts.forEach(([a, b], i) => i ? c.lineTo(a, b) : c.moveTo(a, b)); c.closePath(); c.fill(); c.stroke(); };
    if (kind === 'ears' || kind === '鋼' || kind === '土') for (const s of [-1, 1]) tri([[x + s * rx * 0.25, y + ry * 0.3], [x + s * rx * 0.6, y - ry * 0.45], [x + s * rx * 0.75, y + ry * 0.35]]);
    else if (kind === 'horns' || kind === '闇') for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * rx * 0.3, y + ry * 0.25); c.quadraticCurveTo(x + s * rx * 0.7, y - ry * 0.1, x + s * rx * 0.55, y - ry * 0.55); c.quadraticCurveTo(x + s * rx * 0.5, y, x + s * rx * 0.15, y + ry * 0.3); c.fill(); c.stroke(); }
    else if (kind === 'antenna' || kind === '風') for (const s of [-1, 1]) { c.beginPath(); c.moveTo(x + s * rx * 0.2, y + ry * 0.3); c.lineTo(x + s * rx * 0.35, y - ry * 0.4); c.stroke(); c.beginPath(); c.arc(x + s * rx * 0.35, y - ry * 0.45, rx * 0.1, 0, 7); c.fill(); c.stroke(); }
    else if (kind === '炎') { c.fillStyle = '#ff9a3c'; tri([[x - rx * 0.3, y + ry * 0.3], [x - rx * 0.15, y - ry * 0.35], [x, y], [x + rx * 0.1, y - ry * 0.6], [x + rx * 0.2, y - ry * 0.05], [x + rx * 0.35, y - ry * 0.3], [x + rx * 0.35, y + ry * 0.3]]); }
    else if (kind === '森') { c.fillStyle = '#3fbf6a'; c.beginPath(); c.moveTo(x, y + ry * 0.3); c.quadraticCurveTo(x - rx * 0.45, y - ry * 0.3, x + rx * 0.05, y - ry * 0.6); c.quadraticCurveTo(x + rx * 0.4, y - ry * 0.2, x, y + ry * 0.3); c.fill(); c.stroke(); }
    else if (kind === '雷') { c.fillStyle = '#ffd23a'; tri([[x - rx * 0.05, y + ry * 0.3], [x - rx * 0.2, y - ry * 0.15], [x, y - ry * 0.12], [x - rx * 0.08, y - ry * 0.6], [x + rx * 0.2, y - ry * 0.05], [x + rx * 0.02, y - ry * 0.08], [x + rx * 0.12, y + ry * 0.3]]); }
    else if (kind === '水') { c.fillStyle = '#7cc4ff'; c.beginPath(); c.moveTo(x, y - ry * 0.55); c.quadraticCurveTo(x + rx * 0.3, y, x, y + ry * 0.25); c.quadraticCurveTo(x - rx * 0.3, y, x, y - ry * 0.55); c.fill(); c.stroke(); }
    else if (kind === '光') { c.strokeStyle = '#ffcf33'; c.lineWidth = rx * 0.08; c.beginPath(); c.ellipse(x, y - ry * 0.25, rx * 0.45, ry * 0.12, 0, 0, 7); c.stroke(); }
    else if (kind === '夢') { c.fillStyle = '#ffe14d'; c.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? rx * 0.12 : rx * 0.28; c.lineTo(x + Math.cos(a) * r, y - ry * 0.25 + Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke(); }
  }

  function roundRect(c, x, y, w, h, r) { c.beginPath(); c.roundRect(x, y, w, h, r); }
  function wrap(c, text, x, y, maxW, lh, maxLines) {
    let line = '', lines = [];
    // 句読点や閉じかっこは行の頭に置かない（前の行にぶら下げる）
    // 英語は語の切れ目で折り返す（1字ずつ切ると、語の途中で行が変わる）
    const units = D('wrapMode') === 'word' ? text.split(/(?<= )/) : [...text], noStart = D('noLineStart');
    for (const ch of units) {
      if (line && c.measureText(line + ch.trimEnd()).width > maxW && !noStart.includes(ch)) { lines.push(line.trimEnd()); line = ch; } else line += ch;
    }
    if (line) lines.push(line);
    lines = lines.slice(0, maxLines);
    lines.forEach((l, i) => c.fillText(l, x, y + i * lh));
    return lines.length * lh;
  }

  // ---- わずかに化ける（同じ写真なら同じ所が化ける） ----
  // 絵の細い横帯を2〜3本ずらし、赤だけ少し横へずらしてにじませる。小さなかけらも数個
  // strong（バグ個体）のときは、帯を増やして大きくずらし、残像と色の反転も足す
  function glitchArt(c, x, y, w, h, rnd, strong) {
    if (strong) {
      // 残像：絵をうすく横にずらして重ねる（絵の枠の中だけ）
      c.save(); c.beginPath(); c.rect(x, y, w, h); c.clip();
      c.globalAlpha = 0.3; c.drawImage(c.canvas, x, y, w, h, x + (rnd() < 0.5 ? -1 : 1) * (14 + rnd() * 20), y, w, h);
      c.restore();
    }
    const bands = strong ? 7 + Math.floor(rnd() * 4) : 2 + Math.floor(rnd() * 2);
    const shift = strong ? 10 : 4;
    for (let i = 0; i < bands; i++) {
      // 背景の上でずらしても見えないので、モンスターのいる高さ（絵の 25〜80%）に入れる
      const bh = strong ? 3 + Math.floor(rnd() * 15) : 2 + Math.floor(rnd() * 6);
      const by = strong ? y + Math.floor(h * 0.05 + rnd() * (h * 0.9 - bh)) : y + Math.floor(h * 0.25 + rnd() * (h * 0.55 - bh));
      const dx = (rnd() < 0.5 ? -1 : 1) * (strong ? 12 + Math.floor(rnd() * 40) : 6 + Math.floor(rnd() * 12));
      const img = c.getImageData(x, by, w, bh), d = img.data, src = new Uint8ClampedArray(d);
      for (let r = 0; r < bh; r++) for (let px = 0; px < w; px++) {
        const j = (r * w + px) * 4, k = (r * w + Math.min(w - 1, px + shift)) * 4;
        d[j] = src[k]; // 赤だけ横へずらす
      }
      c.putImageData(img, x + dx, by);
    }
    if (strong) {
      // 色の反転：小さな四角を1〜2個
      for (let i = 0, n = 1 + Math.floor(rnd() * 2); i < n; i++) {
        const bw = 40 + Math.floor(rnd() * 90), bh = 10 + Math.floor(rnd() * 30);
        const bx = x + Math.floor(rnd() * (w - bw)), by = y + Math.floor(h * 0.2 + rnd() * (h * 0.6 - bh));
        const img = c.getImageData(bx, by, bw, bh), d = img.data;
        for (let j = 0; j < d.length; j += 4) { d[j] = 255 - d[j]; d[j + 1] = 255 - d[j + 1]; d[j + 2] = 255 - d[j + 2]; }
        c.putImageData(img, bx, by);
      }
    }
    const bits = strong ? 12 + Math.floor(rnd() * 9) : 3 + Math.floor(rnd() * 4);
    for (let i = 0; i < bits; i++) {
      const px = x + Math.floor(rnd() * w), py = y + Math.floor(rnd() * h);
      const p = c.getImageData(Math.min(x + w - 1, px + 30), py, 1, 1).data;
      c.fillStyle = `rgb(${p[0]} ${p[1]} ${p[2]})`;
      c.fillRect(px, py, 4 + Math.floor(rnd() * 10), 2 + Math.floor(rnd() * 3));
    }
  }
  // 説明の1〜2文字を、文字化けでよく見る字に入れ替える（最初の3文字と句読点は残す）
  const MOJIBAKE = D('mojibake');
  // n を渡すとその数だけ、from から後ろを化けさせる（バグ個体の名前・技・説明に使う）
  function garble(text, rnd, n, from) {
    const chars = [...text];
    if (n === undefined) { n = 1 + Math.floor(rnd() * 2); from = 3; if (chars.length <= 6) return text; }
    for (let i = 0; i < n && chars.length > from; i++) {
      const at = from + Math.floor(rnd() * (chars.length - from));
      if (!D('keepChars').includes(chars[at])) chars[at] = MOJIBAKE[Math.floor(rnd() * MOJIBAKE.length)];
    }
    return chars.join('');
  }

  // ---- カードの珍しさ ----
  // 指紋の3つ目を1000で割った余りで決める。0 ならゴールド（1000枚に1枚）、1・2 ならシルバー（500枚に1枚）。
  // バグ個体は指紋の1つ目で別に決めるので、重なることもある（バグったゴールド＝1万6千枚に1枚）
  const RARITY = {
    gold:   { mult: 1.3,  fuse: 0.25, label: 'GOLD',   msg: 'goldMsg' },
    silver: { mult: 1.15, fuse: 0.10, label: 'SILVER', msg: 'silverMsg' },
    normal: { mult: 1,    fuse: 0 }
  };
  function rarityOf(fp) {
    const r = fp[2] % 1000;
    return r === 0 ? 'gold' : r <= 2 ? 'silver' : 'normal';
  }
  const isBugPrint = fp => (fp[0] >>> 4) % 16 === 0;

  // ---- 合体の法則（2〜3枚） ----
  // 画面の「合体の法則」に載せるのは、そろい・相性・打ち消し・にじ・レア度。隠しの2つ（完全バグ・はじまりの夜）は載せない
  // 相性の名前は辞書の pairNames（同じ順）
  const PAIRS = [['炎', '風'], ['水', '森'], ['雷', '水'], ['土', '森'], ['光', '闇'], ['夢', '光'], ['鋼', '雷'], ['闇', '夢'], ['土', '炎'], ['風', '水']];
  const CLASH = [['炎', '水'], ['炎', '森'], ['雷', '土']];
  const isPair = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);
  function fusionRules(parts) {
    const types = parts.map(p => p.type), rules = [];
    const count = {}; types.forEach(t => { count[t] = (count[t] || 0) + 1; });
    const maxSame = Math.max(...Object.values(count));
    // 法則は [見出し（文の仕様）, 倍率, 種類]。判定は種類で行う（見出しは言語で変わるため）
    if (maxSame === 3) rules.push([{ k: 'ruleSame3' }, 0.5, 'same']); else if (maxSame === 2) rules.push([{ k: 'ruleSame2' }, 0.2, 'same']);
    for (let i = 0; i < types.length; i++) for (let j = i + 1; j < types.length; j++) {
      PAIRS.forEach(([x, y], pi) => { if (isPair(types[i], types[j], x, y)) rules.push([{ k: 'rulePair', v: { name: { d: 'pairNames', p: [pi] } } }, 0.3, 'pair']); });
      for (const [x, y] of CLASH) if (isPair(types[i], types[j], x, y)) rules.push([{ k: 'ruleClash', v: { a: { ty: x }, b: { ty: y } } }, -0.15, 'clash']);
    }
    if (types.length === 3 && maxSame === 1) rules.push([{ k: 'ruleRainbow' }, 0.1, 'rainbow']);
    if (types.length === 3 && ['光', '闇', '夢'].every(t => types.includes(t))) rules.push([{ k: 'ruleNight' }, 0.8, 'night']);
    for (const r of ['gold', 'silver']) {
      const n = parts.filter(p => p.rarity === r).length;
      if (n) rules.push([{ k: 'ruleRare', v: { label: RARITY[r].label, n } }, RARITY[r].fuse * n, 'rare']);
    }
    const bugs = parts.filter(p => p.bug).length;
    if (bugs) rules.push([{ k: 'ruleBug', v: { n: bugs } }, 0.08 * bugs, 'bug']);
    return rules;
  }
  const pct = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%';
  const powerOf = stats => Object.values(stats).reduce((a, b) => a + b, 0);
  const printOf = fp => fp.map(v => v.toString(16).padStart(8, '0')).join('');

  // ---- 保存（この PC・スマホの中だけ。IndexedDB） ----
  // cards：カードの中身と小さな絵。couples：夫婦と子ども。meta：端末の秘密の番号・発行番号・写真ごとの発行回数。
  // IndexedDB が使えない画面（プライベートブラウズなど）では、その画面を閉じるまでだけ覚える
  const DB = (() => {
    let dbp = null, memOnly = false;
    const mem = { cards: new Map(), couples: new Map(), meta: new Map() };
    function open() {
      if (!dbp) dbp = new Promise((ok, ng) => {
        try {
          const rq = indexedDB.open('dropper-monster', 1);
          rq.onupgradeneeded = () => {
            const d = rq.result;
            d.createObjectStore('cards', { keyPath: 'id' });
            d.createObjectStore('couples', { keyPath: 'id' });
            d.createObjectStore('meta');
          };
          rq.onsuccess = () => ok(rq.result);
          rq.onerror = () => ng(rq.error);
        } catch (e) { ng(e); }
      }).catch(e => { memOnly = true; return null; });
      return dbp;
    }
    async function run(store, mode, fn) {
      const d = await open();
      if (!d) return null;
      return new Promise((ok, ng) => {
        const t = d.transaction(store, mode), rq = fn(t.objectStore(store));
        t.oncomplete = () => ok(rq ? rq.result : null);
        t.onerror = () => ng(t.error);
      });
    }
    const keyOf = (store, v, k) => k !== undefined ? k : v.id;
    return {
      get memOnly() { return memOnly; },
      async get(store, key) { const r = await run(store, 'readonly', s => s.get(key)); return memOnly ? mem[store].get(key) : r; },
      async getAll(store) { const r = await run(store, 'readonly', s => s.getAll()); return memOnly ? [...mem[store].values()] : r || []; },
      async put(store, v, key) { if ((await open()) === null) { mem[store].set(keyOf(store, v, key), v); return; } await run(store, 'readwrite', s => key !== undefined ? s.put(v, key) : s.put(v)); },
      async clear(store) { if ((await open()) === null) { mem[store].clear(); return; } await run(store, 'readwrite', s => s.clear()); },
    };
  })();
  // 端末だけの秘密の番号。最初に1回だけ作って保存する。同じ写真でも、ほかの人と同じ子にならないために混ぜる
  async function deviceSecret() {
    let s = await DB.get('meta', 'secret');
    if (!s) {
      const a = new Uint32Array(4); crypto.getRandomValues(a);
      s = [...a].map(v => v.toString(16).padStart(8, '0')).join('');
      await DB.put('meta', s, 'secret');
    }
    return s;
  }
  async function nextSerial() { const n = ((await DB.get('meta', 'serial')) || 0) + 1; await DB.put('meta', n, 'serial'); return n; }
  const enc = s => new TextEncoder().encode(s);

  // ---- 唯一の1枚：発行のたびに、写真のデータの違う部分を読む ----
  // どこから読み始めて何バイトおきに読むかを、端末の秘密の番号・写真・その写真の何回目の発行かで決める。
  // 読んだ断片に、その鍵そのものも足して指紋を取る（断片がたまたま同じでも、鍵が違えば別の子になる）
  function issueSample(bytes, photoPrint, n, secret) {
    const key = fingerprint(enc(`issue:${secret}:${photoPrint}:${n}`));
    const r = sfc32(key[0], key[1], key[2], key[3]);
    const stride = 2 + Math.floor(r() * 30);
    const start = Math.floor(r() * Math.max(1, Math.min(bytes.length - 1, 4096)));
    const len = Math.max(0, Math.ceil((bytes.length - start) / stride));
    const out = new Uint8Array(len + 16);
    for (let i = 0; i < len; i++) out[i] = bytes[start + i * stride];
    key.forEach((v, i) => { out[len + i * 4] = v >>> 24; out[len + i * 4 + 1] = v >>> 16; out[len + i * 4 + 2] = v >>> 8; out[len + i * 4 + 3] = v; });
    return { sample: out, start, stride };
  }
  // 背景に薄く並べる、読んだ断片の値（16進数）。飛び飛びに拾った数十バイトだけなので、元のファイルには戻せない
  const HEX_LEN = 64;
  // 子ども・合体は、親の断片を1バイトずつ交互に編む（どちらかが古いカードで断片を持たなければ、持っているほうだけ）
  function mixHex(list) {
    const hs = list.filter(Boolean);
    if (!hs.length) return '';
    let out = '';
    for (let i = 0; out.length < HEX_LEN * 2 && i < HEX_LEN; i++) for (const h of hs) if (h.length > i * 2) out += h.substr(i * 2, 2);
    return out.slice(0, HEX_LEN * 2);
  }
  function drawHex(c, x, y, w, h, M) {
    if (M.life) return drawLife(c, x, y, w, h, M);
    if (M.shard || M.shardText || M.shardWave) return drawShard(c, x, y, w, h, M);
    if (!M.hex) return;
    const bytes = M.hex.toUpperCase().match(/../g);
    c.save(); roundRect(c, x, y, w, h, 16); c.clip();
    c.font = '600 15px ui-monospace, Menlo, Consolas, monospace'; c.textBaseline = 'top';
    c.fillStyle = css(shade(M.g.second, -0.45)); c.globalAlpha = 0.16;
    const cw = c.measureText('00 ').width, per = Math.max(1, Math.floor((w - 24) / cw));
    let k = 0;
    for (let yy = y + 12; yy < y + h - (M.frag ? 46 : 26); yy += 21) {
      let line = '';
      for (let i = 0; i < per; i++) line += bytes[k++ % bytes.length] + ' ';
      c.fillText(line, x + 12, yy);
    }
    // 左上に、読み始めた場所（何バイト目か）を少し濃く
    if (M.frag) { c.globalAlpha = 0.32; c.fillText('@' + M.frag.start + ' +' + M.frag.stride, x + 12, y + h - 26); }
    c.restore();
  }
  // ---- 背景の欠片：元のデータの一部を、元のデータだと分かる形で持たせる（2026-10-16 本人の指示） ----
  // 写真＝読み取った位置から決めた四角い一部分（96×96）、文章＝読み取った位置からの数十文字、音声＝読み取った位置からの波形。
  // ノイズは軽くかけるだけなので、写真の一部や文章の一部はそのまま分かる（ポリシーの play1 に注意書きあり）
  const SHARD = 96;
  const b64 = u8 => { let t = ''; for (let i = 0; i < u8.length; i += 8192) t += String.fromCharCode(...u8.subarray(i, i + 8192)); return btoa(t); };
  const unb64 = s => Uint8Array.from(atob(s), ch => ch.charCodeAt(0));
  function shardOfImage(img, fp) {
    const w = img.naturalWidth, h = img.naturalHeight, side = Math.max(1, Math.round(Math.min(w, h) * 0.45));
    const sx = (fp[0] >>> 0) % Math.max(1, w - side), sy = (fp[1] >>> 0) % Math.max(1, h - side);
    const cv = document.createElement('canvas'); cv.width = cv.height = SHARD;
    const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, sx, sy, side, side, 0, 0, SHARD, SHARD);
    const d = x.getImageData(0, 0, SHARD, SHARD).data, out = new Uint8Array(SHARD * SHARD * 3);
    for (let i = 0; i < SHARD * SHARD; i++) { out[i * 3] = d[i * 4]; out[i * 3 + 1] = d[i * 4 + 1]; out[i * 3 + 2] = d[i * 4 + 2]; }
    return b64(out);
  }
  // 文章：読み取った位置から、空白をつめて 160 字まで（文字の途中から始まったら、その字は飛ばす）
  function textShard(bytes, start) {
    let st = start; while (st < bytes.length && (bytes[st] & 0xc0) === 0x80) st++;
    const t = new TextDecoder('utf-8').decode(bytes.subarray(st, st + 1200)).replace(/\s+/g, ' ').trim();
    return [...t].slice(0, 160).join('') || undefined;
  }
  // 音声：50ミリ秒ごとの音の大きさを、読み取った位置から 160 個（8秒ぶん）。0〜35 を1字で
  function waveShard(peaks, ratio) {
    if (!peaks || !peaks.length) return undefined;
    const from = Math.min(Math.max(0, peaks.length - 160), Math.floor(ratio * peaks.length));
    const seg = peaks.slice(from, from + 160), mx = Math.max(1e-6, ...seg); // いちばん大きい音を高さいっぱいにそろえる
    return Array.from(seg, v => Math.min(35, Math.round(v / mx * 35)).toString(36)).join('');
  }
  // 子ども・合体：写真の欠片は親の欠片を数行ずつ交互に（合体は縦の帯ごとに）。文章・音声はどちらかの親のもの
  function mixShard(list, byColumn) {
    const ss = list.filter(Boolean).map(unb64).filter(u => u.length === SHARD * SHARD * 3);
    if (!ss.length) return undefined;
    const out = new Uint8Array(SHARD * SHARD * 3);
    for (let y = 0; y < SHARD; y++) for (let x = 0; x < SHARD; x++) {
      const src = ss[(byColumn ? Math.floor(x / (SHARD / ss.length)) : Math.floor(y / 6)) % ss.length], i = (y * SHARD + x) * 3;
      out[i] = src[i]; out[i + 1] = src[i + 1]; out[i + 2] = src[i + 2];
    }
    return b64(out);
  }
  // 欠片を絵の背景いっぱいに敷き、軽いノイズ（ときどき行がずれる・色が少しずれる・走査線）をかける。
  // ノイズの入り方は指紋で決まるので、同じカードはいつも同じ見え方
  function drawShard(c, x, y, w, h, M) {
    const r = sfc32(M.fp[2], M.fp[3], M.fp[0], M.fp[1]);
    c.save(); roundRect(c, x, y, w, h, 16); c.clip();
    if (M.shard) {
      const px = unb64(M.shard);
      if (px.length === SHARD * SHARD * 3) {
        const cv = document.createElement('canvas'); cv.width = cv.height = SHARD;
        const sx = cv.getContext('2d'), im = sx.createImageData(SHARD, SHARD);
        let shift = 0;
        for (let yy = 0; yy < SHARD; yy++) {
          if (r() < 0.05) shift = Math.floor(r() * 13) - 6; else if (r() < 0.3) shift = 0; // ずれた行は数行つづく
          for (let xx = 0; xx < SHARD; xx++) {
            const s = (yy * SHARD + Math.min(SHARD - 1, Math.max(0, xx + shift))) * 3, i = (yy * SHARD + xx) * 4, noise = (r() - 0.5) * 18;
            im.data[i] = px[Math.min(px.length - 3, s + 3)] + noise; // 赤だけ1画素先から取る（色のずれ）
            im.data[i + 1] = px[s + 1] + noise; im.data[i + 2] = px[s + 2] + noise; im.data[i + 3] = 255;
          }
        }
        sx.putImageData(im, 0, 0);
        c.imageSmoothingEnabled = true;
        const side = Math.max(w, h); c.drawImage(cv, x + (w - side) / 2, y + (h - side) / 2, side, side);
      }
    } else if (M.shardText) { // 文章：紙の地に、読み取った文字をそのまま並べる（ところどころ文字化け）
      c.fillStyle = '#f7f3e8'; c.fillRect(x, y, w, h);
      c.font = `500 22px ${FF}`; c.fillStyle = '#3a3a5a'; c.globalAlpha = 0.55; c.textBaseline = 'top';
      const chars = [...M.shardText]; let k = 0;
      for (let yy = y + 14; yy < y + h - 10; yy += 32) {
        let line = '', off = r() < 0.15 ? (r() - 0.5) * 30 : 0;
        while (c.measureText(line).width < w - 30) { const ch = chars[k++ % chars.length]; line += r() < 0.06 ? MOJIBAKE[Math.floor(r() * MOJIBAKE.length)] : ch; }
        c.fillText(line, x + 14 + off, yy);
      }
      c.textBaseline = 'alphabetic';
    } else if (M.shardWave) { // 音声：読み取った位置からの波形
      c.fillStyle = '#eef0f8'; c.fillRect(x, y, w, h);
      const vs = [...M.shardWave].map(ch => parseInt(ch, 36) / 35), bw = w / vs.length, mid = y + h / 2;
      c.fillStyle = css(shade(M.g.main, -0.35)); c.globalAlpha = 0.6;
      vs.forEach((v, i) => { const bh = Math.max(2, v * h * 0.9), dy = r() < 0.05 ? (r() - 0.5) * 20 : 0; c.fillRect(x + i * bw, mid - bh / 2 + dy, Math.max(1, bw - 1), bh); });
      c.globalAlpha = 0.25; c.fillRect(x, mid, w, 1);
    }
    c.globalAlpha = 0.06; c.fillStyle = '#000'; for (let yy = y; yy < y + h; yy += 4) c.fillRect(x, yy, w, 1); // 走査線
    // まん中は少し白くぼかして、キャラが読めるようにする
    const g = c.createRadialGradient(x + w / 2, y + h * 0.5, 20, x + w / 2, y + h * 0.5, w * 0.4);
    g.addColorStop(0, 'rgba(255,255,255,.3)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = 1; c.fillStyle = g; c.fillRect(x, y, w, h);
    if (M.frag) { c.font = '600 15px ui-monospace, Menlo, Consolas, monospace'; c.fillStyle = 'rgba(255,255,255,.85)'; c.fillRect(x + 6, y + h - 32, 120, 24); c.fillStyle = 'rgba(20,20,40,.75)'; c.fillText('@' + M.frag.start + ' +' + M.frag.stride, x + 12, y + h - 14); }
    c.restore();
  }
  const genderOf = fp => ((fp[1] >>> 7) & 1) ? 'f' : 'm';

  // 紋章：指紋の 128 ビットから描く、左右対称の 7×7 の図柄。地の色・図柄の色・マスの並びで数百億通り
  function drawCrest(c, x, y, size, fp) {
    const r = sfc32(fp[3] ^ 0x9e3779b9, fp[0], fp[2] ^ 0x85ebca6b, fp[1]);
    const hue = Math.floor(r() * 360), hue2 = (hue + 120 + Math.floor(r() * 120)) % 360, cs = size / 7;
    c.save();
    c.fillStyle = `hsl(${hue2} 40% 96%)`; roundRect(c, x - 4, y - 4, size + 8, size + 8, 8); c.fill();
    c.strokeStyle = `hsl(${hue} 50% 35%)`; c.lineWidth = 2; c.stroke();
    for (let row = 0; row < 7; row++) for (let col = 0; col < 4; col++) {
      if (r() < 0.5) continue;
      c.fillStyle = r() < 0.75 ? `hsl(${hue} 60% 38%)` : `hsl(${hue2} 70% 50%)`;
      c.fillRect(x + col * cs, y + row * cs, cs + 0.3, cs + 0.3);
      c.fillRect(x + (6 - col) * cs, y + row * cs, cs + 0.3, cs + 0.3);
    }
    c.restore();
  }

  // ---- 結婚と子ども ----
  // 結婚できるか：男性×女性、どちらもまだ結婚していない、親子・兄弟姉妹ではない
  function whyCannotMarry(a, b, couples) {
    if (!a || !b) return tr('marryPick');
    if (a.id === b.id) return tr('marrySame');
    if (a.gender === b.gender) return tr('marryGender');
    if ((a.g.kind === '人間') !== (b.g.kind === '人間')) return tr('marryHuman');
    const married = new Set(couples.flatMap(cp => [cp.male, cp.female]));
    if (married.has(a.id)) return tr('marryAlready', { name: nameOf(a) });
    if (married.has(b.id)) return tr('marryAlready', { name: nameOf(b) });
    const pa = a.parents || [], pb = b.parents || [];
    if (pa.includes(b.id) || pb.includes(a.id)) return tr('marryParent');
    if (pa.some(p => pb.includes(p))) return tr('marrySibling');
    return '';
  }
  const mixColor = (a, b, t) => a.map((v, i) => v * (1 - t) + b[i] * t);
  // 子ども：形・目・模様・頭の飾りは父か母のどちらかから。色は混ぜる。強さは両親の平均にぶれ。まれに突然変異。
  // 鍵は端末の秘密の番号・両親・何人目かで決まるので、兄弟姉妹は毎回違う子になる
  function makeChild(father, mother, idx, secret) {
    const fp = fingerprint(enc(`child:${secret}:${father.id}:${mother.id}:${idx}`));
    const r = sfc32(fp[0], fp[1], fp[2], fp[3]);
    for (let i = 0; i < 12; i++) r();
    const one = (a, b) => (r() < 0.5 ? a : b);
    const F = father.g, Mo = mother.g;
    const g = {};
    for (const k of ['rx', 'ry', 'wob', 'sq', 'pattern', 'spots', 'top', 'eyes', 'eyeSize', 'mouth', 'arms', 'cheeks', 'second', 'third']) g[k] = one(F[k], Mo[k]);
    g.main = mixColor(F.main, Mo.main, 0.3 + r() * 0.4);
    const kp = (fp[0] & 1 ? (F.kind ? F : Mo) : (Mo.kind ? Mo : F)); // 種類はどちらかの親から（乱数は使わない）
    g.kind = kp.kind; g.animal = kp.animal;
    if (g.kind === '人間') { // 人間の見た目も、指紋のビットでどちらかの親から（乱数の並びは変えない）
      g.skin = (fp[1] & 1 ? F : Mo).skin; g.hair = (fp[1] & 2 ? F : Mo).hair; g.hairStyle = (fp[1] & 4 ? F : Mo).hairStyle;
      g.gray = false; g.glasses = !!((fp[1] & 8) && (F.glasses || Mo.glasses)); g.item = null;
      g.mood = ((F.mood === undefined ? 0.5 : F.mood) + (Mo.mood === undefined ? 0.5 : Mo.mood)) / 2;
    }
    let type = one(father.type, mother.type), mutation = '';
    if (r() < 1 / 12) {
      const what = Math.floor(r() * 4);
      if (what === 0) { g.eyes = [1, 2, 3].find(e => e !== F.eyes && e !== Mo.eyes) || 3; mutation = 'mutEyes'; }
      if (what === 1) { g.top = ['ears', 'horns', 'antenna', 'type'].find(t => t !== F.top && t !== Mo.top) || 'horns'; mutation = 'mutTop'; }
      if (what === 2) { g.pattern = ['spots', 'belly', 'stripes', 'none'].find(t => t !== F.pattern && t !== Mo.pattern) || 'stripes'; mutation = 'mutPattern'; }
      if (what === 3) { const ks = Object.keys(TYPES).filter(t => t !== father.type && t !== mother.type); type = ks[Math.floor(r() * ks.length)]; mutation = 'mutType'; }
    }
    g.type = type;
    const base = {};
    for (const k of Object.keys(F.stats)) base[k] = Math.max(8, Math.round((F.stats[k] + Mo.stats[k]) / 2 * (0.9 + r() * 0.3)));
    g.stats = base;
    // 珍しさの受け継ぎ：親にゴールドが1人いれば10倍、シルバーは1人ごとに5倍。バグ個体の親がいれば4分の1でバグる
    const golds = [father, mother].filter(p => p.rarity === 'gold').length, silvers = [father, mother].filter(p => p.rarity === 'silver').length;
    const roll = r();
    const rarity =
      roll < 0.001 * (1 + 9 * golds) ? 'gold' : roll < 0.001 * (1 + 9 * golds) + 0.002 * (1 + 4 * silvers) ? 'silver' : 'normal';
    const bug = r() < (father.bug || mother.bug ? 0.25 : 1 / 16);
    const stats = {};
    for (const [k, v] of Object.entries(base)) stats[k] = Math.round(v * RARITY[rarity].mult);
    let bugStat = null;
    if (bug) { bugStat = Object.keys(stats)[Math.floor(r() * 4)]; stats[bugStat] = 255; }
    // 名前：片方の親の頭（1〜2字）＋ときどき間の字＋もう片方の親のおしり（1〜2字）。
    // つなぎ目で小さい字や「ン」が重なる・頭に来るのは直す（「ハッ」＋「ッチ」が「ハッッチ」になっていた）
    // 組み立て方（文の仕様）で持つので、見るページの言語の親の名前から組み直される
    const [A, B] = r() < 0.5 ? [father.name, mother.name] : [mother.name, father.name];
    const MID = D('mid'), TAIL = D('tail');
    const na = 1 + Math.floor(r() * 2), mid = r() < 0.4 ? { d: 'mid', p: [2 + Math.floor(r() * (MID.length - 2))] } : '', nb = 1 + Math.floor(r() * 2);
    const name = { nm: { cat: [{ sl: A, from: 0, to: na }, mid, { sl: B, from: -nb }] }, tail: 0 };
    const minName = D('minName') || 3;
    if ([...txt(name)].length < minName || [...txt(name.nm).replace(/([ッャュョァィゥェォーン])\1+/g, '$1').replace(/^[ッャュョァィゥェォーン]+/, '')].length < minName) name.tail = Math.floor(r() * TAIL.length);
    return {
      g, fp, type, name, stats, power: powerOf(stats), rarity, bug, bugStat, fusion: 0,
      gender: r() < 0.5 ? 'm' : 'f', gen: Math.max(father.gen || 1, mother.gen || 1) + 1,
      parents: [father.id, mother.id], parentNames: [father.name, mother.name], childNo: idx + 1,
      hex: mixHex([father.hex, mother.hex]), shard: mixShard([father.shard, mother.shard], false), shardText: (fp[2] & 1 ? father : mother).shardText || father.shardText || mother.shardText,
      shardWave: (fp[2] & 1 ? father : mother).shardWave || father.shardWave || mother.shardWave, life: mixLife([father.life, mother.life]),
      no: (fp[3] % 999) + 1, motif: '', mission: '',
      moves: [one(father.moves[0], father.moves[1]), one(mother.moves[0], mother.moves[1])],
      desc: { cat: [{ k: 'childDesc', v: { f: father.name, m: mother.name, n: idx + 1 } }, mutation ? { k: 'childMut', v: { what: { k: mutation } } } : { k: 'childHalf' }] },
      id: printOf(fp), print: printOf(fp).slice(0, 12).toUpperCase()
    };
  }

  // 合体：同じ写真の組なら、落とす順に関係なく同じ子になる（指紋を並べ替えてから混ぜる）
  function fuse(parts) {
    // ★ 先に指紋の順に並べる。落とした順のままだと、強さは同じでも「炎＋風＋水」や法則の並びが変わり、カードが別物になる
    parts = [...parts].sort((a, b) => (printOf(a.fp) < printOf(b.fp) ? -1 : 1));
    const fp = fingerprint(new TextEncoder().encode('fuse:' + parts.map(p => printOf(p.fp)).sort().join('+')));
    const byPower = [...parts].sort((a, b) => b.power - a.power || (printOf(a.fp) < printOf(b.fp) ? -1 : 1));
    const [lead, second, third] = byPower;
    const count = {}; parts.forEach(p => { count[p.type] = (count[p.type] || 0) + 1; });
    const top = Math.max(...Object.values(count));
    const type = count[lead.type] === top ? lead.type : Object.keys(count).find(t => count[t] === top);
    // 見た目：体は一番強い子、頭の飾りと模様は2番目、目は3番目（2体なら2番目）から
    const g = Object.assign({}, lead.g, {
      type, second: second.g.main, third: (third || lead).g.main,
      top: second.g.top, pattern: second.g.pattern, spots: second.g.spots,
      eyes: (third || second).g.eyes, eyeSize: (third || second).g.eyeSize
    });
    const rules = fusionRules(parts);
    const bugs = parts.filter(p => p.bug).length;
    const clashes = rules.filter(r => r[2] === 'clash').length;
    const stats = {};
    let tail;
    if (clashes) {
      // ★ 打ち消しが1組でも入ったら、必ず元のいちばん強い子より弱くする（本人の指示、2026-10-14）。
      //   ほかの法則（相性・そろい・レア度・完全バグの2倍）は効かせず、いちばん強い1体の強さだけを残して、1組ごとに15%削る。
      //   項目ごとに別の子の高い値を拾うと、85%にしても元のどの子より強くなることがあるので、1体の強さをそのまま使う
      const keep = Math.max(0.1, 1 - 0.15 * clashes);
      for (const [k, v] of Object.entries(lead.stats)) stats[k] = Math.round(v * keep);
      if (bugs === 3) rules.push([{ k: 'ruleFullBugClash' }, 0, 'fullbugClash']);
      tail = { k: 'fuseTailClash', v: { pct: Math.round(keep * 100) } };
    } else {
      let mult = Math.max(0.5, 1 + rules.reduce((a, r) => a + r[1], 0));
      if (bugs === 3) { rules.push([{ k: 'ruleFullBug' }, 1, 'fullbug']); mult *= 2; }
      // 強さ：項目ごとに「いちばん高い値＋ほかの値の3割」に、法則の倍率を掛ける
      for (const k of Object.keys(lead.stats)) {
        const vs = parts.map(p => p.stats[k]), mx = Math.max(...vs), sum = vs.reduce((a, b) => a + b, 0);
        stats[k] = Math.round((mx + 0.3 * (sum - mx)) * mult);
      }
      const total = rules.filter(r => r[2] !== 'fullbug').reduce((a, r) => a + r[1], 0);
      tail = { cat: [{ k: 'fuseTail', v: { total: pct(total) } }, bugs === 3 ? { k: 'fuseTailX2' } : ''] };
    }
    const name = bugs === 3 ? { k: 'unknownName' }
      : { cat: [{ sl: lead.name, from: 0, to: 2 }, third ? { sl: third.name, from: 1, to: 2 } : '', { sl: second.name, from: -2 }] };
    return {
      g: Object.assign(g, { stats: lead.g.stats }), fp, type, name, stats, power: powerOf(stats), fusion: parts.length, rarity: 'normal', bug: bugs >= 2,
      gender: genderOf(fp), gen: 1, parents: null, id: printOf(fp), bugStat: bugs >= 2 ? Object.keys(stats).reduce((a, k) => stats[k] > stats[a] ? k : a) : null,
      parts: parts.map(p => p.type), no: (fp[3] % 999) + 1, motif: '', mission: '', hex: mixHex(parts.map(p => p.hex)), shard: mixShard(parts.map(p => p.shard), true), shardText: (parts.find(p => p.shardText) || {}).shardText, shardWave: (parts.find(p => p.shardWave) || {}).shardWave, life: mixLife(parts.map(p => p.life)),
      moves: [lead.moves[0], second.moves[0]],
      // 打ち消しのときは、効かなかった法則まで並べると3行に収まらず結びが切れるので、打ち消しと完全バグだけ書く
      desc: { cat: rules.filter(r => !clashes || r[2] === 'clash' || r[2] === 'fullbugClash')
        .map(r => r[2] === 'fullbug' ? { k: 'ruleFullBugX2' } : r[2] === 'fullbugClash' ? r[0] : { cat: [r[0], ' ' + pct(r[1])] })
        .flatMap((x, i) => i ? [{ k: 'ruleSep' }, x] : [x]).concat([tail]) },
      print: printOf(fp).slice(0, 12).toUpperCase()
    };
  }

  // カードは1枚の canvas に描く（画面と保存で同じものを使う）
  function drawCard(cv, M) {
    // 化けさせるときに画素を読むので、最初から CPU で描く（途中で描き方が切り替わると、同じ写真でも色が1目盛りずれる）
    const c = cv.getContext('2d', { willReadFrequently: true }), W = cv.width, H = cv.height, T = TYPES[M.type];
    c.clearRect(0, 0, W, H);
    // バグ個体は、ふつうの化け方とは別の並びの乱数で狂わせる（描く順が同じなら、同じ写真で同じ狂い方）
    const bugR = M.bug ? sfc32(M.fp[1], M.fp[3], M.fp[0], M.fp[2]) : null;
    const typeKeys = Object.keys(TYPES);
    const METAL = { gold: ['#fff6c2', '#e0a800', '#fff1a1', '#b8860b'], silver: ['#ffffff', '#a9b3c2', '#f4f6fa', '#7d8796'] };
    const metal = METAL[M.rarity];
    const frame = bugR && !metal ? [TYPES[typeKeys[Math.floor(bugR() * 10)]].frame[0], TYPES[typeKeys[Math.floor(bugR() * 10)]].frame[1]] : T.frame;
    const fr = c.createLinearGradient(0, 0, W, H);
    if (metal) metal.forEach((col, i) => fr.addColorStop(i / 3, col)); else { fr.addColorStop(0, frame[0]); fr.addColorStop(1, frame[1]); }
    c.fillStyle = fr; roundRect(c, 0, 0, W, H, 34); c.fill();
    if (metal) { // 光の筋（枠の上だけ。中の白地で隠れる）
      c.save(); c.globalAlpha = 0.45; c.fillStyle = '#fff';
      for (const sx of [-80, 140, 420]) { c.beginPath(); c.moveTo(sx, H); c.lineTo(sx + 60, H); c.lineTo(sx + 360, 0); c.lineTo(sx + 300, 0); c.closePath(); c.fill(); }
      c.restore();
    }
    if (bugR) for (let i = 0; i < 7; i++) { // 枠に走るノイズの線
      c.fillStyle = TYPES[typeKeys[Math.floor(bugR() * 10)]].frame[Math.floor(bugR() * 2)];
      c.fillRect(0, Math.floor(bugR() * H), W, 2 + Math.floor(bugR() * 5));
    }
    if (M.fusion) { // 合体の子は、枠の内側に虹の輪
      const rb = c.createLinearGradient(0, 0, W, 0);
      ['#ff5a5a', '#ffb13b', '#ffe14d', '#46c47a', '#4aa8ff', '#9b6bff'].forEach((col, i) => rb.addColorStop(i / 5, col));
      c.strokeStyle = rb; c.lineWidth = 8; roundRect(c, 14, 14, W - 28, H - 28, 28); c.stroke();
    }
    c.fillStyle = M.rarity === 'gold' ? '#fffbea' : M.rarity === 'silver' ? '#f8fafd' : '#fffdf6';
    roundRect(c, 22, 22, W - 44, H - 44, 22); c.fill();
    // 名前の帯
    let no = String(M.no).padStart(3, '0'), name = nameOf(M), badge = tr('typeBadge', { icon: T.icon, type: txt({ ty: M.type }) });
    if (bugR) {
      const at = Math.floor(bugR() * 3); no = no.slice(0, at) + '?' + no.slice(at + 1);
      name = garble(name, bugR, 1 + Math.floor(bugR() * 2), 1);
      badge = tr('bugBadge');
    }
    c.fillStyle = '#1a1a2e'; c.font = '700 22px Oswald, sans-serif'; c.textBaseline = 'alphabetic';
    c.fillText('No.' + no, 46, 66);
    // 長い名前（人生の記録の名前など）は、タイプの札にかからないように字を小さくする
    let nfs = 40; c.font = `900 ${nfs}px ${FF}`;
    while (nfs > 22 && c.measureText(name).width > W - 46 - 250) { nfs -= 2; c.font = `900 ${nfs}px ${FF}`; }
    c.fillText(name, 46, 112);
    if (M.gender) { // 名前のすぐ右に ♂ ♀ の丸
      const gx = 46 + c.measureText(name).width + 24;
      c.fillStyle = M.gender === 'm' ? '#2f6fe0' : '#e0459b'; c.beginPath(); c.arc(gx, 98, 16, 0, 7); c.fill();
      c.fillStyle = '#fff'; c.font = `900 22px ${FF}`; c.textAlign = 'center';
      c.fillText(M.gender === 'm' ? '♂' : '♀', gx, 106); c.textAlign = 'left';
    }
    c.font = `700 22px ${FF}`;
    const tw = c.measureText(badge).width + 28;
    c.fillStyle = bugR ? '#1a1a2e' : metal ? metal[3] : T.frame[1]; roundRect(c, W - 46 - tw, 44, tw, 40, 20); c.fill();
    c.fillStyle = '#fff'; c.fillText(badge, W - 46 - tw + 14, 72);
    // 絵
    const ax = 46, ay = 132, aw = W - 92, ah = 330;
    const bg = c.createRadialGradient(W / 2, ay + ah * 0.45, 20, W / 2, ay + ah / 2, aw * 0.7);
    bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, css(shade(M.g.second, 0.7)));
    c.fillStyle = bg; roundRect(c, ax, ay, aw, ah, 16); c.fill();
    drawHex(c, ax, ay, aw, ah, M);
    c.fillStyle = 'rgba(0,0,0,.08)'; c.beginPath(); c.ellipse(W / 2, ay + ah - 34, 120, 16, 0, 0, 7); c.fill();
    drawMonster(c, W / 2, ay + ah / 2 + 14, 150, M.g, M.gender);
    // 横ずれの線はバグ個体だけ（2026-10-16 本人の指示。ふつうのカードは人の顔などにかかって気になるため）
    const bug = sfc32(M.fp[3], M.fp[2], M.fp[1], M.fp[0]); // 体の形とは別の並び（説明の文字化けにも使う）
    if (bugR) glitchArt(c, ax, ay, aw, ah, bug, false);
    drawCrest(c, ax + aw - 66, ay + ah - 66, 56, M.fp); // 紋章は化けさせない（その1枚の証なので）
    if (M.longLife) { // 平均寿命より長く生きた人のしるし（絵の左下）
      c.font = `700 18px ${FF}`; const lw = c.measureText(tr('longLife')).width + 24;
      c.fillStyle = 'rgba(255,255,255,.9)'; roundRect(c, ax + 14, ay + ah - 52, lw, 36, 18); c.fill();
      c.strokeStyle = '#e0a800'; c.lineWidth = 2; c.stroke();
      c.fillStyle = '#7a5a00'; c.fillText(tr('longLife'), ax + 26, ay + ah - 28);
    }
    if (bugR) {
      glitchArt(c, ax, ay, aw, ah, bugR, true);
      // 判：絵の右上に、少し傾けて押す
      c.save(); c.translate(ax + aw - 92, ay + 40); c.rotate(-0.2);
      c.fillStyle = 'rgba(255,45,85,.92)'; roundRect(c, -78, -22, 156, 44, 10); c.fill();
      c.strokeStyle = '#fff'; c.lineWidth = 3; roundRect(c, -72, -16, 144, 32, 7); c.stroke();
      c.fillStyle = '#fff'; c.font = `900 22px ${FF}`; c.textAlign = 'center';
      c.fillText(tr('bugStamp'), 0, 8); c.restore(); c.textAlign = 'left';
    }
    if (metal) {
      // きらめき（絵の上に小さな十字の光）と、左上の帯
      const sp = sfc32(M.fp[2], M.fp[0], M.fp[1], M.fp[3]);
      c.save(); c.fillStyle = '#fff'; c.globalAlpha = 0.9;
      for (let i = 0; i < 9; i++) {
        const sx = ax + 20 + sp() * (aw - 40), sy = ay + 20 + sp() * (ah - 40), r = 5 + sp() * 9;
        c.beginPath(); c.moveTo(sx, sy - r); c.lineTo(sx + r * 0.25, sy - r * 0.25); c.lineTo(sx + r, sy); c.lineTo(sx + r * 0.25, sy + r * 0.25);
        c.lineTo(sx, sy + r); c.lineTo(sx - r * 0.25, sy + r * 0.25); c.lineTo(sx - r, sy); c.lineTo(sx - r * 0.25, sy - r * 0.25); c.closePath(); c.fill();
      }
      c.restore();
      c.save(); c.translate(ax + 70, ay + 34); c.rotate(-0.12);
      const rb = c.createLinearGradient(-70, 0, 70, 0); metal.forEach((col, i) => rb.addColorStop(i / 3, col));
      c.fillStyle = rb; roundRect(c, -66, -19, 132, 38, 8); c.fill();
      c.strokeStyle = metal[3]; c.lineWidth = 3; c.stroke();
      c.fillStyle = M.rarity === 'gold' ? '#6b4a00' : '#3d4654'; c.font = '700 24px Oswald, sans-serif'; c.textAlign = 'center';
      c.fillText(RARITY[M.rarity].label, 0, 9); c.restore(); c.textAlign = 'left';
    }
    // 生まれ（合体の子は、混ぜた属性）と、右にパワー
    c.fillStyle = '#4a4a6a'; c.font = `500 18px ${FF}`;
    const origin = M.parents ? tr('originChild', { gen: M.gen, f: txt(M.parentNames[0]), m: txt(M.parentNames[1]) })
      : M.fusion ? tr('originFuse', { n: M.fusion, parts: M.parts.map(p => txt({ ty: p })).join(tr('partsSep')) }) : M.g.kind === '人間' ? (txt(M.motif) || tr(SOURCES.life.origin)) : M.motif ? (charaOf(M.g) ? charaOf(M.g) + tr('charaSep') : '') + tr(M.source === 'audio' ? 'originSound' : 'originPhoto', { motif: txt(M.motif) }) : M.source ? tr(SOURCES[M.source].origin) : tr('originColor');
    if (M.parents) c.font = `700 16px ${FF}`;
    c.fillText(origin, 46, ay + ah + 34);
    c.textAlign = 'right'; c.fillStyle = '#9090b0'; c.font = `700 16px ${FF}`;
    const pw = String(M.power); c.font = '700 28px Oswald, sans-serif'; const pwW = c.measureText(pw).width;
    c.fillStyle = metal ? metal[3] : M.fusion ? '#9b3bd6' : T.frame[1]; c.fillText(pw, W - 46, ay + ah + 37);
    c.fillStyle = '#9090b0'; c.font = `700 15px ${FF}`; c.fillText(tr('power'), W - 52 - pwW, ay + ah + 34);
    c.textAlign = 'left';
    // 強さ（100を超えたら棒はいっぱいで数字に色。バグ個体の 255 は棒がカードの外まで突き抜ける）
    let y = ay + ah + 62;
    for (const [k, v] of Object.entries(M.stats)) {
      c.fillStyle = '#1a1a2e'; c.font = `700 17px ${FF}`; c.fillText(D('stats')[k] || k, 46, y + 14);
      c.fillStyle = '#e8eaf2'; roundRect(c, 160, y, 330, 16, 8); c.fill();
      if (k === M.bugStat) {
        c.fillStyle = '#ff2d55'; c.fillRect(160, y, W - 160, 16);
        c.font = '700 18px Oswald, sans-serif'; c.lineWidth = 4; c.strokeStyle = '#1a1a2e'; c.strokeText(String(v), 502, y + 15);
        c.fillStyle = '#fff'; c.fillText(String(v), 502, y + 15);
      } else {
        c.fillStyle = metal ? metal[1] : T.frame[1]; roundRect(c, 160, y, 330 * Math.min(1, v / 100), 16, 8); c.fill();
        c.fillStyle = v > 99 ? '#d9361b' : '#1a1a2e'; c.font = '700 18px Oswald, sans-serif'; c.fillText(String(v), 502, y + 15);
      }
      y += 28;
    }
    // 技（バグ個体は2つ目の技が半分ほど化ける）
    y += 8; c.font = `700 18px ${FF}`; let x = 46;
    const mv0 = M.moves.map(txt);
    const moves = bugR ? [mv0[0], garble(mv0[1], bugR, Math.ceil([...mv0[1]].length / 2), 0)] : mv0;
    for (const mv of moves) {
      const w = c.measureText(mv).width + 30;
      c.fillStyle = css(shade(TYPES[M.type].frame[0].match(/\w\w/g).map(h => parseInt(h, 16)), 0.75)); roundRect(c, x, y, w, 36, 18); c.fill();
      c.fillStyle = '#1a1a2e'; c.fillText(mv, x + 15, y + 25); x += w + 10;
    }
    // 説明
    y += 64; c.fillStyle = '#4a4a6a'; c.font = `500 18px ${FF}`;
    let desc = garble(txt(M.desc), bug);
    if (bugR) desc = garble(desc, bugR, 5 + Math.floor(bugR() * 4), 0);
    y += wrap(c, desc, 46, y, W - 92, 28, 3);
    if (M.mission) {
      y += 6; c.fillStyle = '#fff3e0'; roundRect(c, 40, y - 4, W - 80, 64, 12); c.fill();
      c.fillStyle = '#d9361b'; c.font = `700 17px ${FF}`;
      c.fillText(tr('mission'), 54, y + 20);
      c.fillStyle = '#1a1a2e'; c.font = `500 16px ${FF}`;
      wrap(c, txt(M.mission), 54, y + 46, W - 108, 22, 1);
    }
    // 下の帯：1行目に、その1枚だけの記録（発行番号と、読み取った部分・両親・合体）
    const birth = M.parents ? tr('birthChild', { f: txt(M.parentNames[0]), m: txt(M.parentNames[1]), n: M.childNo })
      : M.fusion ? tr('birthFuse', { n: M.fusion }) : M.frag ? tr('birthFrag', { n: M.frag.n, start: M.frag.start, stride: M.frag.stride }) : '';
    c.fillStyle = '#9090b0'; c.font = `500 14px ${FF}`; c.textAlign = 'left';
    c.fillText(tr('issued', { serial: String(M.serial || 0).padStart(6, '0'), birth }), 46, H - 66);
    c.fillStyle = '#0057ff'; c.font = `700 17px ${FF}`;
    c.fillText(tr('brand'), 46, H - 40);
    c.fillStyle = '#9090b0'; c.textAlign = 'right'; c.font = '500 15px Oswald, sans-serif';
    c.fillText('ID ' + M.print, W - 46, H - 40); c.textAlign = 'left';
  }

  // ---- 図鑑（この PC・スマホの中だけ。カードの中身ごと保存する。結婚に親の中身が要るため） ----
  function thumbOf() {
    const t = document.createElement('canvas'); t.width = 180; t.height = 276;
    t.getContext('2d').drawImage($('card'), 0, 0, 180, 276);
    return t.toDataURL('image/jpeg', 0.75);
  }
  // アクセス解析のイベント。回数だけを送り、写真・名前・カードの中身は送らない（プライバシーポリシーに書いた約束）
  function track(name) { try { if (typeof gtag === 'function') gtag('event', name); } catch (e) { /* 計測が止められていても遊べる */ } }
  async function saveCard(M, again) {
    if (!again) track(M.parents ? 'monster_child' : M.fusion ? 'monster_fuse' : 'monster_born');
    M.thumb = thumbOf();
    await DB.put('cards', JSON.parse(JSON.stringify(M)));
    await renderDex();
  }
  // 画面に文字を出すときの逃がし（図鑑に入っている名前に、ページへの仕掛けが混ぜられていても文字として出す）
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const safeThumb = s => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '');


  async function renderDex() {
    const cards = (await DB.getAll('cards')).sort((a, b) => b.serial - a.serial), g = $('dex');
    g.innerHTML = '';
    for (const m of cards) {
      const b = document.createElement('button'); b.className = 'cardthumb'; b.type = 'button';
      b.title = `No.${m.no} ${nameOf(m)}`;
      const i = new Image(); i.src = m.thumb; i.alt = tr('dexAlt', { name: nameOf(m), gender: tr(m.gender === 'm' ? 'male' : 'female'), gen: m.gen }); b.appendChild(i);
      const tag = document.createElement('span'); tag.className = 'tag';
      tag.innerHTML = `<span>${m.gender === 'm' ? '♂' : '♀'}</span>` + (Number(m.gen) > 1 ? `<span>${esc(tr('genTag', { gen: Number(m.gen) }))}</span>` : '');
      b.appendChild(tag);
      b.addEventListener('click', () => display(m, tr('fromDex')));
      g.appendChild(b);
    }
    $('dexEmpty').classList.toggle('hidden', cards.length > 0);
    $('clearDex').classList.toggle('hidden', cards.length === 0);
    if (DB.memOnly) $('dexNote').textContent = tr('memOnly');
    await renderCouples();
  }

  // ---- AI（任意） ----
  const AI_MODELS = ['gemini-flash-latest', 'gemini-flash-lite-latest'];
  const AI_KEY_STORE = 'dropper_ai_key';
  const getKey = () => { try { return localStorage.getItem(AI_KEY_STORE) || ''; } catch (e) { return ''; } };
  function showKeyState() { $('keyState').textContent = getKey() ? tr('keyOk') : tr('keyNone'); }
  function jpegOf(img, max = 512) {
    const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas'); c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8).split(',')[1];
  }
  // AI へのお願いは辞書に（答えの言葉もページの言語）。人生の記録では、死因と家庭の暮らしぶりは読ませない
  const PROMPT = D('prompt'), LIFE_PROMPT = D('lifePrompt'), AUDIO_PROMPT = D('audioPrompt');
  // AI が答えた選択肢の言葉 → カードの中の鍵（日本語）。見つからなければ null
  function aiKey(table, v) {
    const s = String(v === undefined || v === null ? '' : v).trim().toLowerCase(), m = D(table) || {};
    for (const k in m) if (k.toLowerCase() === s || String(m[k]).toLowerCase() === s) return k;
    return null;
  }
  // src は写真（Image）か、音声の最初の30秒（{ wav }。16kHz・1チャンネルの WAV を base64 にしたもの）
  async function askAI(src, prompt = PROMPT, size = 512) {
    const key = getKey();
    const media = src.wav ? { mime_type: 'audio/wav', data: src.wav } : { mime_type: 'image/jpeg', data: jpegOf(src, size) };
    // 考える時間（thinking）を切る。flash の新しい版は、切らないと写真1枚に1分近く考え込むことがある
    const mk = think => JSON.stringify({
      contents: [{ parts: [{ text: prompt }, { inline_data: media }] }],
      generationConfig: Object.assign({ temperature: 0.4, responseMimeType: 'application/json' }, think ? {} : { thinkingConfig: { thinkingBudget: 0 } })
    });
    // モデルごとに待つ時間を区切る。1つめが遅ければ、軽いほうへ回す（全体で最大 20＋25 秒）
    const WAIT = [20000, 25000];
    let resp, slow = false;
    for (let i = 0; i < AI_MODELS.length; i++) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${AI_MODELS[i]}:generateContent?key=${encodeURIComponent(key)}`;
      const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), WAIT[i]);
      try {
        resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: mk(false), signal: ctl.signal });
        // 考える時間を切れないモデルなら、切らずに頼み直す
        if (resp.status === 400 && /thinking/i.test(await resp.clone().text()))
          resp = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: mk(true), signal: ctl.signal });
      } catch (e) {
        if (e.name !== 'AbortError') throw aiErr('net');
        slow = true; resp = null; continue; // 遅すぎた → 次のモデルへ
      } finally { clearTimeout(timer); }
      if (![500, 502, 503, 504].includes(resp.status)) break; // 混んでいるときも次のモデルへ
    }
    if (!resp) throw aiErr(slow ? 'slow' : 'net');
    if (resp.status === 429) throw aiErr('quota');
    if ([500, 502, 503, 504].includes(resp.status)) throw aiErr('busy');
    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 400 && /API key not valid|API_KEY_INVALID/i.test(t)) { try { localStorage.removeItem(AI_KEY_STORE); } catch (e) {} showKeyState(); throw aiErr('key'); }
      throw aiErr('bad', resp.status);
    }
    const data = await resp.json();
    const txt = (((data.candidates || [])[0] || {}).content || {}).parts?.map(p => p.text || '').join('').replace(/^```(?:json)?|```$/g, '').trim();
    try { return JSON.parse(txt); } catch (e) { throw aiErr('bad'); }
  }
  // うまくいかなかったわけ。retry＝「もう一度試す」を出すか
  const AI_FAIL = {
    busy: { msg: 'aiBusy', hint: 'aiBusyHint', retry: true },
    quota: { msg: 'aiQuota', hint: 'aiQuotaHint', retry: true },
    slow: { msg: 'aiSlow', hint: 'aiSlowHint', retry: true },
    net: { msg: 'aiNet', hint: 'aiNetHint', retry: true },
    key: { msg: 'aiKey', hint: 'aiKeyHint', retry: true },
    nokey: { msg: 'aiNoKey', hint: 'aiNoKeyHint', retry: true },
    bad: { msg: 'aiBad', hint: 'aiBadHint', retry: true }
  };
  function aiErr(kind, code) { const e = new Error(tr(AI_FAIL[kind].msg) + (code ? tr('aiCode', { code }) : '')); e.kind = kind; return e; }
  const clip = (s, n) => (typeof s === 'string' ? s.trim() : '').slice(0, n);

  // ---- 生まれる ----
  let current = null;
  function setStatus(t) { $('status').textContent = t; }
  // canvas は字体の読み込みを待たない。しかも Google Fonts の日本語は字のまとまりごとに後から届くので、
  // カードに描く字（文字化けの字も）をぜんぶ渡して、届いてから描く。そうしないと最初の1枚だけ別の字体になる
  async function loadFontsFor(M) {
    // カードの枠の言葉は、辞書の今の言語の文言をまとめて渡す（どれが描かれるかを数え上げなくて済む）
    const words = Object.values(window.I18N[LANG] && Object.keys(window.I18N[LANG]).length ? window.I18N[LANG] : window.I18N.ja)
      .map(v => typeof v === 'string' ? v : JSON.stringify(v)).join('');
    const text = 'No.0123456789?' + nameOf(M) + txt(M.desc) + M.moves.map(txt).join('') + txt(M.motif) + txt(M.mission) + MOJIBAKE +
      words + 'GOLDSILVER♂♀ID#' + (M.parentNames || []).map(txt).join('') + (M.shardText || '');
    const fonts = [`900 40px ${FF}`, `900 22px ${FF}`, `700 18px ${FF}`, `700 16px ${FF}`, `500 18px ${FF}`, `500 14px ${FF}`, `700 15px ${FF}`, '700 22px Oswald', '700 28px Oswald', '500 15px Oswald'];
    try { await Promise.all(fonts.map(f => document.fonts.load(f, text))); } catch (e) { /* 読めなければ代わりの字体で描く */ }
  }
  // 1枚の写真から1体を作る（まだ描かない）。発行のたびに写真の違う部分を読むので、同じ写真でも毎回違う子になる。
  // 珍しさの倍率と、バグ個体の 255 はここで強さに入れる
  // data（文章・音声）のときは img の代わりに、中身を数えた値 data.meas を使う
  async function build(bytes, img, photoPrint, data) {
    photoPrint = photoPrint || printOf(fingerprint(bytes));
    const n = ((await DB.get('meta', 'issued:' + photoPrint)) || 0) + 1;
    await DB.put('meta', n, 'issued:' + photoPrint);
    const s = issueSample(bytes, photoPrint, n, await deviceSecret());
    const fp = fingerprint(s.sample);
    const pal = data ? paletteOfData(fingerprint(bytes), data.meas) : paletteOf(img);
    const g = makeGenome(fp, pal, bytes.length, data ? data.meas.bias : null);
    if (data) shapeByData(g, data.meas);
    const life = data && data.life;
    if (life) { // 人間：見た目は人の形、タイプは一生の幸せの平均から、技は人の技
      Object.assign(g, humanLook(fp, life), { kind: '人間' });
      const m = data.meas.mean;
      g.type = m >= 0.7 ? '光' : m >= 0.55 ? '森' : m >= 0.4 ? '風' : '水';
      g.moves = [{ d: 'humanMoves', p: [fp[3] % 8] }, { d: 'humanMoves', p: [(fp[3] % 8 + 1 + (fp[3] >>> 8) % 7) % 8] }];
    }
    let rarity = rarityOf(fp);
    if (life && life.age >= 100 && rarity === 'normal') rarity = 'silver'; // 100歳を超えて生きた人は、必ずシルバー以上
    const bug = isBugPrint(fp), stats = {};
    for (const [k, v] of Object.entries(g.stats)) stats[k] = Math.round(v * RARITY[rarity].mult);
    // バグ個体は1項目だけ 255 になる。どの項目かを bugStat に覚え、その棒だけカードの外まで突き抜けさせる
    // （数字で見分けると、合体で 255 を超えたふつうの強さまで突き抜けてしまう）
    let bugStat = null;
    if (bug) { const r = sfc32(fp[2], fp[0], fp[3], fp[1]); bugStat = Object.keys(stats)[Math.floor(r() * 4)]; stats[bugStat] = 255; }
    return {
      g, fp, rarity, bug, bugStat, stats, power: powerOf(stats), fusion: 0,
      gender: genderOf(fp), gen: 1, parents: null, frag: { n, start: s.start, stride: s.stride },
      shard: !life && img ? shardOfImage(img, fp) : undefined,
      shardText: data && data.kind === 'text' ? textShard(bytes, s.start) : undefined,
      shardWave: data && data.kind === 'audio' ? waveShard(data.meas.peaks, s.start / bytes.length) : undefined,
      no: g.no, name: g.name, type: g.type, moves: g.moves, motif: '', mission: '',
      source: data ? data.kind : undefined,
      life: life ? { age: life.age, avg: life.avg, joy: life.joy } : undefined, longLife: !!(life && life.avg !== null && life.age > life.avg),
      desc: life ? { cat: [{ k: 'descLife', v: { icon: TYPES[g.type].icon, type: { ty: g.type }, age: life.age } }, life.avg !== null && life.age > life.avg ? { k: 'descLongLife' } : ''] }
        : data ? { k: 'descData', v: { icon: TYPES[g.type].icon, type: { ty: g.type }, src: { k: SOURCES[data.kind].desc } } }
        : { k: 'descPhoto', v: { icon: TYPES[g.type].icon, type: { ty: g.type } } },
      id: printOf(fp), print: printOf(fp).slice(0, 12).toUpperCase()
    };
  }
  function statusOf(M) {
    const s = [];
    if (M.parents) s.push(tr('stChild', { f: txt(M.parentNames[0]), m: txt(M.parentNames[1]), n: M.childNo }));
    if (M.fusion) s.push(tr('stFuse', { n: M.fusion, power: M.power }));
    if (M.rarity !== 'normal') s.push(tr(RARITY[M.rarity].msg));
    if (M.bug) s.push(tr(M.fusion ? 'stFuseBug' : 'bugMsg'));
    return s.join(tr('statusSep'));
  }
  // 描くだけ（図鑑から開いたとき）
  async function display(M, note) {
    current = M;
    await loadFontsFor(M);
    if (current !== M) return false;
    drawCard($('card'), M);
    $('stage').classList.remove('hidden');
    $('stage').scrollIntoView({ behavior: 'smooth', block: 'start' });
    if (note !== undefined) setStatus(note);
    aiPaint();
    return true;
  }
  // 新しく生まれた子：発行番号を付けて描き、図鑑に入れる
  // ---- AI のようす：カードの真上の帯に、動いている・終わった・うまくいかなかったを出す ----
  // 帯はカードごとに覚えておき、図鑑から別のカードを開いたら隠す（戻ってきたらまた出す）
  let aiView = null;
  function aiShow(M, cls, msg, hint, retry) {
    aiView = { M, cls, msg, hint, retry };
    if (current === M) aiPaint();
  }
  function aiPaint() {
    const box = $('aiState'), on = aiView && aiView.M === current;
    box.classList.toggle('hidden', !on);
    $('stage').classList.toggle('ai-busy', !!(on && aiView.cls === 'work'));
    if (!on) return;
    box.className = 'ai-state ' + aiView.cls;
    $('aiMsg').innerHTML = esc(aiView.msg) + (aiView.hint ? '<small>' + esc(aiView.hint) + '</small>' : '');
    $('aiRetry').classList.toggle('hidden', !aiView.retry);
  }
  // AI に名前や姿を書いてもらう。うまくいったら true。カードはその前に色だけで生まれているので、失敗してもカードは残る
  async function runAI(M, img, done) {
    const life = M.source === 'life', snd = !!(img && img.wav), t0 = Date.now();
    let heard = '';
    const what = tr(life ? 'aiWhatLife' : snd ? 'aiWhatAudio' : 'aiWhatPhoto');
    if (!getKey()) { const f = AI_FAIL.nokey; aiShow(M, 'ng', tr('aiNgNoKey', { msg: tr(f.msg) }), tr(f.hint), true); aiView.redo = { img, done }; setStatus(done()); return false; }
    const tick = () => {
      const sec = Math.floor((Date.now() - t0) / 1000);
      aiShow(M, 'work', tr('aiWork', { what, sec }), tr(sec >= 12 ? 'aiWorkSlow' : life ? 'aiWorkHintLife' : snd ? 'aiWorkHintAudio' : 'aiWorkHint'));
    };
    tick(); const iv = setInterval(tick, 1000);
    setStatus(tr(life ? 'aiReadingLife' : snd ? 'aiReadingAudio' : 'aiReadingPhoto'));
    try {
      if (life) applyLife(M, await askAI(img, LIFE_PROMPT, 1080));
      else {
        const a = await askAI(img, snd ? AUDIO_PROMPT : PROMPT);
        heard = String(a.heard || '').toLowerCase();
        // 音声で、言葉も音楽も何の音かも分からなかったときは、今までどおり音の値だけの子のまま
        if (snd && String(a.heard || '').toLowerCase() === 'none') {
          clearInterval(iv);
          aiShow(M, 'info', tr('aiAudioNone'), tr('aiAudioNoneHint'));
          setStatus(done());
          return true;
        }
        const ty = aiKey('aiTypes', a.type), kd = aiKey('aiKinds', a.kind), an = aiKey('aiAnimals', a.animal);
        if (ty && TYPES[ty]) M.type = ty;
        if (kd && KINDS[kd] && kd !== '人間') M.g.kind = kd; // 体の形がこの種類に変わる（図鑑にも残る）
        if (kd === '動物' && an && ANIMALS[an]) M.g.animal = an;
        // AI が書いた文は、文そのもの（AI に頼んだときのページの言語のまま）
        M.name = clip(a.name, D('clipName')) || M.name;
        M.motif = clip(a.motif, D('clipMotif'));
        if (Array.isArray(a.moves) && a.moves.length >= 2) M.moves = a.moves.slice(0, 2).map(m => clip(m, D('clipMove')));
        M.desc = clip(a.desc, D('clipDesc')) || M.desc;
        M.mission = a.mission && !snd ? clip(a.mission, D('clipMission')) : '';
      }
      clearInterval(iv);
      const sec = Math.max(1, Math.round((Date.now() - t0) / 1000));
      // 何のファイルと判断して、何をもとに、どんな子として生まれたかを見せる
      const kind = life ? 'Life' : !snd ? 'Photo' : heard === 'music' ? 'Music' : heard === 'sound' ? 'Sound' : 'Speech';
      const type = txt({ ty: M.type }), chara = charaOf(M.g), as = chara ? tr('aiAs', { chara, type }) : tr('aiAsType', { type });
      aiShow(M, 'ok', tr('aiDone' + kind, { sec }), life ? tr('aiDoneLifeHint') : tr(M.motif ? 'aiResult' + kind : 'aiResultPlain', { motif: txt(M.motif), as }));
      if (current === M) { await loadFontsFor(M); drawCard($('card'), M); setStatus(done()); }
      return true;
    } catch (e) {
      clearInterval(iv);
      const f = AI_FAIL[e.kind] || AI_FAIL.bad;
      aiShow(M, 'ng', tr('aiNg', { msg: e.kind ? e.message : tr(f.msg) }), tr(f.hint), f.retry);
      aiView.redo = { img, done };
      setStatus(done());
      return false;
    }
  }
  // snd は音声の最初の30秒（AI がオンのときだけ用意する）。AI に聞かせて、言葉・音楽の雰囲気・何の音かから生まれる
  async function show(M, img, note, snd) {
    M.serial = await nextSerial();
    if (!(await display(M))) return;
    const done = () => (note ? note + tr('statusSep') : '') + statusOf(M);
    if (M.source && M.source !== 'life' && !(M.source === 'audio' && snd) && $('aiOn').checked) { aiShow(M, 'info', tr('aiOffTitle'), tr('aiOffData')); setStatus(done()); return saveCard(M); }
    if (M.fusion && $('aiOn').checked) { aiShow(M, 'info', tr('aiOffTitle'), tr('aiOffFuse')); setStatus(done()); return saveCard(M); }
    if ($('aiOn').checked && snd) await runAI(M, snd, done);
    else if ($('aiOn').checked && img && img.__fromFile) await runAI(M, img, done);
    else setStatus(done());
    // 待っている間に別のカードを開いていたら、この子の絵をいったん描き直してから図鑑に入れる
    if (current !== M) { const back = current; await display(M); await saveCard(M); return display(back); }
    return saveCard(M);
  }
  // AI が読んだ人生の記録をカードに入れる。名前は書かれたとおり。説明は AI に書かせず、読んだ値からここで作る
  function applyLife(M, a) {
    const L = M.life, fk = aiKey('aiFields', a.field) || 'その他';
    M.name = clip(a.name, D('clipLifeName')) || M.name;
    const gd = aiKey('aiGenders', a.gender); if (gd === 'm' || gd === 'f') M.gender = gd;
    const job = clip(a.job, D('clipJob')), country = clip(a.country, D('clipCountry')), edu = clip(a.edu, D('clipEdu')), kids = Math.max(0, Math.min(20, parseInt(a.kids, 10) || 0));
    M.type = FIELD[fk]; M.moves = [{ d: 'fieldMoves', p: [fk, 0] }, { d: 'fieldMoves', p: [fk, 1] }];
    M.g.item = aiKey('aiItems', a.item);
    M.lifeEv = { edu: !!edu && !new RegExp(D('eduNone'), 'i').test(edu), kids }; // 背景の風景に置く出来事
    // 仕事・国・学歴は AI が読んだ文そのもの。つなぎの言葉だけ、描くときのページの言語で
    M.motif = { cat: [job, job && country ? { k: 'motifSep' } : '', country] };
    M.desc = { cat: [{ k: 'ldType', v: { icon: TYPES[M.type].icon, type: { ty: M.type } } },
      { k: 'ldMain', v: { inCountry: country ? { k: 'ldIn', v: { country } } : '', age: L.age, asJob: job ? { k: 'ldJob', v: { job } } : { k: 'ldNoJob' } } },
      edu ? { k: 'ldEdu', v: { edu } } : '', kids ? { k: 'ldKids', v: { n: kids } } : '', M.longLife ? { k: 'descLongLife' } : ''] };
  }
  function loadPhoto(file) {
    return new Promise(async (ok, ng) => {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { img.__fromFile = true; URL.revokeObjectURL(url); ok({ bytes, img }); };
      img.onerror = () => { URL.revokeObjectURL(url); ng(new Error(tr('errPhoto'))); };
      img.src = url;
    });
  }
  // ---- 写真以外のデータ（文章・音声）----
  // 中身はこの端末の中で数えるだけ。カードに入れるのは、数えた値から決めた強さと形だけ
  const SOURCES = {
    text: { label: 'labelText', origin: 'originText', desc: 'srcText', max: 5 * 1024 * 1024 },
    audio: { label: 'labelAudio', origin: 'originAudio', desc: 'srcAudio', max: 30 * 1024 * 1024 },
    life: { label: 'labelLife', origin: 'originLife', desc: 'srcLife', max: 0 }
  };
  function kindOf(f) {
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (f.type.startsWith('image/')) return 'photo';
    if (f.type.startsWith('audio/') || ['mp3', 'm4a', 'wav', 'ogg'].includes(ext)) return 'audio';
    if (f.type === 'text/plain' || f.type === 'text/markdown' || ['txt', 'md'].includes(ext)) return 'text';
    return null;
  }
  const clamp01 = v => Math.max(0, Math.min(1, v));
  // 強さのかたよりは、どれも -10〜+20 のあいだ（写真のときと同じくらいの幅）
  const toBias = v => clamp01(v) * 30 - 10;
  function measureText(bytes) {
    const t = new TextDecoder('utf-8').decode(bytes.subarray(0, 1024 * 1024));
    const chars = [...t.replace(/\s/g, '')].length;
    if (!chars) throw new Error(tr('errNoText'));
    const sentences = Math.max(1, t.split(/[。．.!?！？\n]+/).filter(x => x.trim()).length);
    const marks = (t.match(/[!?！？]/g) || []).length;
    const kanji = (t.match(/\p{Script=Han}/gu) || []).length;
    const lines = Math.max(1, t.split('\n').length);
    return {
      bias: {
        hp: toBias(Math.min(chars, 2000) / 2000),
        atk: toBias(marks / sentences),
        def: toBias(kanji / chars / 0.5),
        spd: toBias((40 - chars / sentences) / 35)
      },
      tall: clamp01((lines / chars) * 15), // 改行が多いほど縦長
      lively: clamp01(marks / sentences)
    };
  }
  async function measureAudio(bytes) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) throw new Error(tr('errNoAudio'));
    const ac = new AC();
    let buf;
    try { buf = await ac.decodeAudioData(bytes.slice().buffer); }
    catch (e) { throw new Error(tr('errAudio')); }
    finally { try { ac.close(); } catch (e) {} }
    const d = buf.getChannelData(0), rate = buf.sampleRate, n = Math.min(d.length, rate * 180);
    // 50ミリ秒ごとに、音の大きさ・低い音の強さ・波の向きの変わる回数を数える
    const win = Math.max(1, Math.floor(rate * 0.05));
    let sum = 0, low = 0, cross = 0, quiet = 0, wins = 0, lp = 0; const peaks = [];
    for (let i = 0; i + win <= n; i += win) {
      let e = 0, el = 0;
      for (let j = i; j < i + win; j++) {
        const v = d[j]; lp += (v - lp) * 0.02; e += v * v; el += lp * lp;
        if (j > i && (v >= 0) !== (d[j - 1] >= 0)) cross++;
      }
      const rms = Math.sqrt(e / win); peaks.push(rms); sum += rms; low += e ? el / e : 0; if (rms < 0.02) quiet++; wins++;
    }
    if (!wins) throw new Error(tr('errShortAudio'));
    const rms = sum / wins, lowR = low / wins, zcr = cross / (wins * win);
    return { buf, meas: {
      bias: { hp: toBias(buf.duration / 180), atk: toBias(rms / 0.2), def: toBias(lowR), spd: toBias(zcr / 0.15) },
      wide: clamp01(lowR), tall: clamp01(zcr / 0.15), lively: clamp01(rms / 0.2), quiet: quiet / wins, peaks
    } };
  }
  // AI に聞かせる音声：最初の sec 秒を 16kHz・1チャンネルに縮めた WAV（base64）。30秒で約1MB
  async function wavClip(buf, sec) {
    const rate = 16000, len = Math.max(1, Math.ceil(Math.min(buf.duration, sec) * rate));
    const OC = window.OfflineAudioContext || window.webkitOfflineAudioContext;
    const oc = new OC(1, len, rate), node = oc.createBufferSource();
    node.buffer = buf; node.connect(oc.destination); node.start(0);
    const d = (await oc.startRendering()).getChannelData(0);
    const out = new DataView(new ArrayBuffer(44 + len * 2)), w = (o, t) => { for (let i = 0; i < t.length; i++) out.setUint8(o + i, t.charCodeAt(i)); };
    w(0, 'RIFF'); out.setUint32(4, 36 + len * 2, true); w(8, 'WAVEfmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, 1, true);
    out.setUint32(24, rate, true); out.setUint32(28, rate * 2, true); out.setUint16(32, 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * 2, true);
    for (let i = 0; i < len; i++) out.setInt16(44 + i * 2, Math.max(-1, Math.min(1, d[i])) * 32767, true);
    const u = new Uint8Array(out.buffer); let bin = '';
    for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
    return btoa(bin);
  }
  // 写真の色の代わり：ファイルそのものの指紋で色合いを決め、にぎやかさで鮮やかさを決める（同じファイルなら同じ色）
  function paletteOfData(filePrint, meas) {
    const r = sfc32(filePrint[0], filePrint[1], filePrint[2], filePrint[3]);
    const hue = Math.floor(r() * 360), sat = 0.35 + meas.lively * 0.5, lum = 0.5;
    const col = (h, l) => hsl2rgb(h % 360, sat, l);
    return { colors: [col(hue, 0.5), col(hue + 40, 0.65), col(hue + 180, 0.4)], sat, lum };
  }
  function hsl2rgb(h, s, l) {
    const k = n => (n + h / 30) % 12, a = s * Math.min(l, 1 - l);
    const f = n => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
    return [f(0) * 255, f(8) * 255, f(4) * 255];
  }
  // 体の形：指紋で決めた形と、数えた値から決めた形を半分ずつ混ぜる（同じ中身でも、発行ごとの差は残す）
  function shapeByData(g, meas) {
    if (meas.tall !== undefined) g.ry = (g.ry + 0.55 + meas.tall * 0.3) / 2;
    if (meas.wide !== undefined) g.rx = (g.rx + 0.62 + meas.wide * 0.3) / 2;
  }
  async function loadData(file, kind) {
    if (file.size > SOURCES[kind].max) throw new Error(tr('errTooBig', { label: tr(SOURCES[kind].label), mb: Math.round(SOURCES[kind].max / 1024 / 1024) }));
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (kind === 'text') return { bytes, data: { kind, meas: measureText(bytes) } };
    const { meas, buf } = await measureAudio(bytes);
    // AI がオンのときだけ、AI に聞かせる最初の30秒を作る（オフのときは作らない・送らない）
    return { bytes, data: { kind, meas }, snd: $('aiOn').checked ? { wav: await wavClip(buf, 30) } : null };
  }

  // 1枚なら1体、2〜3枚なら合体。4枚目からは使わない。同じファイルは1枚に数える（ファイルそのものの指紋で見る）
  // 合体は、いまは同じ種類（写真どうし・文章どうし・音声どうし）だけ
  async function fromFiles(files) {
    const all = [...files].map(f => ({ f, kind: kindOf(f) })).filter(x => x.kind);
    if (!all.length) { setStatus(tr('dropNone')); return; }
    const notes = [], kind = all[0].kind;
    const same = all.filter(x => x.kind === kind);
    if (same.length < all.length) notes.push(tr('noteMixedKinds'));
    if (same.length > 3) notes.push(tr('noteMax3'));
    setStatus(tr(same.length > 1 ? 'fusing' : 'hatching'));
    let loaded;
    try { loaded = await Promise.all(same.slice(0, 3).map(x => kind === 'photo' ? loadPhoto(x.f) : loadData(x.f, kind))); } catch (e) { setStatus(e.message); return; }
    if (kind === 'photo') { // 人生の記録の画像は、人間のカードになる。人間とほかの写真は合体させない
      for (const l of loaded) { const life = readLifeCard(l.img); if (life) l.data = { kind: 'life', meas: lifeMeas(life), life }; }
      const human = !!loaded[0].data, keep = loaded.filter(l => !!l.data === human);
      if (keep.length < loaded.length) notes.push(tr('noteHumanMix'));
      loaded = keep;
    }
    const parts = [], seen = new Set();
    for (const l of loaded) {
      const pp = printOf(fingerprint(l.bytes));
      if (seen.has(pp)) { notes.push(tr('noteSameFile')); continue; }
      seen.add(pp); parts.push({ M: await build(l.bytes, l.img || null, pp, l.data), img: l.img || null, snd: l.snd || null });
    }
    if (parts.length === 1) return show(parts[0].M, parts[0].img, notes.join(tr('noteSep')), parts[0].snd);
    return show(fuse(parts.map(p => p.M)), null, notes.join(tr('noteSep')));
  }
  // ---- 結婚の操作 ----
  const slots = { m: null, f: null };
  function renderSlots() {
    for (const [k, el, label] of [['m', $('slotM'), tr('husband')], ['f', $('slotF'), tr('wife')]]) {
      const c = slots[k];
      el.classList.toggle('on', !!c);
      el.innerHTML = `<span class="sym ${k}">${k === 'm' ? '♂' : '♀'}</span>` + (c ? `<img src="${safeThumb(c.thumb)}" alt=""><span>${esc(tr('slotFilled', { label, name: nameOf(c) }))}</span>` : `<span>${esc(tr('slotEmpty', { label }))}</span>`);
    }
    $('wed').disabled = !(slots.m && slots.f);
  }
  async function renderCouples() {
    const couples = (await DB.getAll('couples')).sort((a, b) => b.at - a.at);
    const cards = new Map((await DB.getAll('cards')).map(c => [c.id, c]));
    const box = $('couples'); box.innerHTML = '';
    for (const cp of couples) {
      const m = cards.get(cp.male), f = cards.get(cp.female);
      if (!m || !f) continue;
      const row = document.createElement('div'); row.className = 'couple';
      const mn = esc(nameOf(m)), fn = esc(nameOf(f));
      row.innerHTML = `<img src="${safeThumb(m.thumb)}" alt="${mn}"><span>${mn} ♂</span><span>💍</span><img src="${safeThumb(f.thumb)}" alt="${fn}"><span>${fn} ♀</span><span class="kids">${esc(tr('kidsCount', { n: Number(cp.children.length) }))}</span>`;
      const b = document.createElement('button'); b.type = 'button';
      b.textContent = tr(cp.children.length >= 3 ? 'kidsMax' : 'haveChild');
      b.disabled = cp.children.length >= 3;
      b.addEventListener('click', () => haveChild(cp.id));
      row.appendChild(b); box.appendChild(row);
    }
  }
  async function wed() {
    const couples = await DB.getAll('couples');
    const why = whyCannotMarry(slots.m, slots.f, couples);
    if (why) { $('wedMsg').textContent = why; return; }
    await DB.put('couples', { id: slots.m.id + '|' + slots.f.id, male: slots.m.id, female: slots.f.id, children: [], at: Date.now() });
    $('wedMsg').textContent = '';
    track('monster_marry');
    setStatus(tr('married', { m: nameOf(slots.m), f: nameOf(slots.f) }));
    slots.m = slots.f = null; renderSlots(); await renderCouples();
  }
  async function haveChild(coupleId) {
    const cp = await DB.get('couples', coupleId);
    if (!cp || cp.children.length >= 3) return;
    const father = await DB.get('cards', cp.male), mother = await DB.get('cards', cp.female);
    const child = makeChild(father, mother, cp.children.length, await deviceSecret());
    cp.children.push(child.id);
    await DB.put('couples', cp);
    await show(child, null);
  }

  // ---- 入力 ----
  const drop = $('drop');
  drop.addEventListener('click', () => $('file').click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  $('file').addEventListener('change', e => { if (e.target.files.length) fromFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files.length) fromFiles(e.dataTransfer.files); });
  window.addEventListener('dragover', e => e.preventDefault());
  window.addEventListener('drop', e => { e.preventDefault(); if (e.target !== drop && e.dataTransfer.files.length) fromFiles(e.dataTransfer.files); });
  $('again').addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); });
  $('save').addEventListener('click', () => {
    $('card').toBlob(b => { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `monster-${current.print}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); }, 'image/png');
  });
  $('cand').addEventListener('click', async () => {
    if (!current) return;
    const saved = await DB.get('cards', current.id); // 図鑑に入った子だけ（中身がそろっている）
    if (!saved) { setStatus(tr('notInDex')); return; }
    slots[saved.gender] = saved; renderSlots();
    $('wedMsg').textContent = whyCannotMarry(slots.m, slots.f, await DB.getAll('couples')) && slots.m && slots.f ? whyCannotMarry(slots.m, slots.f, await DB.getAll('couples')) : '';
    $('marry').scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  $('wed').addEventListener('click', wed);
  $('unslot').addEventListener('click', () => { slots.m = slots.f = null; $('wedMsg').textContent = ''; renderSlots(); });
  $('aiRetry').addEventListener('click', async () => {
    const v = aiView;
    if (!v || !v.redo || v.cls === 'work') return;
    const M = v.M;
    if (await runAI(M, v.redo.img, v.redo.done)) {
      if (current !== M) { const back = current; await display(M); await saveCard(M, true); return display(back); }
      await saveCard(M, true);
    }
  });
  $('aiOn').addEventListener('change', e => { $('aiBox').classList.toggle('hidden', !e.target.checked); showKeyState(); });
  $('saveKey').addEventListener('click', () => {
    const k = $('key').value.trim(); if (!k) return;
    try { localStorage.setItem(AI_KEY_STORE, k); } catch (e) {}
    $('key').value = ''; showKeyState();
  });
  $('clearDex').addEventListener('click', async () => {
    if (!confirm(tr('clearConfirm'))) return;
    await DB.clear('cards'); await DB.clear('couples');
    slots.m = slots.f = null; renderSlots(); await renderDex();
  });
  window.applyI18n();
  renderSlots();
  renderDex();

})();
