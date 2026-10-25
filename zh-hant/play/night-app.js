// night-app.js — 夜の美術館を灯す（night.html）のプログラム。play/ と各言語の play/ でバイト同一に保つ。
// 2026-10-21 に対戦（battle.html）から置きかえた（相手のいない形。重吉さんの判断）。
// 目録（IndexedDB の dropper-monster）は読むだけ。書き換えない（光の扉の鍵の守り神だけは、見えない枠で開いた目録のページが入れる）。夜の記録は localStorage（この端末の中だけ）。
// 結びのことわりは monster-app.js の fusionRules と同じ数字。守り神（人間のカード）は灯さない「立会人」で、強さを持たせない。
// 2026-10-21〜：朝を迎えた回数で朝の場面が5段階に育つ・朝ごとに額縁を1つ・目録の精霊を1体だけ飾る（はめかえ不可）・
// 飾った子は「展示室の主」としてひとこと話す。
// 2026-10-25〜（重吉さんの決め）：通路を進み、中世風の扉の奥の部屋を1つ目から順に4つ灯す → 最後の通路（両側に額縁6つ。もと「わたしの展示室」）→
// 光の扉の手前で「80億分の1」の人生の記録の画像を鍵にして最後の部屋へ（灯さない。夜明け）。立会人へのお礼・光の間はなくした。
// 通路・部屋・朝の場面・額縁は Blender の静止画（play/gallery/、作り方は tools/blender/）。朝の場面の動くもの（光の筋・粒・鳥・花びら）は canvas で重ねる（drawScene）。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tr = (k, v) => window.t(k, v), D = k => window.tdata(k);
  // 文の仕様（monster-app.js の txt と同じ）。目録のカードの名前は「辞書のどの言葉か」で入っているので、見ているページの言語で組み立てる
  function txt(s) {
    if (s === undefined || s === null) return '';
    if (typeof s !== 'object') return String(s);
    if (Array.isArray(s)) return s.map(txt).join('');
    if (s.cat) return s.cat.map(txt).join('');
    if (s.ml) return String(s.ml[window.LANG || 'ja'] ?? s.ml.en ?? s.ml.ja ?? ''); // 美術館の作品から生まれた子（言語ごとの文）
    if (s.k) { const v = {}; for (const key in (s.v || {})) v[key] = txt(s.v[key]); return tr(s.k, v); }
    if (s.d) { let x = D(s.d); for (const i of s.p) x = x === undefined ? undefined : x[i]; return x === undefined ? '' : String(x); }
    if (s.ty) return (D('types') || {})[s.ty] || s.ty;
    if (s.sl !== undefined) {
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
  // 目録の名前に、ページへの仕掛けが混ぜられていても文字として出す
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const safeThumb = s => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '');
  const safeArt = f => (typeof f === 'string' && /^[\w.-]+\.(jpg|jpeg|png|webp)$/i.test(f) ? f : '');
  function track(name) { try { if (typeof gtag === 'function') gtag('event', name); } catch (e) { /* 計測が止められていても遊べる */ } }
  const wait = ms => new Promise(r => setTimeout(r, reduce ? Math.min(ms, 120) : ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- 言葉を画面に入れる（monster-i18n.js の applyI18n は目録のページの題を入れるので使わない） ----
  function applyDom() {
    document.title = tr('nPageTitle');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = tr(k); else el.textContent = tr(k);
    });
    document.documentElement.classList.add('i18n-ready');
  }

  // ---- 属性と結びのことわり（monster-app.js と同じ） ----
  const TY = { '炎': '#d9361b', '水': '#1f5fd6', '森': '#1d8a4c', '雷': '#e09a00', '土': '#7a4f2a', '風': '#22928f', '夢': '#c2479a', '闇': '#3b2f8f', '光': '#f0b429', '鋼': '#5b6778' };
  const TYPES = Object.keys(TY);
  const PAIRS = [['炎', '風'], ['水', '森'], ['雷', '水'], ['土', '森'], ['光', '闇'], ['夢', '光'], ['鋼', '雷'], ['闇', '夢'], ['土', '炎'], ['風', '水']];
  const CLASH = [['炎', '水'], ['炎', '森'], ['雷', '土']];
  const RARE = { gold: ['rareGold', 0.25], silver: ['rareSilver', 0.10] };
  const isPair = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);
  // ことわりは [見出し（文の仕様）, 倍率]。1体だけなら、ことわりなし（輝きそのまま）
  function rules(cs) {
    if (cs.length < 2) return [];
    const ts = cs.map(c => c.t), out = [], cnt = {};
    ts.forEach(t => { cnt[t] = (cnt[t] || 0) + 1; });
    const mx = Math.max(...Object.values(cnt));
    if (mx === 3) out.push([{ k: 'ruleSame3' }, 0.5]); else if (mx === 2) out.push([{ k: 'ruleSame2' }, 0.2]);
    for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
      PAIRS.forEach(([x, y], pi) => { if (isPair(ts[i], ts[j], x, y)) out.push([{ k: 'rulePair', v: { name: { d: 'pairNames', p: [pi] } } }, 0.3]); });
      for (const [x, y] of CLASH) if (isPair(ts[i], ts[j], x, y)) out.push([{ k: 'ruleClash', v: { a: { ty: x }, b: { ty: y } } }, -0.15]);
    }
    if (ts.length === 3 && mx === 1) out.push([{ k: 'ruleRainbow' }, 0.1]);
    if (ts.length === 3 && ['光', '闇', '夢'].every(t => ts.includes(t))) out.push([{ k: 'ruleNight' }, 0.8]);
    for (const r of ['gold', 'silver']) {
      const n = cs.filter(c => c.rarity === r).length;
      if (n) out.push([{ k: 'ruleRare', v: { label: { k: RARE[r][0] }, n } }, RARE[r][1] * n]);
    }
    const bugs = cs.filter(c => c.bug).length;
    if (bugs) out.push([{ k: 'ruleBug', v: { n: bugs } }, 0.08 * bugs]);
    return out;
  }
  // 部屋が好む属性の子が1体でもいれば、さらに ×1.2
  const FAV = 1.2;
  function light(cs, room) {
    const r = rules(cs), sum = cs.reduce((a, c) => a + c.p, 0), m = 1 + r.reduce((a, x) => a + x[1], 0);
    const fav = !!room && cs.some(c => room.fav.includes(c.t));
    return { sum, m, fav, v: Math.round(sum * m * (fav ? FAV : 1)), r };
  }
  const pct = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%';
  const chips = (P, room) => P.r.map(x => `<span class="chip${x[1] < 0 ? ' neg' : ''}">${esc(txt(x[0]))} ${pct(x[1])}</span>`).join('')
    + (P.fav ? `<span class="chip">${esc(tr('nFavBonus', { room: roomName(room), t: room.fav.filter(t => P.cs.some(c => c.t === t)).map(t => txt({ ty: t })).join('・') }))} ×${FAV}</span>` : '');

  // ---- 目録を読む（monster-app.js と同じ作り。無ければ同じ形で作る） ----
  function readDex() {
    return new Promise(ok => {
      try {
        const rq = indexedDB.open('dropper-monster', 1);
        rq.onupgradeneeded = () => {
          const d = rq.result;
          d.createObjectStore('cards', { keyPath: 'id' });
          d.createObjectStore('couples', { keyPath: 'id' });
          d.createObjectStore('meta');
        };
        rq.onsuccess = () => {
          try {
            const g = rq.result.transaction('cards', 'readonly').objectStore('cards').getAll();
            g.onsuccess = () => ok(g.result || []);
            g.onerror = () => ok([]);
          } catch (e) { ok([]); }
        };
        rq.onerror = () => ok([]);
      } catch (e) { ok([]); }
    });
  }
  const isHuman = M => !!(M.g && M.g.kind === '人間');
  // 灯す精霊の形：t 属性・n 名前・p 輝き・art 生まれた作品の絵・th 小さな絵
  function spirit(M) {
    const w = Array.isArray(M.works) && M.works[0];
    return {
      id: M.id, t: TY[M.type] ? M.type : '鋼', n: txt(M.name), p: Math.round(Number(M.power) || 0),
      art: w ? safeArt(w.f) : '', th: safeThumb(M.thumb), rarity: M.rarity === 'gold' || M.rarity === 'silver' ? M.rarity : 'normal', bug: !!M.bug, fusion: Number(M.fusion) || 0,
      framed: (frames().find(f => f.id === M.id) || {}).k || null
    };
  }
  // 守り神の色：その人の人生地図の丘の色（monster-app.js の drawLife と同じ式）を5つ拾う。夜明けに、立会人の人生の色の帯として出す（どの人生も同じ大きさ・同じ明るさ）
  function lifeGrad(M) {
    const joy = [...String((M.life || {}).joy || '5')].map(Number).filter(x => !isNaN(x));
    const at = f => { const v = (joy[Math.min(joy.length - 1, Math.floor(f * joy.length))] || 0) / 9; return `hsl(${Math.round(30 + v * 105)},${Math.round(22 + v * 58)}%,${Math.round(46 + v * 12)}%)`; };
    return `linear-gradient(90deg,${[0, .25, .5, .75, .99].map(at).join(',')})`;
  }

  // ---- おためしの精霊（目録が7体に満たないとき） ----
  // 名前は目録のページと同じ音の表から組む。絵は無いので、属性の色で描く
  function randName(t, r) {
    const syl = D('syl')[t] || D('syl')['鋼'], mid = D('mid'), tail = D('tail');
    return txt({ cat: [{ d: 'syl', p: [t, Math.floor(r() * syl.length)] }, { d: 'mid', p: [Math.floor(r() * mid.length)] }, { d: 'tail', p: [Math.floor(r() * tail.length)] }] });
  }
  function trialSet() {
    const r = Math.random, out = [];
    for (let i = 0; i < 12; i++) { const t = TYPES[Math.floor(r() * TYPES.length)]; out.push({ id: 'trial' + i, t, n: randName(t, r), p: 170 + Math.floor(r() * 110), art: '', th: '', rarity: 'normal', bug: false }); }
    out[0].p = 400; return out.sort((a, b) => b.p - a.p);
  }

  // ---- 夜の記録（この端末の中だけ） ----
  // { n: 遊んだ夜, dawn: 夜明けを迎えた回数, quiet: 静かな朝を迎えた回数,
  //   frames: 手に入れた額縁 [{ k: 'dawn'|'quiet', n: 何回目の朝, id: 飾った目録のカード（空なら null）, name, rar, th, desc, w: 飾ったときの名前・珍しさ・小さな絵・説明・生まれた作品（worksOf）の写し }] }
  // 飾った子の写しを持つのは、目録を空にしても最後の通路に残すため。目録のページ（monster-app.js の framesById）も、この frames を読むだけ
  // 読めない画面でも遊べる
  const STORE = 'dropper-spirit-night';
  function loadRec() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveRec(x) { try { localStorage.setItem(STORE, JSON.stringify(x)); return true; } catch (e) { return false; /* 残せなくても遊べる */ } }
  function frames() { const R = loadRec(); return Array.isArray(R.frames) ? R.frames.filter(f => f && (f.k === 'dawn' || f.k === 'quiet')) : []; }
  // 朝の場面の段階：1・3・6・10・15回目で1つずつ上がる（1〜5）
  const LV = [1, 3, 6, 10, 15];
  const levelOf = n => Math.max(1, LV.filter(x => n >= x).length);

  // ---- 今夜の美術館：日付で決まる（だれが遊んでも同じ夜） ----
  // 部屋は12。名前の順は辞書の nRoomNames と同じ。好む属性は部屋ごとに決まっている
  const ROOMS = [['炎', '光'], ['闇', '風'], ['水', '夢'], ['森', '土'], ['雷', '鋼'], ['光', '夢'], ['水', '闇'], ['風', '雷'], ['鋼', '炎'], ['森', '水'], ['土', '闇'], ['夢', '風']];
  // 灯す部屋は4つ。通路を1つ目から順に進む（2026-10-25〜、重吉さんの決め）。5つ目は最後の部屋で、灯さない（人生の記録の鍵で入る）。
  // 要る明るさのもと。日ごとに ±10% ゆらす。2026-10-21 に「ふつう」[280,350,450,560,650] の6割へ下げた
  // （静かな朝ばかりになったため。試しは共有フォルダ sacred/night.py）。2026-10-25 に5つ目の 390 を外した
  const LEVELS = [170, 210, 270, 340];
  const roomName = R => (D('nRoomNames') || [])[R.k] || '';
  const isRare = c => c.rarity === 'gold' || c.rarity === 'silver';
  function sfc32(a, b, c, d) {
    return () => { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0; return (t >>> 0) / 4294967296; };
  }
  function tonight(now) {
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let h = 2166136261; for (const ch of 'night:' + key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const r = sfc32(h, h ^ 0x9e3779b9, h ^ 0x85ebca6b, h ^ 0xc2b2ae35); for (let i = 0; i < 12; i++) r();
    const ks = [...ROOMS.keys()].map(k => [k, r()]).sort((a, b) => a[1] - b[1]).slice(0, LEVELS.length).map(x => x[0]);
    return LEVELS.map((lv, i) => ({ k: ks[i], fav: ROOMS[ks[i]], need: Math.round(lv * (0.9 + r() * 0.2) / 10) * 10, lit: false })).sort((a, b) => a.need - b.need);
  }

  // ---- 状態 ----
  // ★主以外の6体の輝きの合計の上限。対戦のときと同じ 1500
  const CAP = 1500, SIZE = 7;
  let ZK = [], trial = false;
  let dpick = [], aceI = -1;
  // at：'door'＝cur 番目の扉の前・'room'＝部屋の中・'lit'＝灯った部屋・'last'＝最後の通路（pos 0 入口／1 奥の2枚の前／2 光の扉の手前）
  let HAND = [], ROOM = [], sel = [], cur = 0, at = 'door', pos = 0, page = 0, aceBack = false, busy = false, ended = false, endArm = false;
  let keyed = false, witness = null, witnessMap = '', hikariLit = null;

  function cardEl(c, opts = {}) {
    const b = document.createElement(opts.button === false ? 'div' : 'button');
    if (b.tagName === 'BUTTON') b.type = 'button';
    b.className = 'sp' + (opts.sel ? ' sel' : '') + (opts.rest ? ' rest' : '') + (opts.on ? ' on' : '');
    if (opts.rest) b.dataset.rest = tr('nRest');
    if (opts.n) b.dataset.n = opts.n;
    const bg = c.art ? `background-image:url('/play/museum/${c.art}')` : c.th ? `background-image:url('${c.th}')` : `background:linear-gradient(${TY[c.t]},#0b0d16)`;
    b.innerHTML = (opts.ace ? `<span class="star">${esc(tr('nAceOn'))}</span>` : '')
      + (c.framed && opts.keeper !== false ? `<span class="keeper ${c.framed}">${esc(tr('nKeeper'))}</span>` : '')
      + (c.rarity !== 'normal' ? `<span class="rar ${c.rarity}">${esc(tr(RARE[c.rarity][0]))}</span>` : '')
      + `<div class="fr" style="${bg}">${c.art || c.th ? '' : `<span class="ty">${esc(txt({ ty: c.t }))}</span>`}</div>`
      + `<div class="nm">${esc(c.n)}</div><div class="meta"><span>${esc(txt({ ty: c.t }))}</span><b>✦${c.p}</b></div>`;
    b.setAttribute('aria-label', `${c.n} ${txt({ ty: c.t })} ${tr('nPower')} ${c.p}${opts.ace ? ' ' + tr('nAceOn') : ''}${opts.rest ? ' ' + tr('nRest') : ''}`);
    return b;
  }

  // ---- 通路と部屋（Blender の静止画 play/gallery/。作り方は tools/blender/ の hall.py door・room.py・hall.py empty） ----
  const GAL = '/play/gallery/';
  const PIC = { door: 'door.jpg', room: 'room-dark.jpg', lit: 'room-lit.jpg' };
  const picOf = () => GAL + (at === 'last' ? `last-${pos + 1}.jpg` : PIC[at]);
  function preload() { [...Object.values(PIC), 'last-1.jpg', 'last-2.jpg', 'last-3.jpg'].forEach(f => { const im = new Image(); im.src = GAL + f; }); }
  function button(id, label, fn, dis) { const b = $(id); b.hidden = false; b.textContent = label; b.onclick = fn; b.disabled = !!dis || busy || ended; }
  function draw() {
    const R = ROOM[cur], last = at === 'last';
    $('path').innerHTML = ROOM.map((x, i) => `<i class="${x.lit ? 'on' : !last && i === cur ? 'now' : ''}"></i>`).join('') + `<i class="key${keyed ? ' on' : last ? ' now' : ''}"></i>`;
    const src = picOf();
    if ($('vimg').getAttribute('src') !== src) { $('vimg').src = src; $('vimg').classList.toggle('lit', at === 'lit' && !reduce); }
    $('plaque').textContent = at === 'door' ? tr('nRoomNo', { n: cur + 1 }) : '';
    $('vlit').classList.toggle('on', at === 'lit');
    $('fwd').hidden = !last || pos >= 2 || busy || ended || keyed;
    drawHall();
    $('roomBox').hidden = at !== 'room'; $('keyBox').hidden = !(last && pos === 2) || keyed;
    ['act', 'act2', 'act3'].forEach(id => { $(id).hidden = true; });
    $('say').textContent = '';
    if (!busy && !ended) $('msg').textContent = '';
    if (last) {
      $('rn').innerHTML = `<small>${esc(tr('nLastNo'))}</small>${esc(tr('nLastName'))}`;
      const n = frames().length, pages = Math.max(1, Math.ceil(n / PER));
      $('info').textContent = pos === 2 ? '' : n ? tr('nLastInfo') : tr('nLastEmpty');
      if (pos === 2) $('keyLead').innerHTML = tr('nKeyLead');
      if (pos > 0) button('act2', tr('nGoBack'), () => walk(-1, () => { pos--; }));
      if (n > PER) button('act3', tr('nMoreFrames', { a: page + 1, b: pages }), () => walk(0, () => { page = (page + 1) % pages; }));
    } else {
      $('rn').innerHTML = `<small>${esc(tr('nRoomNo', { n: cur + 1 }))}</small>${esc(roomName(R))}`;
      const fav = tr('nFav', { a: txt({ ty: R.fav[0] }), b: txt({ ty: R.fav[1] }) });
      if (at === 'door') {
        $('info').innerHTML = esc(fav) + '　' + esc(tr('nNeed', { n: R.need }));
        button('act', tr('nOpenDoor'), openDoor);
      } else if (at === 'room') {
        $('info').innerHTML = esc(tr('nPickSp', { room: roomName(R) })) + '<br>' + esc(fav) + '　' + esc(tr('nNeed', { n: R.need }));
        drawHand();
      } else {
        const next = ROOM[cur + 1];
        $('info').textContent = next ? tr('nLitNext', { room: roomName(R), n: cur + 2 }) : tr('nLitLast', { room: roomName(R) });
        button('act', tr(next ? 'nNextDoor' : 'nToLast'), advance);
      }
    }
    $('endbtn').disabled = busy || ended;
    $('endbtn').hidden = keyed;
    $('endbtn').classList.toggle('warn', endArm);
    $('endbtn').textContent = tr(last ? (endArm ? 'nNoEnterSure' : 'nNoEnter') : endArm ? 'nEndSure' : 'nEndBtn');
  }
  function drawHand() {
    $('hand').replaceChildren(...HAND.map((c, i) => {
      const b = cardEl(c, { ace: c.ace, rest: c.used, sel: sel.includes(i) });
      b.disabled = c.used || busy || ended;
      b.onclick = () => pick(i);
      return b;
    }));
    const R = ROOM[cur], cs = sel.map(i => HAND[i]);
    let ok = false;
    if (cs.length) {
      const P = Object.assign(light(cs, R), { cs });
      $('pv').innerHTML = chips(P, R) + `<span><b>${P.sum}</b>${P.m !== 1 ? ' × ' + P.m.toFixed(2) : ''}${P.fav ? ' × ' + FAV : ''} ＝</span><span class="big">${P.v}</span><span>／ ${R.need}</span>`;
      ok = P.v >= R.need;
      $('okmsg').className = ok ? 'ok' : 'short';
      $('okmsg').textContent = ok ? tr('nCan') : tr('nShort', { n: R.need - P.v });
    } else { $('pv').innerHTML = `<span>${esc(tr('nPvEmpty'))}</span>`; $('okmsg').textContent = ''; }
    $('go').disabled = !ok || busy || ended;
    $('go').textContent = cs.length ? tr('nGoN', { n: cs.length }) : tr('nGo');
  }
  function pick(i) {
    if (busy || ended || HAND[i].used) return;
    const k = sel.indexOf(i);
    if (k >= 0) { sel.splice(k, 1); sfx('un'); } else if (sel.length < 3) { sel.push(i); sfx('pick'); } else { sfx('no'); return; }
    endArm = false; draw();
  }
  // 残っている精霊の1〜3体で、その部屋に届く組があるか
  function canLight(R) {
    const idx = HAND.map((c, i) => i).filter(i => !HAND[i].used);
    const ok = cs => light(cs, R).v >= R.need;
    for (let a = 0; a < idx.length; a++) {
      if (ok([HAND[idx[a]]])) return true;
      for (let b = a + 1; b < idx.length; b++) {
        if (ok([HAND[idx[a]], HAND[idx[b]]])) return true;
        for (let c = b + 1; c < idx.length; c++) if (ok([HAND[idx[a]], HAND[idx[b]], HAND[idx[c]]])) return true;
      }
    }
    return false;
  }
  // 進む・戻る：絵の奥へ寄りながら暗くなり、次の絵が明るくなる（d が 0 なら、その場で掛けかえ）
  function walk(d, then) {
    if (busy) return;
    const A = $('vanim'); busy = true; endArm = false;
    sfx(d < 0 ? 'un' : 'send');
    const swap = () => { then(); busy = false; draw(); A.classList.remove('go', 'back'); A.classList.add('arrive'); setTimeout(() => A.classList.remove('arrive'), 650); };
    if (reduce) return swap();
    A.classList.add(d < 0 ? 'back' : 'go'); setTimeout(swap, 540);
  }
  // 扉を開ける。残りの精霊でこの部屋を灯せる組がなければ、静かな朝へ
  function openDoor() {
    walk(1, () => { at = 'room'; sel = []; });
    setTimeout(async () => {
      if (ended || at !== 'room' || canLight(ROOM[cur])) return;
      ended = true; $('msg').textContent = tr('nNoMore'); draw();
      await wait(2200); morning();
    }, reduce ? 150 : 700);
  }
  function advance() {
    if (cur < ROOM.length - 1) walk(1, () => { cur++; at = 'door'; });
    else walk(1, () => { at = 'last'; pos = 0; page = 0; fixFrames(); });
  }
  $('fwd').onclick = () => { if (pos < 2) walk(1, () => { pos++; }); };
  $('go').onclick = async () => {
    const R = ROOM[cur], cs = sel.map(i => HAND[i]);
    if (busy || at !== 'room' || !cs.length) return;
    const P = Object.assign(light(cs, R), { cs });
    if (P.v < R.need) return;
    busy = true; endArm = false;
    sel.forEach(i => { HAND[i].used = true; });
    // ★主の力：送った夜のあと、1夜に1回だけ戻ってくる
    const ace = cs.find(c => c.ace); let back = false;
    if (ace && !aceBack) { aceBack = true; back = true; }
    sel = []; draw();
    await lightScene(R, cs, P, back);
    R.lit = true; if (back) ace.used = false;
    at = 'lit'; busy = false; draw(); glowUp(); burst(.5, .35, 60);
  };
  $('endbtn').onclick = () => {
    if (busy || ended) return;
    if (!endArm) { endArm = true; sfx('pick'); draw(); return; } // 押しまちがいで夜が終わらないように、2回押してもらう
    ended = true; draw(); morning();
  };

  // ---- 灯す場面：送った精霊・明るさが満ちていく線・「灯がともった」。タップするまで進まない ----
  async function lightScene(R, cs, P, back) {
    $('ltRoom').textContent = roomName(R); $('ltNeed').textContent = tr('nNeed', { n: R.need });
    $('ltCards').replaceChildren(...cs.map(c => cardEl(c, { button: false, ace: c.ace })));
    $('ltChips').innerHTML = ''; $('ltNum').textContent = '0'; $('ltDone').classList.remove('on'); $('ltBack').textContent = ''; $('ltTap').hidden = true;
    // 展示室の主（額縁に飾った子）がいれば、灯す前にひとこと話す。言葉は夜明けの額縁と静かな朝の額縁で違う。輝きは変わらない
    const keeper = cs.find(c => c.framed), lines = keeper ? D(keeper.framed === 'dawn' ? 'nLinesDawn' : 'nLinesQuiet') || [] : [];
    $('ltSay').textContent = keeper && lines.length ? tr('nSays', { name: keeper.n, line: lines[Math.floor(Math.random() * lines.length)] }) : '';
    const top = Math.max(P.v, R.need) * 1.08;
    $('ltMark').style.left = (R.need / top * 100) + '%'; $('ltBar').style.width = '0';
    $('lt').hidden = false; sfx('send');
    await wait(900);
    $('ltChips').innerHTML = chips(P, R);
    const t0 = performance.now(), dur = reduce ? 1 : 1400;
    await new Promise(ok => {
      const step = t => {
        const f = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - f, 3), v = Math.round(P.v * e);
        $('ltNum').textContent = v; $('ltBar').style.width = (v / top * 100) + '%';
        if (f < 1) requestAnimationFrame(step); else ok();
      };
      requestAnimationFrame(step);
    });
    $('ltDone').classList.add('on'); sfx('light'); burst(.5, .45, 50);
    if (back) { await wait(700); $('ltBack').textContent = tr('nAceBack'); sfx('back'); }
    await wait(500); $('ltTap').hidden = false;
    await new Promise(r => {
      const done = e => { if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return; $('lt').removeEventListener('click', done); removeEventListener('keydown', done); r(); };
      setTimeout(() => { $('lt').addEventListener('click', done); addEventListener('keydown', done); }, 300);
    });
    $('lt').hidden = true;
  }

  // ---- 光の扉の鍵：「80億分の1」の人生の記録の画像（2026-10-25〜。それまでは目録のページの最初でドロップしていた） ----
  // 見分けて守り神を目録に入れるのは目録のページ（monster-app.js）の仕事なので、見えない枠で spirit.html を開き、落とされたファイルを渡す（同じサイトの中だけ）。
  // AI には送らない。画像はどこにも残さない（目録に入るのは守り神のカードだけ。同じ人生の記録の守り神がもういれば、新しく作らない）
  let maker = null, makerReady = null;
  function openMaker() {
    if (makerReady) return makerReady;
    maker = document.createElement('iframe'); maker.hidden = true; maker.tabIndex = -1; maker.setAttribute('aria-hidden', 'true');
    makerReady = new Promise(ok => {
      const on = e => { if (e.origin === location.origin && e.source === maker.contentWindow && e.data && e.data.type === 'lifeKeyReady') { removeEventListener('message', on); ok(); } };
      addEventListener('message', on);
    });
    maker.src = 'spirit.html?key=1'; document.body.append(maker);
    return makerReady;
  }
  function askMaker(file) {
    return new Promise(async ok => {
      const on = e => { if (e.origin !== location.origin || !maker || e.source !== maker.contentWindow || !e.data || e.data.type !== 'lifeKeyDone') return; clearTimeout(timer); removeEventListener('message', on); ok(e.data); };
      const timer = setTimeout(() => { removeEventListener('message', on); ok({ ok: false, err: true }); }, 25000);
      addEventListener('message', on);
      await openMaker();
      maker.contentWindow.postMessage({ type: 'lifeKey', file }, location.origin);
    });
  }
  async function useKey(files) {
    if (busy || ended || keyed || at !== 'last' || pos !== 2) return;
    const f = [...files].find(x => x.type.startsWith('image/'));
    if (!f) { $('msg').textContent = tr('nKeyNo'); sfx('no'); return; }
    $('drop').classList.add('busy'); $('msg').textContent = tr('nKeyReading');
    const a = await askMaker(f);
    $('drop').classList.remove('busy');
    if (!a.ok) { $('msg').textContent = tr(a.err ? 'nKeyErr' : 'nKeyNo'); sfx('no'); return; }
    keyed = true; witness = txt(a.name); witnessMap = a.life ? lifeGrad(a) : ''; track('night_key');
    enterLast(a);
  }
  // 光の扉をくぐる。最後の部屋（灯さない。夜明けになる）
  async function enterLast(a) {
    busy = true; draw();
    $('msg').textContent = tr(a.isNew ? 'nKeyNew' : 'nKeyOk', { name: witness });
    sfx('light'); burst(.5, .4, 80);
    $('flash').classList.add('on');
    await wait(2400);
    // 金の光・銀の光の子を連れた夜は、夜明けに金の柱／銀の雨（もとの「光の間」の光）
    hikariLit = HAND.some(c => c.rarity === 'gold') ? 'gold' : HAND.some(c => c.rarity === 'silver') ? 'silver' : null;
    busy = false; morning();
    $('flash').classList.remove('on');
  }
  const drop = $('drop');
  drop.addEventListener('click', () => $('file').click());
  drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); $('file').click(); } });
  $('file').addEventListener('change', e => { if (e.target.files.length) useKey(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('over'); }));
  ['dragleave', 'drop'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.remove('over'); }));
  drop.addEventListener('drop', e => { if (e.dataTransfer.files.length) useKey(e.dataTransfer.files); });
  // 枠の外に落としたときは、ブラウザがファイルを開かないようにするだけ（読まない）
  addEventListener('dragover', e => e.preventDefault());
  addEventListener('drop', e => e.preventDefault());

  // ---- 朝：夜明け（4部屋を灯して、光の扉の鍵で最後の部屋へ入った）か、静かな朝。負けの言葉は使わない ----
  // 朝を迎えると、その朝の回数を数え、額縁を1つ渡す（おためしの精霊の夜と、1部屋も灯らなかった朝は数えない）。
  // 場面の段階は、その朝を迎えた回数で決まる（levelOf）。2026-10-25 に立会人へのお礼（お礼をしないと次の夜は★主を置けない）をなくした
  let sceneOn = null;
  function morning() {
    ended = true; draw();
    const lit = ROOM.filter(R => R.lit).length, dawn = keyed, k = dawn ? 'dawn' : 'quiet';
    const dark = ROOM.filter(R => !R.lit).map(roomName).join(tr('nRoomSep'));
    const counts = !trial && lit > 0;
    let count = 1, gift = null;
    if (counts) {
      const R = loadRec(); R.n = (R.n || 0) + 1; count = R[k] = (R[k] || 0) + 1; delete R.noAce;
      R.frames = frames(); R.frames.push({ k, n: count, id: null }); gift = R.frames.length - 1; saveRec(R);
    }
    const lv = levelOf(count), stages = D(dawn ? 'nStagesDawn' : 'nStagesQuiet') || [];
    sfx(dawn ? 'dawn' : 'quiet'); if (dawn) burst(.5, .3, 120);
    track(dawn ? 'night_dawn' : 'night_quiet');
    $('end').className = 'end ' + k;
    $('end').innerHTML = `<canvas class="scene" id="scene" aria-hidden="true"></canvas><div class="endin">`
      + `<h2>${esc(tr(dawn ? 'nDawnH' : 'nQuietH'))}</h2>`
      + (counts ? `<div class="lv">${esc(tr(dawn ? 'nLevelDawn' : 'nLevelQuiet', { n: count, stage: stages[lv - 1] || '' }))}</div>`
        + `<div class="steps">${stages.map((x, i) => `<span class="${i < lv ? 'on' : ''}">${esc(x)}</span>`).join('')}</div>` : '')
      + `<p>${dawn ? tr('nDawnP') : lit === ROOM.length ? tr('nQuietPKey') : lit ? tr('nQuietP', { n: lit, rooms: esc(dark) }) : tr('nQuietP0')}</p>`
      + (dawn && witness ? `<p class="small">${esc(tr('nWitnessed', { name: witness }))}</p>` + (witnessMap ? `<div class="lifeband" style="background:${witnessMap}"></div>` : '') : '')
      + (dawn && hikariLit ? `<p class="hk">${esc(tr(hikariLit === 'gold' ? 'nHikariGold' : 'nHikariSilver'))}</p>` : '')
      + `<div class="lamps">${ROOM.map(R => `<i class="${R.lit ? 'on' : ''}"></i>`).join('')}<i class="sp${keyed ? ' on' : ''}"></i></div>`
      + (gift !== null ? `<div class="gift" id="gift">${frameBox({ k }, 96)}<p>${tr('nGift', { frame: esc(tr(dawn ? 'frameDawn' : 'frameQuiet')) })}</p>`
        + `<div class="btns"><button class="btn" id="pickNow" type="button">${esc(tr('nPickNow'))}</button><button class="btn ghost" id="later" type="button">${esc(tr('nLater'))}</button></div></div>`
        : `<p class="small">${esc(tr(trial ? 'nGiftTrial' : 'nGiftNone'))}</p>`)
      + `<button class="btn" id="again" type="button">${esc(tr('nAgain'))}</button>`
      + `<a class="btn ghost" href="spirit.html">${esc(tr('nBack'))}</a></div>`;
    $('morning').hidden = false;
    startScene(k, lv, dawn ? hikariLit : null);
    if (gift !== null) {
      $('pickNow').onclick = () => openPicker(gift, () => { $('gift').innerHTML = `<p>${esc(tr('nFramedOk'))}</p>`; });
      $('later').onclick = () => { $('gift').innerHTML = `<p class="small">${esc(tr('nLaterOk'))}</p>`; };
    }
    $('again').onclick = restart;
  }
  function restart() {
    $('morning').hidden = true; sceneOn = null; HAND = []; sel = []; dpick = []; aceI = -1;
    reloadDex().then(() => { $('deck').hidden = false; drawDeck(); });
  }

  // ---- 朝の場面：Blender の静止画（play/gallery/morning-{dawn,quiet}-{1..5}.jpg、作り方は tools/blender/morning.py）の上に、動くものを canvas で重ねる。
  //      夜明け＝光が育つ（細い光→光の筋→金の粒→鳥が飛ぶ→館全体が金色）、静かな朝＝やすらぎが育つ（朝もや→花一輪→花びらが舞う→小鳥が鳴く→庭いっぱいの花）。
  //      光の間を灯した夜明けは、金の柱か銀の雨が加わる。位置は絵の割合（morning.py が書き出す JSON の値）
  const MORN = {
    sun: [[0.1966, 0.5449], [0.1968, 0.4929], [0.197, 0.4409], [0.1972, 0.3801], [0.1975, 0.3018]], // 夜明けの太陽（段階ごと）
    birds: [[0.8819, 0.0845], [0.9167, 0.1131]],  // 静かな朝の枝の小鳥の頭の上
    door: [0.5, 0.5851],                          // 館の扉の上
    fx: 0.42                                      // 狭い画面で左右を切るとき、絵のどこを中心に残すか（太陽と館が両方入るように）
  };
  const mornImg = {};
  function mornPic(k, lv) {
    const key = k + lv;
    if (!mornImg[key]) { const im = new Image(); im.src = `${GAL}morning-${k}-${lv}.jpg`; mornImg[key] = im; }
    return mornImg[key];
  }
  function startScene(k, lv, hk) {
    const c = $('scene'); if (!c) return;
    const run = {};
    sceneOn = run;
    const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
    const img = mornPic(k, lv);
    const t0 = performance.now();
    const step = t => {
      if (sceneOn !== run || $('morning').hidden) return;
      const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const g2 = c.getContext('2d'); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(g2, w, h, k, lv, hk, reduce ? 0 : (t - t0) / 1000, rnd, img);
      if (!reduce) requestAnimationFrame(step);
    };
    // 動きを減らす設定では1枚だけ描く（絵が届いてから）
    if (reduce && !img.complete) img.addEventListener('load', () => requestAnimationFrame(step), { once: true });
    requestAnimationFrame(step);
  }
  function drawScene(g2, w, h, k, lv, hk, s, rnd, img) {
    // 絵を枠いっぱいに（はみ出しは切る）。ix, iy で絵の割合の位置を画面の位置にする
    let sc = 1, ox = 0, oy = 0;
    if (img && img.complete && img.naturalWidth) {
      sc = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * sc, dh = img.naturalHeight * sc;
      ox = Math.min(0, Math.max(w - dw, w / 2 - dw * MORN.fx)); oy = (h - dh) / 2;
      g2.drawImage(img, ox, oy, dw, dh);
    } else {
      const sky = g2.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#1b1e33'); sky.addColorStop(1, k === 'dawn' ? '#b98e5c' : '#3a4650');
      g2.fillStyle = sky; g2.fillRect(0, 0, w, h);
    }
    const dw = img && img.naturalWidth ? img.naturalWidth * sc : w, dh = img && img.naturalHeight ? img.naturalHeight * sc : h;
    const ix = f => ox + f * dw, iy = f => oy + f * dh;
    if (k === 'dawn') {
      const [sx, sy] = MORN.sun[lv - 1], cx = ix(sx), cy = iy(sy);
      // 1 細い光：太陽のまわりのゆらぐ光
      g2.save(); g2.globalCompositeOperation = 'lighter';
      const halo = g2.createRadialGradient(cx, cy, 0, cx, cy, h * (.25 + .06 * lv));
      halo.addColorStop(0, `rgba(255,220,150,${.30 + .05 * Math.sin(s * 1.3)})`); halo.addColorStop(1, 'rgba(255,200,120,0)');
      g2.fillStyle = halo; g2.fillRect(0, 0, w, h);
      // 2 光の筋：太陽から扇のように（段階で本数が増え、ゆっくり回る）
      if (lv >= 2) {
        const n = [0, 6, 9, 12, 16][lv - 1], R = Math.hypot(w, h);
        for (let i = 0; i < n; i++) {
          const an = s * .03 + i / n * Math.PI * 2, wd = .035 + .02 * rnd(i, 12);
          g2.fillStyle = `rgba(255,226,160,${(.05 + .015 * lv) * (.6 + .4 * Math.sin(s * .8 + i * 1.7))})`;
          g2.beginPath(); g2.moveTo(cx, cy); g2.lineTo(cx + Math.cos(an - wd) * R, cy + Math.sin(an - wd) * R); g2.lineTo(cx + Math.cos(an + wd) * R, cy + Math.sin(an + wd) * R); g2.fill();
        }
      }
      // 3 金の粒（5段階目は多く）
      if (lv >= 3) for (let i = 0, n = lv >= 5 ? 90 : 45; i < n; i++) { const x = rnd(i, 1) * w, y = ((rnd(i, 2) * h - s * (8 + rnd(i, 3) * 14)) % h + h) % h; g2.fillStyle = `rgba(246,220,142,${.35 + .4 * Math.sin(s * 2 + i)})`; g2.beginPath(); g2.arc(x, y, 1.1 + rnd(i, 4), 0, 6.28); g2.fill(); }
      g2.restore();
      // 4 鳥が飛ぶ
      if (lv >= 4) { g2.strokeStyle = 'rgba(30,22,26,.8)'; g2.lineWidth = 1.6; for (let i = 0; i < 6; i++) { const x = ((rnd(i, 4) * w + s * (20 + i * 4)) % (w + 40)) - 20, y = h * (.08 + rnd(i, 5) * .22), f = Math.sin(s * 6 + i) * 3; g2.beginPath(); g2.moveTo(x - 7, y - f); g2.quadraticCurveTo(x - 3, y - 4, x, y); g2.quadraticCurveTo(x + 3, y - 4, x + 7, y - f); g2.stroke(); } }
      // 光の間：扉の上から金の柱／空から銀の雨
      if (hk === 'gold') { const px = ix(MORN.door[0]), py = iy(MORN.door[1]), p = g2.createLinearGradient(px - 30, 0, px + 30, 0); p.addColorStop(0, 'rgba(255,220,120,0)'); p.addColorStop(.5, `rgba(255,236,170,${.55 + .15 * Math.sin(s * 2)})`); p.addColorStop(1, 'rgba(255,220,120,0)'); g2.save(); g2.globalCompositeOperation = 'lighter'; g2.fillStyle = p; g2.fillRect(px - 30, 0, 60, py); g2.restore(); }
      if (hk === 'silver') { g2.strokeStyle = 'rgba(238,241,246,.6)'; g2.lineWidth = 1; for (let i = 0; i < 50; i++) { const x = rnd(i, 6) * w, y = ((rnd(i, 7) * h + s * 60) % h); g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x, y + 8); g2.stroke(); } }
    } else {
      // 1 朝もや：ゆっくり流れる薄い帯
      for (let i = 0; i < 3; i++) { const y = h * (.62 + i * .1), a = (.10 - .015 * lv) * (1 + .3 * Math.sin(s * .4 + i)), m = g2.createLinearGradient(0, y - 24, 0, y + 24); m.addColorStop(0, 'rgba(210,220,230,0)'); m.addColorStop(.5, `rgba(210,220,230,${Math.max(0, a)})`); m.addColorStop(1, 'rgba(210,220,230,0)'); g2.fillStyle = m; g2.fillRect(0, y - 24, w, 48); }
      // 3 花びらが舞う（5段階目は多く）
      if (lv >= 3) for (let i = 0, n = lv >= 5 ? 36 : 18; i < n; i++) { const x = ((rnd(i, 8) * w + s * (10 + i % 9)) % (w + 20)) - 10, y = ((rnd(i, 9) * h + s * 14) % h); g2.save(); g2.translate(x, y); g2.rotate(s + i); g2.fillStyle = i % 3 ? 'rgba(240,190,205,.75)' : 'rgba(250,246,240,.75)'; g2.beginPath(); g2.ellipse(0, 0, 3, 1.6, 0, 0, 6.28); g2.fill(); g2.restore(); }
      // 4 小鳥が鳴く：枝の小鳥の頭の上に、音符の代わりの小さな光
      if (lv >= 4) for (let i = 0; i < 2; i++) { const [bx, by] = MORN.birds[i], ph = (s * .7 + i * .5) % 1.6; if (ph > 1) continue; g2.fillStyle = `rgba(246,226,170,${Math.sin(ph * Math.PI)})`; g2.beginPath(); g2.arc(ix(bx) + (i ? -1 : 1) * ph * 10, iy(by) - ph * 16, 1.8, 0, 6.28); g2.fill(); }
    }
  }

  // ---- 額縁（Blender の静止画 play/gallery/。作り方は tools/blender/）。夜明け＝金の飾り、静かな朝＝くるみ材と銀 ----
  // 額縁の絵の大きさと窓（作品が入る穴）の位置（px）。top は額縁の外の上のふち。s は小さな額縁（夜明けは上の貝殻なし）
  // 窓には精霊が生まれた美術館の作品を窓いっぱいに。上のふちには小さな額縁を、上のふちをそろえて食いこませ、その中に精霊
  const FR = {
    dawn: { w: 720, h: 1149, l: 141, t: 336, ww: 438, wh: 672, top: 208, s: { w: 300, h: 398, l: 59, t: 59, ww: 182, wh: 280, top: 6 } },
    quiet: { w: 720, h: 968, l: 128, t: 128, ww: 464, wh: 711, top: 14, s: { w: 300, h: 403, l: 53, t: 53, ww: 193, wh: 296, top: 6 } }
  };
  const SMALL = 0.26; // 小さな額縁の窓は、大きな額縁の窓の幅の 26%
  // 飾った子の作品の写し（目録の M.works から。題・美術館・由来。結びの子は最初の作品の絵を窓に入れる）
  const worksOf = M => (Array.isArray(M.works) ? M.works : []).filter(w => w && safeArt(w.f)).slice(0, 3)
    .map(w => ({ f: w.f, m: /^(aic|met|cma|smk)$/.test(w.m) ? w.m : '', title: String(w.title || '').slice(0, 200), url: /^https:\/\/[\w./?=&%#-]+$/.test(w.url || '') ? w.url : '', story: w.story || '' }));
  const box4 = (x, y, w, h) => `left:${x}px;top:${y}px;width:${w}px;height:${h}px`;
  // 額縁の絵そのものの大きさの要素（使う所で縮める・ゆがめる）
  function fbox(f) {
    const P = FR[f.k], S = P.s, art = f.id && Array.isArray(f.w) && f.w[0] ? safeArt(f.w[0].f) : '', th = f.id ? safeThumb(f.th) : '';
    const rar = f.id && (f.rar === 'gold' || f.rar === 'silver') ? ' rar-' + f.rar : '';
    let h = `<div class="fb f-${f.k}${rar}" style="width:${P.w}px;height:${P.h}px">`;
    if (!f.id) h += `<div class="fw empty" style="${box4(P.l, P.t, P.ww, P.wh)}">${esc(tr('nEmptyFrame'))}</div>`;
    else h += `<div class="fw" style="${box4(P.l, P.t, P.ww, P.wh)};background-image:url('${art ? '/play/museum/' + art : th}')"></div>`;
    h += `<img class="fi" src="${GAL}frame-${f.k}.webp" alt="" draggable="false">`;
    if (art && th) {
      const k = P.ww * SMALL / S.ww, x = (P.w - S.w * k) / 2, y = P.top - S.top * k;
      h += `<div class="fsm" style="${box4(x, y, S.w * k, S.h * k)}"><div class="fsw" style="${box4(S.l * k - 1, S.t * k - 1, S.ww * k + 2, S.wh * k + 2)};background-image:url('${th}')"></div><img src="${GAL}frame-${f.k}-s.webp" alt="" draggable="false"></div>`;
    }
    return h + '</div>';
  }
  // 決まった幅に縮めた額縁（朝にもらうとき・選ぶとき・正面から見るとき）
  function frameBox(f, width = 160) {
    const P = FR[f.k], k = width / P.w;
    return `<div class="fscale" style="width:${width}px;height:${Math.round(P.h * k)}px">${fbox(f).replace('style="width:', `style="transform:scale(${k});width:`)}</div>`;
  }

  // ---- 最後の通路（2026-10-25〜。もと「わたしの展示室」）：中世風の石の通路の両側の壁に3つずつ＝6つの額縁。新しい額縁ほど手前に掛ける。7つ目からは「ほかの額縁を見る」で次の6つ ----
  // 「前に進む」で3か所に立つ（入口・奥の2枚の前・光の扉の手前）。立つ所ごとの絵は last-{1,2,3}.jpg（hall.py -- out.png 1200 64 empty、SLOTS=3・CAMY＝-0.9・2.9・9.6）。光の扉の手前では額縁は後ろに回って見えない。
  // 壁の額縁の窓の四隅（絵の割合。左上・右上・右下・左下）と名札の位置は hall.py が書いた JSON の値。並びは 手前の左・手前の右・中の左・中の右・奥の左・奥の右。
  // v＝その立つ所から見えるか（手前の額縁は、前に進むと後ろへ回る）。near＝その立つ所でいちばん近い組（名札を大きく）
  const LAST = [
  [
    { c: [[0.1358,0.3191],[0.2057,0.3482],[0.2086,0.5924],[0.1404,0.6208]], p: [0.1776,0.6791], v: true },
    { c: [[0.7943,0.3482],[0.8642,0.3191],[0.8596,0.6208],[0.7914,0.5924]], p: [0.8224,0.6791], v: true },
    { c: [[0.2764,0.3777],[0.3048,0.3895],[0.3061,0.5517],[0.2781,0.5634]], p: [0.2933,0.6043], v: true },
    { c: [[0.6952,0.3895],[0.7236,0.3777],[0.7219,0.5634],[0.6939,0.5517]], p: [0.7067,0.6043], v: true },
    { c: [[0.3387,0.4036],[0.354,0.41],[0.3548,0.5315],[0.3396,0.5378]], p: [0.3478,0.5691], v: true },
    { c: [[0.646,0.41],[0.6613,0.4036],[0.6604,0.5378],[0.6452,0.5315]], p: [0.6522,0.5691], v: true }
  ],
  [
    { c: [[1.9151,1.0609],[18.6609,8.0426],[50.094,-20.2059],[1.9886,-0.1497]], p: [7.4289,-4.0092], v: false },
    { c: [[-17.6609,8.0426],[-0.9151,1.0609],[-0.9886,-0.1497],[-49.094,-20.2059]], p: [-6.4289,-4.0092], v: false },
    { c: [[-0.4808,0.062],[-0.0984,0.2214],[-0.0861,0.7153],[-0.4484,0.8663]], p: [-0.243,0.9505], v: false },
    { c: [[1.0984,0.2214],[1.4808,0.062],[1.4484,0.8663],[1.0861,0.7153]], p: [1.243,0.9505], v: false },
    { c: [[0.1358,0.3191],[0.2057,0.3482],[0.2086,0.5924],[0.1404,0.6208]], p: [0.1776,0.6791], v: true },
    { c: [[0.7943,0.3482],[0.8642,0.3191],[0.8596,0.6208],[0.7914,0.5924]], p: [0.8224,0.6791], v: true }
  ],
  [
    { c: [[0.6472,0.5323],[0.6628,0.5388],[0.6637,0.4026],[0.648,0.4092]], p: [0.6556,0.3705], v: false },
    { c: [[0.3372,0.5388],[0.3528,0.5323],[0.352,0.4092],[0.3363,0.4026]], p: [0.3444,0.3705], v: false },
    { c: [[0.6973,0.5532],[0.7264,0.5653],[0.7283,0.3757],[0.6987,0.3881]], p: [0.7131,0.3333], v: false },
    { c: [[0.2736,0.5653],[0.3027,0.5532],[0.3013,0.3881],[0.2717,0.3757]], p: [0.2869,0.3333], v: false },
    { c: [[0.7993,0.5957],[0.8718,0.6259],[0.8767,0.3139],[0.8024,0.3448]], p: [0.8384,0.2524], v: false },
    { c: [[0.1282,0.6259],[0.2007,0.5957],[0.1976,0.3448],[0.1233,0.3139]], p: [0.1616,0.2524], v: false }
  ]
  ];
  const NEAR = [0, 2, -1];
  const PER = 6, HW = 1600, HH = 1067;
  // 4点の対応から、射影の行列（3×3）を解く
  function homography(src, dst) {
    const A = [], B = [];
    src.forEach(([x, y], i) => { const [u, v] = dst[i]; A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); B.push(u); A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); B.push(v); });
    for (let c = 0; c < 8; c++) {
      let p = c; for (let r = c + 1; r < 8; r++) if (Math.abs(A[r][c]) > Math.abs(A[p][c])) p = r;
      [A[c], A[p]] = [A[p], A[c]]; [B[c], B[p]] = [B[p], B[c]];
      for (let r = 0; r < 8; r++) if (r !== c) { const m = A[r][c] / A[c][c]; for (let k = c; k < 8; k++) A[r][k] -= m * A[c][k]; B[r] -= m * B[c]; }
    }
    const h = B.map((b, i) => b / A[i][i]);
    return `matrix3d(${h[0]},${h[3]},0,${h[6]},${h[1]},${h[4]},0,${h[7]},0,0,1,0,${h[2]},${h[5]},0,1)`;
  }
  function fitHall() { $('stage').style.transform = `scale(${$('view').clientWidth / HW})`; }
  function drawHall() {
    const stage = $('stage'), labels = $('hLabels'); stage.replaceChildren(); labels.replaceChildren();
    if (at !== 'last') return;
    const F = frames().map((f, i) => [f, i]).reverse(), pages = Math.max(1, Math.ceil(F.length / PER));
    page = Math.min(page, pages - 1);
    LAST[pos].forEach((S, j) => {
      const e = F[page * PER + j]; if (!e || !S.v) return;
      const [f, fi] = e, P = FR[f.k], b = document.createElement('button'); b.type = 'button'; b.className = 'hf';
      b.style.width = P.w + 'px'; b.style.height = P.h + 'px';
      b.style.transform = homography([[P.l, P.t], [P.l + P.ww, P.t], [P.l + P.ww, P.t + P.wh], [P.l, P.t + P.wh]], S.c.map(([x, y]) => [x * HW, y * HH]));
      b.innerHTML = fbox(f);
      b.setAttribute('aria-label', f.id ? txt(f.name) : tr('nEmptyFrame') + ' ' + tr('nTapToPick'));
      b.onclick = () => { if (busy) return; f.id ? openView(f) : openPicker(fi, draw); };
      stage.append(b);
      // 名札は近い組とその次の組だけ（遠い組の名札は重なって読めない。前に進むと見える）
      if (S.p[0] < 0.02 || S.p[0] > 0.98 || (j >> 1) - NEAR[pos] > 1) return;
      const l = document.createElement('span');
      l.className = (j >> 1 === NEAR[pos] ? 'near' : '') + (!f.id ? ' dim' : f.rar === 'gold' ? ' g' : f.rar === 'silver' ? ' s' : '');
      l.style.left = S.p[0] * 100 + '%'; l.style.top = S.p[1] * 100 + '%';
      l.textContent = f.id ? txt(f.name) : tr('nNotYet');
      labels.append(l);
    });
    fitHall();
  }
  addEventListener('resize', () => { if (at === 'last') fitHall(); });
  // 前の版で飾った子には作品の写しが無いので、目録にまだいれば足しておく
  async function fixFrames() {
    const R = loadRec(); if (!Array.isArray(R.frames) || !R.frames.some(f => f && f.id && !f.w)) return;
    await reloadDex(); let n = 0;
    R.frames.forEach(f => { if (!f || !f.id || f.w) return; const M = ALL.find(x => x.id === f.id); if (M) { f.w = worksOf(M); f.desc = M.desc || null; n++; } });
    if (n && saveRec(R) && at === 'last') drawHall();
  }

  // ---- 正面から見る：額縁のアップと、呼び名・名前・説明・生まれた作品 ----
  function openView(f) {
    const dawn = f.k === 'dawn', W = Math.min(380, innerWidth - 60, Math.round((innerHeight * .78) * FR[f.k].w / FR[f.k].h));
    $('fvFrame').innerHTML = frameBox(f, W);
    $('fvT').textContent = tr(dawn ? 'frameTitleDawn' : 'frameTitleQuiet');
    $('fvName').textContent = txt(f.name);
    $('fvN').textContent = tr(dawn ? 'framedAtDawn' : 'framedAtQuiet', { n: Number(f.n) || 1 });
    const d = f.desc ? txt(f.desc) : ''; $('fvDesc').textContent = d; $('fvDesc').hidden = !d;
    const ws = Array.isArray(f.w) ? f.w : [];
    $('fvWork').innerHTML = ws.length ? `<b>${esc(tr(ws.length > 1 ? 'nBornFromN' : 'nBornFrom', { n: ws.length }))}</b>` + ws.map((w, i) =>
      `<div><span class="ti">${w.url ? `<a href="${esc(w.url)}" target="_blank" rel="noopener">${esc(w.title)}</a>` : esc(w.title)}</span><br>${esc(w.m ? tr('mu_' + w.m) : '')} · ${esc(tr('nCC0'))}</div>`
      + (i === 0 && w.story ? `<p>${esc(txt(w.story))}</p>` : '')).join('') : '';
    $('fview').hidden = false; sfx('pick');
  }
  $('fvClose').onclick = () => { $('fview').hidden = true; sfx('un'); };

  // ---- 飾る精霊を選ぶ（目録から1体。守り神も飾れる）。一度飾ったら、はめかえできない ----
  let ALL = [], pickFor = -1, pickDone = null, pickSel = null;
  async function reloadDex() { ALL = await readDex(); }
  async function openPicker(fi, done) {
    pickFor = fi; pickDone = done; pickSel = null;
    await reloadDex();
    const F = frames(), f = F[fi]; if (!f || f.id) return;
    const used = new Set(F.filter(x => x.id).map(x => x.id));
    const cards = ALL.filter(M => safeThumb(M.thumb)).sort((a, b) => (b.serial || 0) - (a.serial || 0));
    $('pickH').textContent = tr('nPickH', { frame: tr(f.k === 'dawn' ? 'frameDawn' : 'frameQuiet') });
    $('pickNone').hidden = cards.length > 0;
    $('pickGrid').replaceChildren(...cards.map(M => {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'th' + (used.has(M.id) ? ' done' : '');
      b.style.backgroundImage = `url('${safeThumb(M.thumb)}')`;
      const fr = F.find(x => x.id === M.id);
      b.innerHTML = (fr ? `<span class="mk ${fr.k}">${esc(tr(fr.k === 'dawn' ? 'frameMarkDawn' : 'frameMarkQuiet'))}</span>` : '') + `<span class="lbl">${esc(txt(M.name))}</span>`;
      b.disabled = used.has(M.id);
      b.setAttribute('aria-label', txt(M.name) + (fr ? ' ' + tr('nPickDone') : ''));
      b.onclick = () => { pickSel = M; sfx('pick'); confirmPick(); [...$('pickGrid').children].forEach(x => x.classList.toggle('sel', x === b)); };
      return b;
    }));
    $('pickConfirm').hidden = true;
    $('picker').hidden = false;
  }
  function confirmPick() {
    const f = frames()[pickFor], M = pickSel; if (!f || !M) return;
    const rar = M.rarity === 'gold' || M.rarity === 'silver' ? M.rarity : 'normal';
    $('pickPreview').innerHTML = frameBox({ k: f.k, id: M.id, rar, th: M.thumb, w: worksOf(M) }, 150);
    $('pickMsg').innerHTML = esc(tr('nConfirm', { name: txt(M.name), frame: tr(f.k === 'dawn' ? 'frameDawn' : 'frameQuiet') })) + '<br><span class="warn">' + esc(tr('nNoSwap')) + '</span>';
    $('pickConfirm').hidden = false;
    $('pickConfirm').scrollIntoView({ block: 'nearest' });
  }
  $('doFrame').onclick = () => {
    const R = loadRec(), F = Array.isArray(R.frames) ? R.frames : [], f = F[pickFor], M = pickSel;
    if (!f || f.id || !M) return; // もう飾ってある額縁は、はめかえない
    Object.assign(f, { id: M.id, name: M.name, rar: M.rarity === 'gold' || M.rarity === 'silver' ? M.rarity : 'normal', th: safeThumb(M.thumb), desc: M.desc || null, w: worksOf(M) });
    R.frames = F;
    if (!saveRec(R)) { $('pickMsg').textContent = tr('nSaveFail'); return; }
    sfx('light'); burst(.5, .4, 50); track('night_frame');
    // 手もとの精霊にも、展示室の主の印をつける
    ZK.forEach(c => { if (c.id === M.id) c.framed = f.k; }); HAND.forEach(c => { if (c.id === M.id) c.framed = f.k; });
    $('picker').hidden = true;
    if (pickDone) pickDone();
  };
  $('repick').onclick = () => { pickSel = null; $('pickConfirm').hidden = true; [...$('pickGrid').children].forEach(x => x.classList.remove('sel')); sfx('un'); };
  $('pickClose').onclick = () => { $('picker').hidden = true; sfx('un'); };

  // ---- 7体えらぶ ----
  const sum6 = () => dpick.filter(i => i !== aceI).reduce((a, i) => a + ZK[i].p, 0);
  function drawDeck() {
    const few = ZK.length < 7;
    $('few').hidden = !few; $('zukan').hidden = few;
    if (few) $('fewMsg').textContent = tr('nFew', { n: ZK.length });
    $('zukan').replaceChildren(...ZK.map((c, i) => {
      const k = dpick.indexOf(i), b = cardEl(c, { on: k >= 0, n: k + 1, ace: i === aceI });
      b.onclick = () => togglePick(i); return b;
    }));
    $('picked').replaceChildren(...Array.from({ length: SIZE }, (_, k) => {
      const d = document.createElement('div'); d.className = 'slot'; const i = dpick[k];
      if (i === undefined) { d.innerHTML = '<div class="empty">' + (k + 1) + '</div>'; return d; }
      const b = cardEl(ZK[i], { ace: i === aceI }); b.onclick = () => togglePick(i); d.append(b);
      const a = document.createElement('button'); a.type = 'button'; a.className = 'acebtn' + (i === aceI ? ' on' : ''); a.textContent = tr(i === aceI ? 'nAceOn' : 'nAceSet'); 
      a.onclick = () => { aceI = aceI === i ? -1 : i; sfx('pick'); drawDeck(); }; d.append(a);
      return d;
    }));
    const t = sum6(), over = t > CAP;
    $('msumLbl').textContent = tr('nSum');
    $('msum').textContent = t; $('mcap').textContent = CAP; $('mbar').style.width = Math.min(100, t / CAP * 100) + '%';
    $('meter').classList.toggle('bad', over); $('mline').classList.toggle('bad', over);
    $('dmsg').classList.toggle('warn', over);
    $('dmsg').textContent = dpick.length < SIZE ? tr('nLeft', { n: SIZE - dpick.length })
      : over ? tr('nOver', { n: t - CAP }) : aceI < 0 ? tr('nReadyNoAce') : tr('nReady');
    $('tonight').disabled = dpick.length < SIZE || over;
    $('auto').disabled = ZK.length < 7;
  }
  function togglePick(i) {
    const k = dpick.indexOf(i);
    if (k >= 0) { dpick.splice(k, 1); if (aceI === i) aceI = -1; sfx('un'); }
    else if (dpick.length < SIZE) { dpick.push(i); sfx('pick'); }
    else { sfx('no'); return; }
    drawDeck();
  }
  // おまかせ：いちばん輝きの大きい子を★主に、残りから合計が上限にいちばん近い6体
  function autoPick() {
    const idx = ZK.map((_, i) => i);
    const ace = idx.reduce((a, b) => ZK[a].p > ZK[b].p ? a : b);
    const rest = idx.filter(i => i !== ace);
    let best = null, bv = -1;
    for (let k = 0; k < 3000; k++) {
      const r = [...rest].sort(() => Math.random() - .5).slice(0, 6), v = r.reduce((a, i) => a + ZK[i].p, 0);
      if (v <= CAP && v > bv) { bv = v; best = r; }
    }
    if (!best) best = [...rest].sort((a, b) => ZK[a].p - ZK[b].p).slice(0, 6); // どう組んでも超えるときは小さい順（メーターが赤くなる）
    dpick = [ace, ...best]; aceI = ace; sfx('back'); drawDeck();
  }
  $('auto').onclick = autoPick;
  $('trial').onclick = () => { trial = true; dpick = []; aceI = -1; ZK = trialSet(); sfx('pick'); drawDeck(); };
  $('tonight').onclick = () => {
    HAND = dpick.map(i => Object.assign({}, ZK[i], { used: false, ace: i === aceI }));
    ROOM = tonight(new Date()); sel = []; cur = 0; at = 'door'; pos = 0; page = 0;
    aceBack = false; busy = false; ended = false; endArm = false; keyed = false; witness = null; witnessMap = ''; hikariLit = null;
    $('trialNote').hidden = !trial;
    $('deck').hidden = true; preload(); draw(); glowUp(); sfx('send'); track('night_start');
  };

  // ---- 背景：紺の闇に、金の灯りの粒がただよう。灯った部屋が増えるほど、粒が増えて明るくなる ----
  const cv = $('bg'), g = cv.getContext('2d');
  let W, H; const DPR = Math.min(2, devicePixelRatio || 1);
  function rs() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }
  rs(); addEventListener('resize', rs);
  const motes = Array.from({ length: 90 }, (_, i) => ({ x: Math.random(), y: Math.random(), v: .00008 + Math.random() * .00022, r: .6 + Math.random() * 1.8, ph: Math.random() * 6.28, k: i }));
  let sparks = [], glow = 0, glowTo = 0;
  function glowUp() { glowTo = ROOM.length ? ROOM.filter(R => R.lit).length / ROOM.length : 0; }
  function burst(x, y, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = .6 + Math.random() * 2.6; sparks.push({ x: x * W, y: y * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v - .8, l: 1 }); } }
  const t0 = performance.now();
  function frame(t) {
    const s = (t - t0) / 1000;
    glow += (glowTo - glow) * .02;
    g.fillStyle = '#0b0d16'; g.fillRect(0, 0, W, H);
    const hall = g.createRadialGradient(W / 2, -H * .1, 0, W / 2, -H * .1, H * 1.1);
    hall.addColorStop(0, `rgba(201,164,92,${.08 + glow * .16})`); hall.addColorStop(1, 'rgba(201,164,92,0)');
    g.fillStyle = hall; g.fillRect(0, 0, W, H);
    const shown = 30 + Math.round(glow * 60);
    for (const m of motes) {
      if (m.k >= shown) continue;
      if (!reduce) { m.y -= m.v; if (m.y < -.02) { m.y = 1.02; m.x = Math.random(); } }
      const a = .25 + .35 * (0.5 + 0.5 * Math.sin(s * 1.3 + m.ph));
      g.fillStyle = `rgba(230,207,154,${a})`; g.beginPath(); g.arc((m.x + Math.sin(s * .3 + m.ph) * .01) * W, m.y * H, m.r, 0, 6.28); g.fill();
    }
    sparks = sparks.filter(p => (p.l -= .012) > 0);
    for (const p of sparks) { p.x += p.vx; p.y += p.vy; p.vy += .02; g.fillStyle = `rgba(246,220,142,${p.l})`; g.beginPath(); g.arc(p.x, p.y, 1.8, 0, 6.28); g.fill(); }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // ---- 音：すべてその場で合成（音のファイルを使わない）。鈴と、静かに満ちていく宇宙のような BGM ----
  let ac = null, on = false, master, bgmGain, wet, noise, timer = null, nextT = 0, step = 0;
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = .8; master.connect(comp);
    bgmGain = ac.createGain(); bgmGain.gain.value = .9; bgmGain.connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * .1, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // 広い残響：消えていく雑音を響きの形にして重ねる（ファイルを使わない）
    const ir = ac.createBuffer(2, ac.sampleRate * 3, ac.sampleRate);
    for (let c = 0; c < 2; c++) { const x = ir.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / x.length, 3.2); }
    const rv = ac.createConvolver(); rv.buffer = ir;
    wet = ac.createGain(); wet.gain.value = .9; wet.connect(rv); rv.connect(bgmGain);
    // 分散和音のこだま（付点8分）
    echo = ac.createDelay(1); echo.delayTime.value = STEP * 3;
    const fb = ac.createGain(); fb.gain.value = .38; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
    echo.connect(lp); lp.connect(fb); fb.connect(echo); lp.connect(bgmGain); lp.connect(wet);
  }
  let echo = null;
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // 鈴：倍音を少しずらした正弦波を重ね、長く消えていく
  function bell(f, t, d = 2.2, v = .18, dest = master) {
    [[1, 1], [2.76, .35], [5.4, .12]].forEach(([m, a]) => {
      const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v * a, t + .01); e.gain.exponentialRampToValueAtTime(.0001, t + d / m);
      o.connect(e); e.connect(dest); o.start(t); o.stop(t + d + .05);
    });
  }
  // 弦：やわらかい三角波を2本、ゆっくり立ち上げる（効果音の和音）
  function pad(f, t, d, v = .05, dest = bgmGain) {
    const e = ac.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + d * .4); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    [-5, 5].forEach(dt => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = dt; o.connect(e); o.start(t); o.stop(t + d + .05); });
    e.connect(dest);
  }
  // BGM の音色 ----
  // 和音の霧：少しずらしたのこぎり波を、こもらせて広い残響へ
  function haze(fs, t, d, v) {
    const e = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = .4;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(1500, t + d * .5); lp.frequency.linearRampToValueAtTime(700, t + d);
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + 1.2); e.gain.setValueAtTime(v, t + d - .6); e.gain.exponentialRampToValueAtTime(.0001, t + d + .4);
    fs.forEach(f => [-9, 9].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + d + .5); }));
    lp.connect(e); e.connect(bgmGain); e.connect(wet);
  }
  // 星のつぶ：短く光る音（分散和音）。こだまと残響へ
  function spark(f, t, v) {
    const o = ac.createOscillator(), o2 = ac.createOscillator(), e = ac.createGain();
    o.type = 'triangle'; o.frequency.value = f; o2.type = 'sine'; o2.frequency.value = f * 2;
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .006); e.gain.exponentialRampToValueAtTime(.0001, t + .32);
    o.connect(e); o2.connect(e); e.connect(bgmGain); e.connect(echo); e.connect(wet);
    o.start(t); o2.start(t); o.stop(t + .36); o2.stop(t + .36);
  }
  // 低い脈：根音を8分で、ふくらんで引く
  function sub(f, t, v) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = f;
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .03); e.gain.exponentialRampToValueAtTime(.0001, t + STEP * 2);
    o.connect(e); e.connect(bgmGain); o.start(t); o.stop(t + STEP * 2 + .05);
  }
  // 鼓動：低く沈む太鼓
  function kick(t, v) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine';
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + .18);
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.0001, t + .45);
    o.connect(e); e.connect(bgmGain); o.start(t); o.stop(t + .5);
  }
  // さらさら：16分の細かな雑音と、遠い手拍子
  function hiss(t, v, len = .05, hz = 7000, rev = false) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = noise; f.type = rev ? 'bandpass' : 'highpass'; f.frequency.value = hz;
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.0001, t + len);
    s.connect(f); f.connect(e); e.connect(bgmGain); if (rev) e.connect(wet); s.start(t); s.stop(t + len + .02);
  }
  // BGM：テンポ103、ハ短調寄り（ドリア）の Bbmaj7 → Cm9 → Ebmaj7 → Gm7 を2小節ずつ。16分の分散和音がずっと流れ、
  //      48小節（約1分50秒）で 静か → ベース → 鼓動 → いちばん満ちる（旋律・手拍子）→ ひと息 と満ちていき、くり返す
  const STEP = 60 / 103 / 4;
  const CH = [
    { b: 46, t: [58, 62, 65, 69], pad: [46, 53, 57, 62], mel: [77, 74] },
    { b: 48, t: [60, 63, 67, 74], pad: [48, 55, 58, 63], mel: [75, 72] },
    { b: 51, t: [58, 63, 67, 69], pad: [51, 55, 58, 62], mel: [79, 77] },
    { b: 43, t: [58, 62, 65, 67], pad: [43, 50, 53, 58], mel: [74, 70] }
  ];
  const ARP = [0, 1, 2, 3, 4, 3, 2, 1, 0, 2, 1, 3, 2, 4, 3, 1];
  // 48小節の満ち方（0〜1）
  const lift = bar => { const b = bar % 48; return b < 8 ? .2 : b < 16 ? .4 : b < 24 ? .6 : b < 40 ? 1 : .35; };
  function sched() {
    while (nextT < ac.currentTime + .25) {
      const t = nextT, i = step % 16, barN = Math.floor(step / 16), c = CH[Math.floor(barN / 2) % 4], L = lift(barN);
      if (i === 0 && barN % 2 === 0) haze(c.pad.map(N), t, STEP * 32, .016 + .006 * L);
      const a = ARP[i]; spark(N(a === 4 ? c.t[0] + 12 : c.t[a]), t, (.022 + .02 * L) * (i % 4 === 0 ? 1.3 : 1));
      if (L >= .4 && i % 2 === 0) sub(N(c.b - 12), t, (i % 4 === 0 ? .16 : .09) * Math.min(1, L + .2));
      if (L >= .6 && (i === 0 || i === 8 || (L >= 1 && (i === 4 || i === 12)))) kick(t, .22 * L);
      if (L >= .6) hiss(t, (i % 4 === 2 ? .022 : .01) * L);
      if (L >= 1 && (i === 4 || i === 12)) hiss(t, .05, .18, 1800, true);
      if (L >= 1 && i === 0) bell(N(c.mel[barN % 2]), t, 3.6, .05, wet), bell(N(c.mel[barN % 2]), t, 3.6, .035, bgmGain);
      nextT += STEP; step++;
    }
  }
  function bgm(play) { if (play) { nextT = ac.currentTime + .05; step = 0; timer = setInterval(sched, 60); } else { clearInterval(timer); timer = null; } }
  function sfx(k) {
    if (!on || !ac) return;
    const t = ac.currentTime;
    const S = {
      pick: () => bell(N(84), t, .8, .1),
      un: () => bell(N(77), t, .6, .07),
      no: () => bell(N(55), t, .5, .12),
      send: () => [72, 75, 79].forEach((n, i) => bell(N(n), t + i * .12, 1.6, .1)),
      light: () => { [60, 67, 72, 74, 79, 84].forEach((n, i) => bell(N(n), t + i * .09, 2.6, .13)); pad(N(48), t, 3, .08, master); pad(N(55), t, 3, .06, master); },
      back: () => [79, 84].forEach((n, i) => bell(N(n), t + i * .18, 1.6, .12)),
      dawn: () => { [58, 62, 65, 69, 70, 74, 77, 81].forEach((n, i) => bell(N(n), t + i * .14, 3.2, .13)); [46, 53, 57, 62].forEach(n => pad(N(n), t, 5, .07, master)); },
      quiet: () => { [67, 72, 74].forEach((n, i) => bell(N(n), t + i * .3, 2.8, .1)); [48, 55, 60].forEach(n => pad(N(n), t, 4.5, .06, master)); }
    };
    if (S[k]) S[k]();
  }
  $('snd').onclick = () => {
    if (!ac) initAudio(); ac.resume(); on = !on;
    $('snd').classList.toggle('on', on); $('snd').textContent = tr(on ? 'nSndOff' : 'nSndOn'); bgm(on); if (on) sfx('pick');
  };

  // ---- はじめ ----
  applyDom();
  $('rule1').innerHTML = tr('nRule1', { cap: CAP });
  const now = new Date();
  try { $('date').textContent = tr('nDate', { date: now.toLocaleDateString(document.documentElement.lang || 'ja', { month: 'long', day: 'numeric' }) }); } catch (e) { /* 日付の書き方が使えない画面でも遊べる */ }
  ROOM = tonight(now); draw(); glowUp();
  const dexP = readDex();
  $('startbtn').onclick = async () => {
    $('startbtn').disabled = true; $('startbtn').textContent = tr('nLoading');
    const all = ALL = await dexP;
    ZK = all.filter(M => !isHuman(M) && Number(M.power) > 0).map(spirit).sort((a, b) => b.p - a.p);
    $('intro').hidden = true; $('deck').hidden = false; drawDeck(); sfx('pick');
  };
})();
