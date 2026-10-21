// night-app.js — 夜の美術館を灯す（night.html）のプログラム。play/ と各言語の play/ でバイト同一に保つ。
// 2026-10-21 に対戦（battle.html）から置きかえた（相手のいない形。重吉さんの判断）。
// 目録（IndexedDB の dropper-monster）は読むだけ。書き換えない。夜の記録は localStorage（この端末の中だけ）。
// 結びのことわりは monster-app.js の fusionRules と同じ数字。守り神（人間のカード）は灯さない「立会人」で、強さを持たせない。
// 2026-10-21〜（PR3-2）：朝を迎えた回数で朝の場面が5段階に育つ・朝ごとに額縁を1つ・目録の精霊を1体だけ飾る（はめかえ不可）・わたしの展示室・
// 飾った子は「展示室の主」としてひとこと話す・金の光／銀の光の子を連れた夜だけ6つめの「光の間」が開く。
// 朝の場面と額縁は、Blender の静止画ができるまでページの中で描いた仮の絵（drawScene・.frame の CSS）。差しかえるときはこの2か所だけを直す。
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
  // 守り神の色：その人の人生地図の丘の色（monster-app.js の drawLife と同じ式）を5つ拾う
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
  // { n: 遊んだ夜, dawn: 夜明けを迎えた回数, quiet: 静かな朝を迎えた回数, noAce: 次の夜は★主なし,
  //   frames: 手に入れた額縁 [{ k: 'dawn'|'quiet', n: 何回目の朝, id: 飾った目録のカード（空なら null）, name, rar, th: 飾ったときの名前・珍しさ・小さな絵の写し }] }
  // 飾った子の写しを持つのは、目録を空にしても展示室に残すため。目録のページ（monster-app.js の framesById）も、この frames を読むだけ
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
  // 要る明るさのもと（共有フォルダ sacred/night.py で試した「ふつう」）。日ごとに ±10% ゆらす
  const LEVELS = [280, 350, 450, 560, 650];
  const roomName = R => R.special ? tr('nHikariName') : (D('nRoomNames') || [])[R.k] || '';
  // 光の間：金の光か銀の光の子を連れた夜だけ開く6つめの部屋。灯さなくても夜明けになれる（灯せたら夜明けの場面に特別な光）。
  // 送る組に金か銀の子が1体いること。要る明るさは 500 を日ごとに ±10%
  const HIKARI = { fav: ['光', '夢'], level: 500 };
  const isRare = c => c.rarity === 'gold' || c.rarity === 'silver';
  const allowed = (cs, R) => !R || !R.special || cs.some(isRare);
  function sfc32(a, b, c, d) {
    return () => { a |= 0; b |= 0; c |= 0; d |= 0; const t = (a + b | 0) + d | 0; d = d + 1 | 0; a = b ^ b >>> 9; b = c + (c << 3) | 0; c = c << 21 | c >>> 11; c = c + t | 0; return (t >>> 0) / 4294967296; };
  }
  function tonight(now, hikari) {
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    let h = 2166136261; for (const ch of 'night:' + key) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
    const r = sfc32(h, h ^ 0x9e3779b9, h ^ 0x85ebca6b, h ^ 0xc2b2ae35); for (let i = 0; i < 12; i++) r();
    const ks = [...ROOMS.keys()].map(k => [k, r()]).sort((a, b) => a[1] - b[1]).slice(0, 5).map(x => x[0]);
    const rooms = LEVELS.map((lv, i) => ({ k: ks[i], fav: ROOMS[ks[i]], need: Math.round(lv * (0.9 + r() * 0.2) / 10) * 10, lit: false })).sort((a, b) => a.need - b.need);
    const hn = Math.round(HIKARI.level * (0.9 + r() * 0.2) / 10) * 10;
    if (hikari) rooms.push({ k: -1, special: true, fav: HIKARI.fav, need: hn, lit: false });
    return rooms;
  }

  // ---- 状態 ----
  // ★主以外の6体の輝きの合計の上限（★主を置けない夜は、6体だけで灯す）。対戦のときと同じ 1500
  const CAP = 1500;
  let ZK = [], GUARDS = [], trial = false, noAce = false;
  let dpick = [], aceI = -1, guardI = -1;
  const SIZE = () => noAce ? 6 : 7;
  let HAND = [], ROOM = [], sel = [], cur = -1, aceBack = false, busy = false, witness = null, ended = false, endArm = false, hikariLit = null;
  const normals = () => ROOM.filter(R => !R.special);

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

  // ---- 遊ぶ画面 ----
  function draw() {
    $('rooms').replaceChildren(...ROOM.map((R, i) => {
      const b = document.createElement('button'); b.type = 'button';
      const can = !R.lit && canLight(R);
      b.className = 'room' + (R.special ? ' hikari' : '') + (R.lit ? ' lit' : i === cur ? ' now' : '') + (can ? ' can' : '');
      b.innerHTML = (R.special ? `<span class="badge">${esc(tr('nHikariBadge'))}</span>` : '')
        + `<span class="lamp"></span><div class="n">${esc(roomName(R))}</div><div class="need">${esc(tr('nNeed', { n: R.need }))}</div>`
        + `<div class="fav">${esc(tr('nFav', { a: txt({ ty: R.fav[0] }), b: txt({ ty: R.fav[1] }) }))}</div>`
        + (R.special ? `<div class="fav hk">${esc(tr('nHikariNeed'))}</div>` : '')
        + `<div class="st">${esc(tr(R.lit ? 'nLit' : i === cur ? 'nNow' : 'nDark'))}</div>`;
      b.disabled = R.lit || busy || ended;
      b.onclick = () => { if (R.lit || busy) return; cur = cur === i ? -1 : i; sfx(cur < 0 ? 'un' : 'pick'); draw(); };
      return b;
    }));
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
      $('pv').innerHTML = chips(P, R) + `<span><b>${P.sum}</b>${P.m !== 1 ? ' × ' + P.m.toFixed(2) : ''}${P.fav ? ' × ' + FAV : ''} ＝</span><span class="big">${P.v}</span>${R ? `<span>／ ${R.need}</span>` : ''}`;
      const okRare = allowed(cs, R);
      ok = !!R && P.v >= R.need && okRare;
      $('okmsg').className = R ? (ok ? 'ok' : 'short') : '';
      $('okmsg').textContent = R ? (!okRare ? tr('nHikariNoRare') : ok ? tr('nCan') : tr('nShort', { n: R.need - P.v })) : '';
    } else { $('pv').innerHTML = `<span>${esc(tr('nPvEmpty'))}</span>`; $('okmsg').textContent = ''; }
    $('go').disabled = !ok || busy || ended;
    $('go').textContent = cs.length ? tr('nGoN', { n: cs.length }) : tr('nGo');
    if (!busy && !ended) $('msg').textContent = R ? tr('nPickSp', { room: roomName(R) }) : normals().every(x => x.lit) ? tr('nHikariLeft') : tr('nPickRoom');
    $('endbtn').disabled = busy || ended;
    $('endbtn').classList.toggle('warn', endArm); $('endbtn').textContent = tr(endArm ? 'nEndSure' : 'nEndBtn');
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
    const ok = cs => allowed(cs, R) && light(cs, R).v >= R.need;
    for (let a = 0; a < idx.length; a++) {
      if (ok([HAND[idx[a]]])) return true;
      for (let b = a + 1; b < idx.length; b++) {
        if (ok([HAND[idx[a]], HAND[idx[b]]])) return true;
        for (let c = b + 1; c < idx.length; c++) if (ok([HAND[idx[a]], HAND[idx[b]], HAND[idx[c]]])) return true;
      }
    }
    return false;
  }
  $('go').onclick = async () => {
    const R = ROOM[cur], cs = sel.map(i => HAND[i]);
    if (busy || !R || !cs.length) return;
    const P = Object.assign(light(cs, R), { cs });
    if (P.v < R.need || !allowed(cs, R)) return;
    busy = true; endArm = false;
    sel.forEach(i => { HAND[i].used = true; });
    // ★主の力：送った夜のあと、1夜に1回だけ戻ってくる
    const ace = cs.find(c => c.ace); let back = false;
    if (ace && !aceBack) { aceBack = true; back = true; }
    sel = []; draw();
    await lightScene(R, cs, P, back);
    R.lit = true; if (back) ace.used = false;
    if (R.special) hikariLit = cs.some(c => c.rarity === 'gold') ? 'gold' : 'silver';
    cur = -1; busy = false; draw();
    glowUp();
    // 5部屋が灯れば夜明け。光の間がまだ灯せるなら、朝を待つ（灯さずに朝を迎えるなら「ここまで」）
    const sp = ROOM.find(x => x.special);
    if (normals().every(x => x.lit) && (!sp || sp.lit || !canLight(sp))) { await wait(500); morning(); return; }
    if (!ROOM.some(x => !x.lit && canLight(x))) { $('msg').textContent = tr('nNoMore'); ended = true; draw(); await wait(1800); morning(); }
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

  // ---- 朝：夜明け（5部屋すべて）か、静かな朝。負けの言葉は使わない。立会人にお礼を言う ----
  // 朝を迎えると、その朝の回数を数え、額縁を1つ渡す（おためしの精霊の夜と、1部屋も灯らなかった朝は数えない）。
  // 場面の段階は、その朝を迎えた回数で決まる（levelOf）
  let sceneOn = null;
  function morning() {
    ended = true; draw();
    const N = normals(), lit = N.filter(R => R.lit).length, dawn = lit === N.length, k = dawn ? 'dawn' : 'quiet';
    const dark = N.filter(R => !R.lit).map(roomName).join(tr('nRoomSep'));
    const who = witness ? esc(witness) : '';
    const counts = !trial && lit > 0;
    let count = 1, gift = null;
    if (counts) {
      const R = loadRec(); R.n = (R.n || 0) + 1; count = R[k] = (R[k] || 0) + 1;
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
      + `<p>${dawn ? tr('nDawnP') : lit ? tr('nQuietP', { n: lit, rooms: esc(dark) }) : tr('nQuietP0')}</p>`
      + (dawn && hikariLit ? `<p class="hk">${esc(tr(hikariLit === 'gold' ? 'nHikariGold' : 'nHikariSilver'))}</p>` : '')
      + `<div class="lamps">${ROOM.map(R => `<i class="${R.lit ? 'on' : ''}${R.special ? ' sp' : ''}"></i>`).join('')}</div>`
      + (gift !== null ? `<div class="gift" id="gift">${frameBox({ k }, 'mini')}<p>${tr('nGift', { frame: esc(tr(dawn ? 'frameDawn' : 'frameQuiet')) })}</p>`
        + `<div class="btns"><button class="btn" id="pickNow" type="button">${esc(tr('nPickNow'))}</button><button class="btn ghost" id="later" type="button">${esc(tr('nLater'))}</button></div></div>`
        : `<p class="small">${esc(tr(trial ? 'nGiftTrial' : 'nGiftNone'))}</p>`)
      + `<button class="btn" id="ty" type="button">${witness ? tr('nThanks', { name: who }) : esc(tr('nThanksMuseum'))}</button>`
      + `<div class="small" id="warn">${tr('nWarn')}</div>`
      + `<button class="btn ghost" id="skip" type="button">${esc(tr('nSkip'))}</button>`
      + `<a class="btn ghost" id="toDex" href="spirit.html" hidden>${esc(tr('nBack'))}</a></div>`;
    $('morning').hidden = false;
    startScene(k, lv, dawn ? hikariLit : null);
    if (gift !== null) {
      $('pickNow').onclick = () => openPicker(gift, () => { $('gift').innerHTML = `<p>${esc(tr('nFramedOk'))}</p>`; });
      $('later').onclick = () => { $('gift').innerHTML = `<p class="small">${esc(tr('nLaterOk'))}</p>`; };
    }
    const finish = thanked => {
      if (!trial) { const R = loadRec(); R.noAce = !thanked; saveRec(R); }
      noAce = !thanked && !trial;
      $('toDex').hidden = false; // お礼をするか決めたあとで出す（決める前に出ると、お礼をせずに抜けられる）
      $('skip').textContent = tr('nAgain'); $('skip').onclick = restart;
    };
    $('ty').onclick = () => { sfx('thanks'); burst(.5, .55, 60); $('ty').disabled = true; $('ty').textContent = tr('nThanked'); $('warn').textContent = ''; finish(true); };
    $('skip').onclick = () => { sfx('no'); $('ty').disabled = true; $('warn').innerHTML = tr('nSkipped'); finish(false); };
  }
  function restart() {
    $('morning').hidden = true; sceneOn = null; HAND = []; sel = []; cur = -1; ended = false; endArm = false; dpick = []; aceI = -1; hikariLit = null;
    reloadDex().then(() => { $('deck').hidden = false; drawDeck(); });
  }

  // ---- 朝の場面（仮の絵）：夜明け＝光が育つ（細い光→光の筋→金の粒→鳥が飛ぶ→館全体が金色）、
  //      静かな朝＝やすらぎが育つ（朝もや→花一輪→花びらが舞う→小鳥が鳴く→庭いっぱいの花）。光の間を灯した夜明けは、金の柱か銀の雨が加わる ----
  function startScene(k, lv, hk) {
    const c = $('scene'); if (!c) return;
    const run = {};
    sceneOn = run;
    const rnd = (i, j) => { const x = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return x - Math.floor(x); };
    const t0 = performance.now();
    const step = t => {
      if (sceneOn !== run || $('morning').hidden) return;
      const w = c.clientWidth, h = c.clientHeight, dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) { c.width = Math.round(w * dpr); c.height = Math.round(h * dpr); }
      const g2 = c.getContext('2d'); g2.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawScene(g2, w, h, k, lv, hk, reduce ? 0 : (t - t0) / 1000, rnd);
      if (!reduce) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  function drawScene(g2, w, h, k, lv, hk, s, rnd) {
    const sky = g2.createLinearGradient(0, 0, 0, h);
    if (k === 'dawn') { sky.addColorStop(0, '#1b1e33'); sky.addColorStop(.45, lv >= 5 ? '#5a4a52' : '#3a3350'); sky.addColorStop(1, lv >= 5 ? '#e0b46a' : '#b98e5c'); }
    else { sky.addColorStop(0, '#0e1220'); sky.addColorStop(.6, '#1c2434'); sky.addColorStop(1, '#3a4650'); }
    g2.fillStyle = sky; g2.fillRect(0, 0, w, h);
    const base = h * .86;
    // 美術館の影（夜明けの5段階目では金色に染まる）
    g2.fillStyle = k === 'dawn' && lv >= 5 ? 'rgba(232,190,110,.55)' : 'rgba(8,9,16,.55)';
    g2.beginPath(); g2.moveTo(w * .18, base); g2.lineTo(w * .18, h * .7); g2.lineTo(w * .5, h * .6); g2.lineTo(w * .82, h * .7); g2.lineTo(w * .82, base); g2.fill();
    for (let i = 0; i < 6; i++) g2.fillRect(w * (.22 + i * .11), h * .71, w * .03, base - h * .71);
    g2.fillRect(0, base, w, h - base);
    if (k === 'dawn') {
      const cx = w * .5, cy = h * .58;
      // 1 細い光
      const beam = g2.createLinearGradient(cx, 0, cx, cy);
      beam.addColorStop(0, 'rgba(255,236,180,0)'); beam.addColorStop(1, 'rgba(255,236,180,.55)');
      g2.fillStyle = beam; g2.fillRect(cx - 2 - lv, 0, 4 + lv * 2, cy);
      // 2 光の筋
      if (lv >= 2) { g2.save(); g2.translate(cx, cy); for (let i = 0; i < 9; i++) { g2.rotate(Math.PI / 9); g2.fillStyle = `rgba(255,230,170,${.06 + .02 * Math.sin(s + i)})`; g2.beginPath(); g2.moveTo(0, 0); g2.lineTo(-w * .05, -h); g2.lineTo(w * .05, -h); g2.fill(); } g2.restore(); }
      // 3 金の粒
      if (lv >= 3) for (let i = 0; i < 40; i++) { const x = rnd(i, 1) * w, y = ((rnd(i, 2) * h - s * (8 + rnd(i, 3) * 14)) % h + h) % h; g2.fillStyle = `rgba(246,220,142,${.4 + .4 * Math.sin(s * 2 + i)})`; g2.beginPath(); g2.arc(x, y, 1.4, 0, 6.28); g2.fill(); }
      // 4 鳥が飛ぶ
      if (lv >= 4) { g2.strokeStyle = 'rgba(30,24,30,.75)'; g2.lineWidth = 1.6; for (let i = 0; i < 5; i++) { const x = ((rnd(i, 4) * w + s * (20 + i * 4)) % (w + 40)) - 20, y = h * (.18 + rnd(i, 5) * .2), f = Math.sin(s * 6 + i) * 3; g2.beginPath(); g2.moveTo(x - 7, y - f); g2.quadraticCurveTo(x - 3, y - 4, x, y); g2.quadraticCurveTo(x + 3, y - 4, x + 7, y - f); g2.stroke(); } }
      // 光の間：金の柱／銀の雨
      if (hk === 'gold') { const p = g2.createLinearGradient(cx - 30, 0, cx + 30, 0); p.addColorStop(0, 'rgba(255,220,120,0)'); p.addColorStop(.5, `rgba(255,236,170,${.55 + .15 * Math.sin(s * 2)})`); p.addColorStop(1, 'rgba(255,220,120,0)'); g2.fillStyle = p; g2.fillRect(cx - 30, 0, 60, h * .6); }
      if (hk === 'silver') { g2.strokeStyle = 'rgba(238,241,246,.6)'; g2.lineWidth = 1; for (let i = 0; i < 50; i++) { const x = rnd(i, 6) * w, y = ((rnd(i, 7) * h + s * 60) % h); g2.beginPath(); g2.moveTo(x, y); g2.lineTo(x, y + 8); g2.stroke(); } }
    } else {
      // 1 朝もや
      for (let i = 0; i < 3; i++) { const y = h * (.7 + i * .06), m = g2.createLinearGradient(0, y - 20, 0, y + 20); m.addColorStop(0, 'rgba(200,210,220,0)'); m.addColorStop(.5, `rgba(200,210,220,${.10 + .03 * Math.sin(s * .5 + i)})`); m.addColorStop(1, 'rgba(200,210,220,0)'); g2.fillStyle = m; g2.fillRect(0, y - 20, w, 40); }
      const flower = (x, y, r, col) => { g2.strokeStyle = 'rgba(90,120,90,.8)'; g2.lineWidth = 1.2; g2.beginPath(); g2.moveTo(x, base); g2.lineTo(x, y); g2.stroke(); g2.fillStyle = col; for (let p = 0; p < 5; p++) { const a = p / 5 * 6.28 + s * .2; g2.beginPath(); g2.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * .8, 0, 6.28); g2.fill(); } g2.fillStyle = '#f6dc8e'; g2.beginPath(); g2.arc(x, y, r * .6, 0, 6.28); g2.fill(); };
      // 2 花一輪
      if (lv >= 2) flower(w * .5, base - 26, 5, 'rgba(238,241,246,.85)');
      // 3 花びらが舞う
      if (lv >= 3) for (let i = 0; i < 18; i++) { const x = ((rnd(i, 8) * w + s * (10 + i)) % (w + 20)) - 10, y = ((rnd(i, 9) * h + s * 14) % h); g2.save(); g2.translate(x, y); g2.rotate(s + i); g2.fillStyle = 'rgba(240,200,210,.7)'; g2.beginPath(); g2.ellipse(0, 0, 3, 1.6, 0, 0, 6.28); g2.fill(); g2.restore(); }
      // 4 小鳥が鳴く（枝にとまる小鳥と、音符の代わりの小さな光）
      if (lv >= 4) { g2.strokeStyle = 'rgba(60,50,40,.9)'; g2.lineWidth = 2; g2.beginPath(); g2.moveTo(w * .62, h * .42); g2.lineTo(w * .9, h * .38); g2.stroke(); for (let i = 0; i < 2; i++) { const x = w * (.7 + i * .1), y = h * .4 - i * 2; g2.fillStyle = 'rgba(40,36,34,.95)'; g2.beginPath(); g2.ellipse(x, y - 5, 6, 4.5, 0, 0, 6.28); g2.fill(); g2.beginPath(); g2.arc(x + 5, y - 9, 3, 0, 6.28); g2.fill(); g2.fillStyle = `rgba(230,207,154,${.5 + .5 * Math.sin(s * 3 + i)})`; g2.beginPath(); g2.arc(x + 9, y - 18 - 4 * Math.sin(s * 2 + i), 1.6, 0, 6.28); g2.fill(); } }
      // 5 庭いっぱいの花
      if (lv >= 5) for (let i = 0; i < 16; i++) flower(w * (.06 + i * .058), base - 10 - rnd(i, 10) * 18, 3 + rnd(i, 11) * 2, ['rgba(238,241,246,.85)', 'rgba(240,200,210,.85)', 'rgba(230,207,154,.85)'][i % 3]);
    }
  }

  // ---- 額縁（仮の絵は CSS。夜明け＝金の飾り、静かな朝＝木と銀。金の光・銀の光の子を飾ると箔で光る） ----
  function frameBox(f, size) {
    const leaf = f.id && (f.rar === 'gold' || f.rar === 'silver') ? (f.k === 'dawn' ? ' leaf-gold' : ' leaf-silver') + ' rar-' + f.rar : '';
    const th = f.id ? safeThumb(f.th) : '';
    return `<div class="frame f-${f.k}${leaf}${size ? ' ' + size : ''}${f.id ? '' : ' empty'}"><div class="win"${th ? ` style="background-image:url('${th}')"` : ''}>${f.id ? '' : esc(tr('nEmptyFrame'))}</div></div>`;
  }
  function plate(f) {
    const dawn = f.k === 'dawn', cls = f.id && (f.rar === 'gold' || f.rar === 'silver') ? ' ' + (f.rar === 'gold' ? 'g' : 's') : '';
    if (!f.id) return `<div class="plate"><div class="t">&nbsp;</div><div class="nm dim">${esc(tr('nNotYet'))}</div><div class="d">${esc(tr('nTapToPick'))}</div></div>`;
    return `<div class="plate${cls}"><div class="t">${esc(tr(dawn ? 'frameTitleDawn' : 'frameTitleQuiet'))}</div><div class="nm">${esc(txt(f.name))}</div><div class="d">${esc(tr(dawn ? 'framedAtDawn' : 'framedAtQuiet', { n: Number(f.n) || 1 }))}</div></div>`;
  }

  // ---- わたしの展示室（目録とは別の部屋）。飾った子と、まだ空いている額縁が並ぶ ----
  function openGallery() {
    const F = frames();
    $('wall').replaceChildren(...F.map((f, i) => {
      const d = document.createElement(f.id ? 'div' : 'button'); d.className = 'item';
      if (!f.id) { d.type = 'button'; d.onclick = () => openPicker(i, openGallery); }
      d.innerHTML = frameBox(f) + plate(f);
      return d;
    }));
    $('galleryEmpty').hidden = F.length > 0;
    $('gallery').hidden = false; sfx('pick');
  }
  $('galleryBtn').onclick = openGallery;
  $('galleryBtn2').onclick = openGallery;
  $('galleryClose').onclick = () => { $('gallery').hidden = true; sfx('un'); };

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
    $('pickPreview').innerHTML = frameBox({ k: f.k, id: M.id, rar, th: M.thumb });
    $('pickMsg').innerHTML = esc(tr('nConfirm', { name: txt(M.name), frame: tr(f.k === 'dawn' ? 'frameDawn' : 'frameQuiet') })) + '<br><span class="warn">' + esc(tr('nNoSwap')) + '</span>';
    $('pickConfirm').hidden = false;
    $('pickConfirm').scrollIntoView({ block: 'nearest' });
  }
  $('doFrame').onclick = () => {
    const R = loadRec(), F = Array.isArray(R.frames) ? R.frames : [], f = F[pickFor], M = pickSel;
    if (!f || f.id || !M) return; // もう飾ってある額縁は、はめかえない
    Object.assign(f, { id: M.id, name: M.name, rar: M.rarity === 'gold' || M.rarity === 'silver' ? M.rarity : 'normal', th: safeThumb(M.thumb) });
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
    $('picked').replaceChildren(...Array.from({ length: SIZE() }, (_, k) => {
      const d = document.createElement('div'); d.className = 'slot'; const i = dpick[k];
      if (i === undefined) { d.innerHTML = '<div class="empty">' + (k + 1) + '</div>'; return d; }
      const b = cardEl(ZK[i], { ace: i === aceI }); b.onclick = () => togglePick(i); d.append(b);
      const a = document.createElement('button'); a.type = 'button'; a.className = 'acebtn' + (i === aceI ? ' on' : ''); a.textContent = tr(i === aceI ? 'nAceOn' : 'nAceSet'); a.disabled = noAce;
      a.onclick = () => { aceI = aceI === i ? -1 : i; sfx('pick'); drawDeck(); }; d.append(a);
      return d;
    }));
    $('guards').replaceChildren(...(GUARDS.length ? GUARDS.map((g, k) => {
      const d = document.createElement('div'); d.className = 'gk';
      d.innerHTML = `<div class="gm" style="background:${g.map}"></div><div class="gn">${esc(g.n)}<small>${esc(tr('nGuardSub'))}</small></div>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = k === guardI ? 'on' : ''; b.textContent = tr(k === guardI ? 'nGuardOn' : 'nGuardSet');
      b.onclick = () => { guardI = guardI === k ? -1 : k; sfx('pick'); drawDeck(); }; d.append(b);
      return d;
    }) : [Object.assign(document.createElement('div'), { className: 'note', textContent: tr('nNoGuard') })]));
    const t = sum6(), over = t > CAP;
    $('msumLbl').textContent = tr(noAce ? 'nSumAll' : 'nSum');
    $('msum').textContent = t; $('mcap').textContent = CAP; $('mbar').style.width = Math.min(100, t / CAP * 100) + '%';
    $('meter').classList.toggle('bad', over); $('mline').classList.toggle('bad', over);
    $('dmsg').classList.toggle('warn', over || (noAce && dpick.length < SIZE()));
    $('dmsg').textContent = dpick.length < SIZE() ? (noAce ? tr('nNoAceNow') + '　' : '') + tr('nLeft', { n: SIZE() - dpick.length })
      : over ? tr(noAce ? 'nOverNoAce' : 'nOver', { n: t - CAP }) : aceI < 0 && !noAce ? tr('nReadyNoAce') : tr('nReady');
    $('tonight').disabled = dpick.length < SIZE() || over;
    $('auto').disabled = ZK.length < 7;
  }
  function togglePick(i) {
    const k = dpick.indexOf(i);
    if (k >= 0) { dpick.splice(k, 1); if (aceI === i) aceI = -1; sfx('un'); }
    else if (dpick.length < SIZE()) { dpick.push(i); sfx('pick'); }
    else { sfx('no'); return; }
    drawDeck();
  }
  // おまかせ：いちばん輝きの大きい子を★主に、残りから合計が上限にいちばん近い6体（★主を置けないときは6体だけ）
  function autoPick() {
    const idx = ZK.map((_, i) => i);
    const ace = noAce ? -1 : idx.reduce((a, b) => ZK[a].p > ZK[b].p ? a : b);
    const rest = idx.filter(i => i !== ace);
    let best = null, bv = -1;
    for (let k = 0; k < 3000; k++) {
      const r = [...rest].sort(() => Math.random() - .5).slice(0, 6), v = r.reduce((a, i) => a + ZK[i].p, 0);
      if (v <= CAP && v > bv) { bv = v; best = r; }
    }
    if (!best) best = [...rest].sort((a, b) => ZK[a].p - ZK[b].p).slice(0, 6); // どう組んでも超えるときは小さい順（メーターが赤くなる）
    dpick = ace >= 0 ? [ace, ...best] : best; aceI = ace; sfx('back'); drawDeck();
  }
  $('auto').onclick = autoPick;
  $('trial').onclick = () => { trial = true; dpick = []; aceI = -1; ZK = trialSet(); sfx('pick'); drawDeck(); };
  $('tonight').onclick = () => {
    HAND = dpick.map(i => Object.assign({}, ZK[i], { used: false, ace: i === aceI }));
    ROOM = tonight(new Date(), HAND.some(isRare)); sel = []; cur = -1; aceBack = false; busy = false; ended = false; endArm = false; hikariLit = null;
    const g = GUARDS[guardI]; witness = g ? g.n : null;
    $('witness').innerHTML = witness ? esc(tr('nWitness', { name: '' })) + `<b>${esc(witness)}</b>` : esc(tr('nNoWitness'));
    $('trialNote').hidden = !trial;
    $('deck').hidden = true; draw(); glowUp(); sfx('send'); track('night_start');
    // ★主なしの夜は、この1夜で終わり
    if (noAce) { const R = loadRec(); R.noAce = false; saveRec(R); noAce = false; }
  };

  // ---- 背景：紺の闇に、金の灯りの粒がただよう。灯った部屋が増えるほど、粒が増えて明るくなる ----
  const cv = $('bg'), g = cv.getContext('2d');
  let W, H; const DPR = Math.min(2, devicePixelRatio || 1);
  function rs() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }
  rs(); addEventListener('resize', rs);
  const motes = Array.from({ length: 90 }, (_, i) => ({ x: Math.random(), y: Math.random(), v: .00008 + Math.random() * .00022, r: .6 + Math.random() * 1.8, ph: Math.random() * 6.28, k: i }));
  let sparks = [], glow = 0, glowTo = 0;
  function glowUp() { const N = normals(); glowTo = N.length ? N.filter(R => R.lit).length / N.length : 0; }
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

  // ---- 音：すべてその場で合成（音のファイルを使わない）。鈴と、弾むオルゴール ----
  let ac = null, on = false, master, bgmGain, noise, timer = null, nextT = 0, step = 0;
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = .8; master.connect(comp);
    bgmGain = ac.createGain(); bgmGain.gain.value = .5; bgmGain.connect(master);
    noise = ac.createBuffer(1, ac.sampleRate * .1, ac.sampleRate);
    const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // 鈴：倍音を少しずらした正弦波を重ね、長く消えていく
  function bell(f, t, d = 2.2, v = .18, dest = master) {
    [[1, 1], [2.76, .35], [5.4, .12]].forEach(([m, a]) => {
      const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.value = f * m;
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v * a, t + .01); e.gain.exponentialRampToValueAtTime(.0001, t + d / m);
      o.connect(e); e.connect(dest); o.start(t); o.stop(t + d + .05);
    });
  }
  // 弦：やわらかい三角波を2本、ゆっくり立ち上げる
  function pad(f, t, d, v = .05, dest = bgmGain) {
    const e = ac.createGain(); e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + d * .4); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    [-5, 5].forEach(dt => { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; o.detune.value = dt; o.connect(e); o.start(t); o.stop(t + d + .05); });
    e.connect(dest);
  }
  // 弾む音：短く消える音（ベース）と、ささやかなシェイカー（雑音を短く）
  function pluck(f, t, d = .35, v = .12, dest = bgmGain) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'triangle'; o.frequency.value = f;
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .008); e.gain.exponentialRampToValueAtTime(.0001, t + d);
    o.connect(e); e.connect(dest); o.start(t); o.stop(t + d + .05);
  }
  function shaker(t, v = .025) {
    const s = ac.createBufferSource(), f = ac.createBiquadFilter(), e = ac.createGain();
    s.buffer = noise; f.type = 'highpass'; f.frequency.value = 6000;
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.0001, t + .06);
    s.connect(f); f.connect(e); e.connect(bgmGain); s.start(t); s.stop(t + .08);
  }
  // BGM：ニ長調の I–V–vi–IV を、8分音符（0.3 秒）のオルゴールの分散和音で。ベースは 3+3+2 で弾ませ、
  //      4小節おきに上でメロディを重ねる（毎回くじで選ばず、決まった節にして口ずさめるように）
  const CH = [{ b: 38, t: [62, 66, 69] }, { b: 45, t: [61, 64, 69] }, { b: 47, t: [62, 66, 71] }, { b: 43, t: [62, 67, 71] }];
  const ARP = [0, 1, 2, 3, 2, 1, 2, 3];
  const MEL = [[[0, 81], [2, 78], [4, 81], [6, 83]], [[0, 85], [3, 81], [6, 78]], [[0, 83], [2, 86], [4, 85], [6, 83]], [[0, 81], [3, 79], [4, 78], [6, 76]]];
  function sched() {
    while (nextT < ac.currentTime + .2) {
      const t = nextT, i = step % 8, barN = Math.floor(step / 8), bar = barN % 4, c = CH[bar];
      if (i === 0) pad(N(c.t[0] - 12), t, 2.6, .025);
      const a = ARP[i]; bell(N(a === 3 ? c.t[0] + 12 : c.t[a]), t, 1.2, .045, bgmGain);
      if (i === 0 || i === 3 || i === 6) pluck(N(c.b), t, .32, .1);
      if (i % 2 === 1) shaker(t);
      if (Math.floor(barN / 4) % 2 === 1) MEL[bar].forEach(([s, n]) => { if (s === i) bell(N(n), t, 1.8, .075, bgmGain); });
      nextT += .3; step++;
    }
  }
  function bgm(play) { if (play) { nextT = ac.currentTime + .05; step = 0; timer = setInterval(sched, 60); } else { clearInterval(timer); timer = null; } }
  function sfx(k) {
    if (!on || !ac) return;
    const t = ac.currentTime;
    const S = {
      pick: () => bell(N(86), t, .8, .1),
      un: () => bell(N(79), t, .6, .07),
      no: () => bell(N(55), t, .5, .12),
      send: () => [74, 79, 83].forEach((n, i) => bell(N(n), t + i * .12, 1.6, .1)),
      light: () => { [62, 69, 74, 78, 81, 86].forEach((n, i) => bell(N(n), t + i * .09, 2.6, .13)); pad(N(50), t, 3, .08, master); pad(N(57), t, 3, .06, master); },
      back: () => [81, 86].forEach((n, i) => bell(N(n), t + i * .18, 1.6, .12)),
      dawn: () => { [62, 66, 69, 74, 78, 81, 86, 90].forEach((n, i) => bell(N(n), t + i * .14, 3.2, .13)); [50, 57, 62, 66].forEach(n => pad(N(n), t, 5, .07, master)); },
      quiet: () => { [69, 74, 76].forEach((n, i) => bell(N(n), t + i * .3, 2.8, .1)); [45, 52, 57].forEach(n => pad(N(n), t, 4.5, .06, master)); },
      thanks: () => [[86, 0], [90, .25], [93, .5], [98, .75]].forEach(([n, d]) => bell(N(n), t + d, 2.4, .1))
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
    GUARDS = all.filter(isHuman).map(M => ({ n: txt(M.name), map: lifeGrad(M) })); guardI = GUARDS.length ? 0 : -1;
    noAce = !!loadRec().noAce;
    $('intro').hidden = true; $('deck').hidden = false; drawDeck(); sfx('pick');
  };
})();
