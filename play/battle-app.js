// battle-app.js — モンスター対戦（battle.html）のプログラム。play/ と各言語の play/ でバイト同一に保つ。
// 図鑑（IndexedDB の dropper-monster）は読むだけ。書き換えない。対戦の記録は localStorage（この端末の中だけ）。
// ルールの考え方は保管庫のノート（カードゲーム 04_ルールまとめ）。合体の法則は monster-app.js の fusionRules と同じ数字。
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const tr = (k, v) => window.t(k, v), D = k => window.tdata(k);
  // 文の仕様（monster-app.js の txt と同じ）。図鑑のカードの名前は「辞書のどの言葉か」で入っているので、見ているページの言語で組み立てる
  function txt(s) {
    if (s === undefined || s === null) return '';
    if (typeof s !== 'object') return String(s);
    if (Array.isArray(s)) return s.map(txt).join('');
    if (s.cat) return s.cat.map(txt).join('');
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
  // 図鑑の名前に、ページへの仕掛けが混ぜられていても文字として出す
  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const safeThumb = s => (typeof s === 'string' && /^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(s) ? s : '');
  function track(name) { try { if (typeof gtag === 'function') gtag('event', name); } catch (e) { /* 計測が止められていても遊べる */ } }

  // ---- 言葉を画面に入れる（monster-i18n.js の applyI18n は図鑑のページの題を入れるので使わない） ----
  function applyDom() {
    document.title = tr('bPageTitle');
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const k = el.getAttribute('data-i18n');
      if (el.hasAttribute('data-i18n-html')) el.innerHTML = tr(k); else el.textContent = tr(k);
    });
    document.documentElement.classList.add('i18n-ready');
  }

  // ---- 属性と合体の法則（monster-app.js と同じ） ----
  const TY = {
    '炎': ['🔥', '#ff7a45', '#d9361b'], '水': ['💧', '#4aa8ff', '#1f5fd6'], '森': ['🌿', '#46c47a', '#1d8a4c'], '雷': ['⚡', '#ffd23a', '#e09a00'], '土': ['🪨', '#c08a5a', '#7a4f2a'],
    '風': ['🌀', '#5fd3d3', '#22928f'], '夢': ['🌸', '#ff8ad1', '#c2479a'], '闇': ['🌙', '#7b6bd6', '#3b2f8f'], '光': ['✨', '#ffe28a', '#f0b429'], '鋼': ['⚙️', '#9aa7b8', '#5b6778']
  };
  const TYPES = Object.keys(TY);
  const grad = t => `linear-gradient(${TY[t][1]},${TY[t][2]})`;
  const PAIRS = [['炎', '風'], ['水', '森'], ['雷', '水'], ['土', '森'], ['光', '闇'], ['夢', '光'], ['鋼', '雷'], ['闇', '夢'], ['土', '炎'], ['風', '水']];
  const CLASH = [['炎', '水'], ['炎', '森'], ['雷', '土']];
  const RARE = { gold: ['GOLD', 0.25], silver: ['SILVER', 0.10] };
  const isPair = (a, b, x, y) => (a === x && b === y) || (a === y && b === x);
  // 法則は [見出し（文の仕様）, 倍率]。1枚だけなら法則なし（パワーそのまま）
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
      if (n) out.push([{ k: 'ruleRare', v: { label: RARE[r][0], n } }, RARE[r][1] * n]);
    }
    const bugs = cs.filter(c => c.bug).length;
    if (bugs) out.push([{ k: 'ruleBug', v: { n: bugs } }, 0.08 * bugs]);
    return out;
  }
  function power(cs) {
    const r = rules(cs), sum = cs.reduce((a, c) => a + c.p, 0), m = 1 + r.reduce((a, x) => a + x[1], 0);
    return { sum, m, v: Math.round(sum * m), spd: cs.reduce((a, c) => a + c.s, 0), r };
  }
  const pct = v => (v >= 0 ? '+' : '−') + Math.round(Math.abs(v) * 100) + '%';
  const chips = P => P.r.map(x => `<span class="chip${x[1] < 0 ? ' neg' : ''}">${esc(txt(x[0]))} ${pct(x[1])}</span>`).join('');

  // ---- 図鑑を読む（monster-app.js と同じ作り。無ければ同じ形で作る） ----
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
  // 戦うカードの形：t 属性・n 名前・p パワー・s すばやさ・th 小さな絵
  function fighter(M) {
    return {
      id: M.id, t: TY[M.type] ? M.type : '鋼', n: txt(M.name), p: Math.round(Number(M.power) || 0), s: Math.round(Number((M.stats || {})['すばやさ']) || 0),
      th: safeThumb(M.thumb), rarity: M.rarity, bug: !!M.bug, fusion: Number(M.fusion) || 0, ai: !!(M.aiBoost || M.strong)
    };
  }
  // 守り神の色：その人の人生地図の丘の色（monster-app.js の drawLife と同じ式）を5つ拾う
  function lifeGrad(M, deg) {
    const joy = [...String((M.life || {}).joy || '5')].map(Number).filter(x => !isNaN(x));
    const at = f => { const v = (joy[Math.min(joy.length - 1, Math.floor(f * joy.length))] || 0) / 9; return `hsl(${Math.round(30 + v * 105)},${Math.round(22 + v * 58)}%,${Math.round(46 + v * 12)}%)`; };
    return `linear-gradient(${deg},${[0, .25, .5, .75, .99].map(at).join(',')})`;
  }
  function guardOf(M) { return { n: txt(M.name), map: lifeGrad(M, '90deg'), seal: lifeGrad(M, '135deg') }; }

  // ---- あいて（コンピューター）とおためしのカード ----
  // 名前は図鑑のページと同じ音の表から組む。カードの絵は無いので、属性の色と印で描く
  function randName(t, r) {
    const syl = D('syl')[t] || D('syl')['鋼'], mid = D('mid'), tail = D('tail');
    return txt({ cat: [{ d: 'syl', p: [t, Math.floor(r() * syl.length)] }, { d: 'mid', p: [Math.floor(r() * mid.length)] }, { d: 'tail', p: [Math.floor(r() * tail.length)] }] });
  }
  // 6枚の合計が total くらい、エースが ace くらいになる7枚
  function makeSet(total, ace) {
    const r = Math.random, out = [];
    const ws = Array.from({ length: 6 }, () => 0.75 + r() * 0.5), wsum = ws.reduce((a, b) => a + b, 0);
    ws.forEach(w => { const t = TYPES[Math.floor(r() * TYPES.length)]; out.push({ t, n: randName(t, r), p: Math.max(60, Math.round(total * w / wsum)), s: 30 + Math.floor(r() * 60) }); });
    const t = TYPES[Math.floor(r() * TYPES.length)];
    out.splice(Math.floor(r() * 7), 0, { t, n: randName(t, r), p: Math.round(ace), s: 40 + Math.floor(r() * 50), ace: true });
    let over = out.filter(c => !c.ace).reduce((a, c) => a + c.p, 0) - CAP;
    for (const c of out) if (over > 0 && !c.ace) { const d = Math.min(over, c.p - 60); c.p -= d; over -= d; }
    return out.map(c => Object.assign({ used: false, rarity: 'normal', bug: false }, c));
  }

  // ---- 対戦の記録（この端末の中だけ） ----
  // { noAce: 次の1戦はエースなし, chain: 最後の記録の指紋, n: 対戦の回数 }。読めない画面でも遊べる
  const STORE = 'dropper-monster-battle';
  function loadRec() { try { return JSON.parse(localStorage.getItem(STORE)) || {}; } catch (e) { return {}; } }
  function saveRec(x) { try { localStorage.setItem(STORE, JSON.stringify(x)); } catch (e) { /* 残せなくても遊べる */ } }
  async function hashOf(s) {
    try { const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join(''); }
    catch (e) { return (Math.random() * 1e16).toString(16); }
  }
  const salt = () => { const a = new Uint32Array(2); crypto.getRandomValues(a); return [...a].map(v => v.toString(16)).join(''); };

  // ---- 状態 ----
  // エース以外の6枚の合計の上限（エースを置けない1戦は、6枚だけで戦う）。本物のカードはふつう1枚200〜290なので1500（見本の1300から上げた）
  const CAP = 1500;
  let ZK = [], GUARDS = [], trial = false, noAce = false;
  let dpick = [], aceI = -1, guardI = 0;
  const SIZE = () => noAce ? 6 : 7; // エースを置けない1戦は、エースの枠が空いたまま6枚で戦う
  let outNote = '', ME = [], OP = [], MYSEAL = 'linear-gradient(135deg,#ccc,#999)', sel = [], w = [0, 0], round = 1, log = [], busy = false;
  const OPSEAL = 'linear-gradient(135deg,#f6a57a,#e76f51)';
  const wait = ms => new Promise(r => setTimeout(r, ms));

  function cardEl(c, i, mine, inField) {
    const b = document.createElement('button'); b.type = 'button';
    b.className = 'c' + (c.th ? ' th' : '') + (c.used && !inField ? ' used' : '') + (c.ace ? ' ace' : '') + (mine && sel.includes(i) ? ' sel' : '');
    b.style.setProperty('--tc', grad(c.t));
    b.innerHTML = c.th ? `<img src="${c.th}" alt=""><span class="p">${c.p}</span>` : `<span class="i">${TY[c.t][0]}</span><span class="n">${esc(c.n)}</span><span class="p">${c.p}</span>`;
    b.setAttribute('aria-label', `${txt({ ty: c.t })} ${c.n} ${tr('bPower')} ${c.p}${c.ace ? ' ' + tr('bAce') : ''}`);
    if (mine) b.onclick = () => pick(i); else b.tabIndex = -1;
    return b;
  }
  const wins = n => [0, 1, 2].map(k => `<i class="${k < n ? 'on' : ''}">●</i>`).join('');
  function draw() {
    $('oh').replaceChildren(...OP.map((c, i) => cardEl(c, i, false)));
    $('mh').replaceChildren(...ME.map((c, i) => cardEl(c, i, true)));
    $('ow').innerHTML = wins(w[1]); $('mw').innerHTML = wins(w[0]); $('rnd').textContent = tr('bRound', { n: round });
    const cs = sel.map(i => ME[i]);
    if (cs.length) {
      const P = power(cs);
      $('pv').innerHTML = chips(P) + `<span>${P.sum}${P.m !== 1 ? ' × ' + P.m.toFixed(2) : ''} ＝</span><b>${P.v}</b><span style="color:var(--dim)">${esc(tr('bSpd', { n: P.spd }))}</span>`;
    } else $('pv').innerHTML = `<span style="color:var(--dim)">${esc(tr('bPvEmpty'))}</span>`;
    $('go').disabled = !cs.length || busy; $('go').textContent = cs.length ? tr('bGoN', { n: cs.length }) : tr('bGo');
  }
  function pick(i) {
    if (busy || ME[i].used) return;
    const k = sel.indexOf(i);
    if (k >= 0) { sel.splice(k, 1); sfx('un'); } else if (sel.length < 3) { sel.push(i); sfx('pick'); } else { sfx('no'); return; }
    draw();
  }
  // あいての出し方：ときどき（4回に1回）いちばん弱い1枚で負けにいく。ほかは枚数を決めて、その枚数でいちばん強い組
  function oppChoose() {
    const idx = OP.map((c, i) => i).filter(i => !OP[i].used);
    if (Math.random() < .25 && idx.length > 1) return [idx.reduce((a, b) => OP[a].p < OP[b].p ? a : b)];
    // 手札が尽きないように、あと何回かは出せる枚数を残す（どちらかが3勝するまでの、いちばん少ない回数）
    const keep = Math.max(0, Math.min(3 - w[0], 3 - w[1]) - 1);
    const n = Math.max(1, Math.min(idx.length - keep, 1 + Math.floor(Math.random() * 3)));
    let best = null, bv = -1;
    const combos = (st, cur) => {
      if (cur.length === n) { const v = power(cur.map(i => OP[i])).v; if (v > bv) { bv = v; best = [...cur]; } return; }
      for (let j = st; j < idx.length; j++) combos(j + 1, [...cur, idx[j]]);
    };
    combos(0, []);
    return best;
  }
  const short = h => h.slice(0, 8);
  $('go').onclick = async () => {
    if (busy || !sel.length) return;
    busy = true;
    const mine = sel.map(i => ME[i]), oi = oppChoose(), theirs = oi.map(i => OP[i]);
    // 約束：出すカードと秘密の数の指紋を、開く前に見せる（開いたあとで同じ指紋になるか確かめられる）
    const s1 = salt(), s2 = salt();
    const h1 = await hashOf(round + ':' + mine.map(c => c.id || c.n).join(',') + ':' + s1), h2 = await hashOf(round + ':' + theirs.map(c => c.n).join(',') + ':' + s2);
    sfx('seal'); burst(.5, .72, '#8a3dff');
    $('oz').classList.remove('last'); $('mz').classList.remove('last'); $('oz').innerHTML = '';
    $('mz').innerHTML = `<div class="fback" style="--sealc:${MYSEAL}"><b>🔒</b></div>`;
    $('mid').innerHTML = tr('bSealed', { h: `<span class="hash">${short(h1)}</span>` });
    sel.forEach(i => { ME[i].used = true; }); sel = []; draw(); await wait(900);
    $('oz').innerHTML = `<div class="fback" style="--sealc:${OPSEAL}"><b>🔒</b></div>`; sfx('seal');
    $('mid').innerHTML = tr('bOppSealed', { name: esc(tr('bOppName')), h: `<span class="hash">${short(h2)}</span>` }); await wait(1100);
    oi.forEach(i => { OP[i].used = true; });
    const A = power(mine), B = power(theirs);
    const res = A.v > B.v ? 1 : A.v < B.v ? -1 : (A.spd > B.spd ? 1 : A.spd < B.spd ? -1 : 0);
    await revealScene(mine, theirs, A, B, res);
    $('oz').replaceChildren(...theirs.map(c => cardEl(c, 0, false, true)));
    $('mz').replaceChildren(...mine.map(c => cardEl(c, 0, false, true)));
    if (res > 0) w[0]++; else if (res < 0) w[1]++;
    $('mid').innerHTML = `<div class="verdict ${res > 0 ? 'win' : res < 0 ? 'lose' : 'draw'}">${esc(tr(res > 0 ? 'bWin' : res < 0 ? 'bLose' : 'bDraw'))}</div><span class="score">${A.v} − ${B.v}</span>${A.v === B.v ? '<br>' + esc(tr('bBySpd')) : ''}`;
    log.push({ r: round, m: mine, A, t: theirs, B, x: res, h: h1 });
    $('ow').innerHTML = wins(w[1]); $('mw').innerHTML = wins(w[0]); drawHist();
    await wait(900); round++;
    const leftM = ME.filter(c => !c.used).length, leftO = OP.filter(c => !c.used).length;
    if (w[0] >= 3 || w[1] >= 3 || !leftM || !leftO) {
      // 片方だけ手札が無くなったら、残りの回はもう片方の勝ち（1回に1枚は出すので、残りの枚数まで）
      if (w[0] < 3 && w[1] < 3) {
        if (!leftM && leftO) { w[1] = Math.min(3, w[1] + leftO); outNote = tr('bOutMe'); }
        else if (!leftO && leftM) { w[0] = Math.min(3, w[0] + leftM); outNote = tr('bOutOpp', { name: tr('bOppName') }); }
      }
      end(); return;
    }
    $('oz').classList.add('last'); $('mz').classList.add('last'); $('mid').innerHTML = waitMsg(); busy = false; draw();
  };

  // ---- カードを開く場面：2人のカードだけを大きく映す。ドラムロール → ジャジャーンで開く。タップするまで進まない ----
  function bigCard(c) {
    const d = document.createElement('div'); d.className = 'bc pop' + (c.th ? ' th' : '') + (c.ace ? ' ace' : ''); d.style.setProperty('--tc', grad(c.t));
    d.innerHTML = c.th ? `<img src="${c.th}" alt="${esc(c.n)}"><span class="bp">${c.p}</span>` : `<span class="bi">${TY[c.t][0]}</span><span class="bn">${esc(c.n)}</span><span class="bp">${c.p}</span>`;
    return d;
  }
  function bigBack(seal) { const d = document.createElement('div'); d.className = 'bc bk'; d.style.setProperty('--sealc', seal); d.innerHTML = '<b>🔒</b>'; return d; }
  const sumHtml = P => chips(P) + `<b>${P.v}</b>`;
  async function revealScene(mine, theirs, A, B, res) {
    const rv = $('rv');
    $('rvso').innerHTML = ''; $('rvsm').innerHTML = ''; $('vs').className = 'vs'; $('vs').textContent = 'VS';
    // 枚数は開くまで分からないので、伏せた束は1つずつ見せる
    $('rvo').replaceChildren(bigBack(OPSEAL)); $('rvm').replaceChildren(bigBack(MYSEAL));
    rv.hidden = false; sfx('drumroll'); await wait(1900);
    sfx('jajan'); rv.insertAdjacentHTML('beforeend', '<div class="flash"></div>'); setTimeout(() => { const f = rv.querySelector('.flash'); if (f) f.remove(); }, 600);
    $('rvo').replaceChildren(...theirs.map(bigCard)); $('rvm').replaceChildren(...mine.map(bigCard));
    await wait(1600); $('rvso').innerHTML = sumHtml(B); $('rvsm').innerHTML = sumHtml(A); sfx('pick');
    await wait(1600);
    $('vs').className = 'rvres ' + (res > 0 ? 'win' : res < 0 ? 'lose' : 'draw'); $('vs').textContent = tr(res > 0 ? 'bWin' : res < 0 ? 'bLose' : 'bDraw');
    sfx(res > 0 ? 'win' : res < 0 ? 'lose' : 'draw');
    $('rvtap').hidden = false;
    await new Promise(r => {
      const done = e => { if (e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return; rv.removeEventListener('click', done); removeEventListener('keydown', done); r(); };
      setTimeout(() => { rv.addEventListener('click', done); addEventListener('keydown', done); }, 400);
    });
    $('rvtap').hidden = true; rv.hidden = true; if (res > 0) burst(.5, .5, '#ffd23a', 70);
  }
  // これまでの結果：各回の勝ち負けと強さを、手札の上に並べて残す
  function drawHist() {
    const h = $('hist');
    if (!log.length) { h.textContent = tr('bHistNone'); return; }
    h.innerHTML = esc(tr('bHist')) + log.map(L => `<span class="h ${L.x > 0 ? 'win' : L.x < 0 ? 'lose' : ''}">${esc(tr('bRound', { n: L.r }))} ${esc(tr(L.x > 0 ? 'bHWin' : L.x < 0 ? 'bHLose' : 'bHDraw'))} <b>${L.A.v}−${L.B.v}</b> ${L.m.map(c => TY[c.t][0]).join('')}</span>`).join('');
  }
  const waitMsg = () => `<div class="midscore"><small>${esc(tr('bYou'))}</small>${w[0]} − ${w[1]}<small>${esc(tr('bOppName'))}</small></div>${esc(tr('bPick', { n: round }))}${log.length ? '<br><span style="font-size:10px">' + esc(tr('bFaded')) + '</span>' : ''}`;

  // ---- 7枚えらぶ ----
  const sum6 = () => dpick.filter(i => i !== aceI).reduce((a, i) => a + ZK[i].p, 0);
  function tagOf(c) {
    const T = D('bTag') || {};
    if (c.rarity === 'gold') return ['gold', T.gold]; if (c.rarity === 'silver') return ['silver', T.silver];
    if (c.bug) return ['bug', T.bug]; if (c.fusion) return ['fuse', T.fuse]; if (c.ai) return ['ai', T.ai];
    return null;
  }
  function drawDeck() {
    const few = ZK.length < 7;
    $('few').hidden = !few; $('zukan').hidden = few;
    if (few) $('fewMsg').textContent = tr('bFew', { n: ZK.length });
    $('zukan').replaceChildren(...ZK.map((c, i) => {
      const d = document.createElement('div'); d.className = 'zc' + (dpick.includes(i) ? ' on' : ''); d.dataset.n = dpick.indexOf(i) + 1;
      const b = cardEl({ ...c, used: false, ace: i === aceI }, i, false, true); b.tabIndex = 0; b.style.cursor = 'pointer'; b.onclick = () => togglePick(i); d.append(b);
      const tg = tagOf(c); if (tg) { const s = document.createElement('span'); s.className = 'tag ' + tg[0]; s.textContent = tg[1]; d.append(s); }
      return d;
    }));
    $('picked').replaceChildren(...Array.from({ length: SIZE() }, (_, k) => {
      const d = document.createElement('div'); d.className = 'slot7'; const i = dpick[k];
      if (i === undefined) { d.innerHTML = '<div class="empty">' + (k + 1) + '</div>'; return d; }
      const b = cardEl({ ...ZK[i], used: false, ace: i === aceI }, i, false, true); b.tabIndex = 0; b.style.cursor = 'pointer'; b.onclick = () => togglePick(i); d.append(b);
      const a = document.createElement('button'); a.type = 'button'; a.className = 'acebtn' + (i === aceI ? ' on' : ''); a.textContent = tr(i === aceI ? 'bAceOn' : 'bAceSet'); a.disabled = noAce;
      a.onclick = () => { aceI = aceI === i ? -1 : i; sfx('pick'); drawDeck(); }; d.append(a);
      return d;
    }));
    $('guards').replaceChildren(...(GUARDS.length ? GUARDS.map((g, k) => {
      const d = document.createElement('div'); d.className = 'gk';
      d.innerHTML = `<div class="gm" style="background:${g.map}"></div><div class="gn">${esc(g.n)}<small>${esc(tr('bGuardSub'))}</small></div>`;
      const b = document.createElement('button'); b.type = 'button'; b.className = k === guardI ? 'on' : ''; b.textContent = tr(k === guardI ? 'bGuardOn' : 'bGuardSet');
      b.onclick = () => { guardI = guardI === k ? -1 : k; sfx('pick'); drawDeck(); }; d.append(b);
      return d;
    }) : [Object.assign(document.createElement('div'), { className: 'note', textContent: tr('bNoGuard') })]));
    const t = sum6(), over = t > CAP;
    $('msumLbl').textContent = tr(noAce ? 'bSumAll' : 'bSum');
    $('picked').style.gridTemplateColumns = `repeat(${SIZE()},1fr)`;
    $('msum').textContent = t; $('mcap').textContent = CAP; $('mbar').style.width = Math.min(100, t / CAP * 100) + '%';
    $('meter').classList.toggle('bad', over); $('mline').classList.toggle('bad', over);
    $('dmsg').classList.toggle('warn', over || (noAce && dpick.length < SIZE()));
    $('dmsg').textContent = dpick.length < SIZE() ? (noAce ? tr('bNoAceNow') + '　' : '') + tr('bLeft', { n: SIZE() - dpick.length })
      : over ? tr(noAce ? 'bOverNoAce' : 'bOver', { n: t - CAP }) : aceI < 0 ? tr(noAce ? 'bReady' : 'bReadyNoAce') : tr('bReady');
    $('todeck').disabled = dpick.length < SIZE() || over;
    $('auto').disabled = ZK.length < 7;
  }
  function togglePick(i) {
    const k = dpick.indexOf(i);
    if (k >= 0) { dpick.splice(k, 1); if (aceI === i) aceI = -1; sfx('un'); }
    else if (dpick.length < SIZE()) { dpick.push(i); sfx('pick'); }
    else { sfx('no'); return; }
    drawDeck();
  }
  // おまかせ：いちばん強いカードをエースに、残りから合計が上限にいちばん近い6枚（エースを置けないときは6枚だけ）
  function autoPick() {
    const idx = ZK.map((_, i) => i);
    const ace = noAce ? -1 : idx.reduce((a, b) => ZK[a].p > ZK[b].p ? a : b);
    const rest = idx.filter(i => i !== ace), n = 6;
    let best = null, bv = -1;
    for (let k = 0; k < 3000; k++) {
      const r = [...rest].sort(() => Math.random() - .5).slice(0, n), v = r.reduce((a, i) => a + ZK[i].p, 0);
      if (v <= CAP && v > bv) { bv = v; best = r; }
    }
    if (!best) best = [...rest].sort((a, b) => ZK[a].p - ZK[b].p).slice(0, n); // どう組んでも超えるときは弱い順（メーターが赤くなる）
    dpick = ace >= 0 ? [ace, ...best] : best; aceI = ace; sfx('reveal'); drawDeck();
  }
  $('auto').onclick = autoPick;
  $('trial').onclick = () => {
    trial = true; dpick = []; aceI = -1;
    ZK = [...makeSet(CAP - 150, 380), ...makeSet(CAP - 400, 300).slice(0, 5)].map(c => Object.assign(c, { ace: false })).sort((a, b) => b.p - a.p);
    sfx('pick'); drawDeck();
  };
  $('todeck').onclick = () => {
    ME = dpick.map(i => ({ ...ZK[i], used: false, ace: i === aceI }));
    // あいての強さ：あなたの6枚の合計とエースに合わせる（少しだけ揺らす）
    const six = ME.filter(c => !c.ace).reduce((a, c) => a + c.p, 0), acep = (ME.find(c => c.ace) || {}).p || 0;
    OP = makeSet(Math.min(CAP, Math.round(six * (0.94 + Math.random() * 0.1))), acep ? acep * (0.9 + Math.random() * 0.2) : Math.max(...ME.map(c => c.p)) * 0.9);
    const g = GUARDS[guardI];
    $('myguard').textContent = g ? tr('bWitness', { name: g.n }) : tr('bNoWitness');
    MYSEAL = g ? g.seal : 'linear-gradient(135deg,#ccc,#999)'; $('myseal').style.setProperty('--sealc', MYSEAL);
    $('trialNote').hidden = !trial;
    $('deck').hidden = true; sel = []; w = [0, 0]; round = 1; log = []; busy = false; outNote = '';
    $('oz').innerHTML = ''; $('mz').innerHTML = ''; $('oz').classList.remove('last'); $('mz').classList.remove('last');
    $('mid').innerHTML = waitMsg(); drawHist(); draw(); sfx('seal'); track('battle_start');
    // エースなしの罰は、この1戦で終わり
    if (noAce) { const R = loadRec(); R.noAce = false; saveRec(R); noAce = false; }
  };

  // ---- 終わり：結果と、あいての守り神へのお礼 ----
  async function end() {
    const youWin = w[0] > w[1];
    sfx(youWin ? 'fanfare' : 'lose'); if (youWin) burst(.5, .3, '#ffd23a', 120);
    track('battle_end');
    const opp = esc(tr('bOppName')), og = esc(tr('bOppGuard'));
    const L = log.map(x => `<div><span>${esc(tr('bRound', { n: x.r }))} ${x.m.map(c => TY[c.t][0]).join('')} ${x.A.v}</span><span>${x.t.map(c => TY[c.t][0]).join('')} ${x.B.v} <b>${esc(tr(x.x > 0 ? 'bRowWin' : x.x < 0 ? 'bRowLose' : 'bRowDraw'))}</b></span></div>`).join('');
    $('sheet').innerHTML = `<div class="big" style="color:${youWin ? 'var(--gold)' : 'var(--ink)'}">${youWin ? esc(tr('bYouWin')) : w[0] < w[1] ? esc(tr('bOppWin', { name: tr('bOppName') })) : esc(tr('bEven'))}</div><div class="score">${w[0]} − ${w[1]}</div>
     <div class="log">${L}</div>${outNote ? `<div class="warn">${esc(outNote)}</div>` : ''}<div class="lbl">${esc(tr('bOppGuardLbl'))}</div>
     <div class="gcard"><div class="map"></div><div class="nm">${og}</div><div class="sub">${esc(tr('bWatched'))}</div></div>
     <button class="btn thanks" id="ty" type="button">${tr('bThanks', { name: og })}</button>
     <div class="warn" id="warn">${tr('bWarn')}</div>
     <button class="btn ghost" id="skip" type="button">${esc(tr('bSkip'))}</button>`;
    $('over').hidden = false;
    // 記録の鎖：各回の約束の指紋を、前の対戦の記録の指紋につないでいく。最後の輪がお礼（または「お礼なし」）
    const R = loadRec();
    const body = log.map(x => x.h).join(',') + ':' + w.join('-');
    const finish = async thanked => {
      R.chain = await hashOf((R.chain || '') + ':' + body + ':' + (thanked ? 'thanks' : 'nothanks'));
      R.n = (R.n || 0) + 1; R.noAce = !thanked; saveRec(R); noAce = !thanked;
    };
    $('ty').onclick = async () => {
      sfx('thanks'); burst(.5, .55, '#3dffb0', 80); $('ty').disabled = true; $('ty').textContent = tr('bThanked');
      await finish(true);
      $('warn').textContent = tr('bChain', { n: log.length }); $('skip').textContent = tr('bAgain'); $('skip').onclick = restart;
    };
    $('skip').onclick = async () => {
      sfx('no'); await finish(false);
      $('warn').innerHTML = tr('bSkipped'); $('ty').disabled = true; $('skip').textContent = tr('bAgain'); $('skip').onclick = restart;
    };
  }
  function restart() {
    $('over').hidden = true; sel = []; dpick = []; aceI = -1; ME = []; OP = []; draw();
    $('deck').hidden = false; drawDeck();
  }

  // ---- 背景：青空＋回る日の光＋虹＋雲＋紙ふぶき＋はじける火花 ----
  const cv = $('bg'), g = cv.getContext('2d');
  let W, H; const DPR = Math.min(2, devicePixelRatio || 1);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function rs() { W = innerWidth; H = innerHeight; cv.width = W * DPR; cv.height = H * DPR; g.setTransform(DPR, 0, 0, DPR, 0, 0); }
  rs(); addEventListener('resize', rs);
  const COLS = TYPES.map(t => TY[t][1]);
  const conf = Array.from({ length: 70 }, () => ({ x: Math.random(), y: Math.random(), v: .0006 + Math.random() * .0012, r: Math.random() * 6.28, vr: (Math.random() - .5) * .12, w: 5 + Math.random() * 6, c: COLS[Math.floor(Math.random() * COLS.length)], sw: Math.random() * 6 }));
  const clouds = Array.from({ length: 6 }, (_, i) => ({ x: Math.random(), y: .06 + i * .15, s: .6 + Math.random() * .7, v: .00004 + Math.random() * .00008 }));
  let sparks = [], running = false;
  function burst(x, y, c, n = 40) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, v = 2 + Math.random() * 6; sparks.push({ x: x * W, y: y * H, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 2, l: 1, c }); } if (!running) requestAnimationFrame(frame); }
  function cloud(x, y, s) { g.beginPath(); [[0, 0, 28], [26, -10, 24], [50, 0, 26], [24, 8, 22], [-22, 6, 18], [72, 8, 16]].forEach(([dx, dy, r]) => { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, 6.28); }); g.fill(); }
  const t0 = performance.now();
  function frame(t) {
    running = true;
    const s = (t - t0) / 1000;
    const sky = g.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#5cc8ff'); sky.addColorStop(.55, '#b8ecff'); sky.addColorStop(1, '#ffe0f0'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
    const cx = W * .5, cy = H * .18, R = Math.max(W, H);
    g.save(); g.translate(cx, cy); g.rotate(reduce ? 0 : s * .12);
    for (let k = 0; k < 12; k++) { g.rotate(Math.PI / 6); g.fillStyle = k % 2 ? 'rgba(255,255,255,.28)' : 'rgba(255,240,150,.22)'; g.beginPath(); g.moveTo(0, 0); g.lineTo(-R * .12, -R * 1.2); g.lineTo(R * .12, -R * 1.2); g.fill(); }
    g.restore();
    const sun = g.createRadialGradient(cx, cy, 0, cx, cy, W * .35); sun.addColorStop(0, 'rgba(255,255,230,.95)'); sun.addColorStop(.25, 'rgba(255,240,160,.55)'); sun.addColorStop(1, 'rgba(255,240,160,0)'); g.fillStyle = sun; g.fillRect(0, 0, W, H);
    ['#ff5a5a', '#ff9d3a', '#ffd93a', '#5ad66a', '#3ab4ff', '#6a6aff', '#b05aff'].forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = .38; g.lineWidth = Math.max(8, W * .025); g.beginPath(); g.arc(W * .5, H * .95, W * .95 - i * g.lineWidth, Math.PI * 1.05, Math.PI * 1.95); g.stroke(); });
    g.globalAlpha = 1;
    g.fillStyle = 'rgba(255,255,255,.9)'; clouds.forEach(c => { if (!reduce) { c.x += c.v; if (c.x > 1.2) c.x = -.3; } cloud(c.x * W, c.y * H, c.s * Math.min(1.2, W / 400)); });
    if (!reduce) conf.forEach(p => { p.y += p.v; p.r += p.vr; if (p.y > 1.02) { p.y = -.02; p.x = Math.random(); } const x = (p.x + Math.sin(s + p.sw) * .01) * W; g.save(); g.translate(x, p.y * H); g.rotate(p.r); g.scale(1, Math.abs(Math.cos(p.r * 1.5))); g.fillStyle = p.c; g.fillRect(-p.w / 2, -p.w / 4, p.w, p.w / 2); g.restore(); });
    sparks = sparks.filter(p => (p.l -= .018) > 0);
    sparks.forEach(p => { p.x += p.vx; p.y += p.vy; p.vy += .15; g.fillStyle = p.c; g.globalAlpha = p.l; g.beginPath(); g.arc(p.x, p.y, 3, 0, 6.28); g.fill(); g.globalAlpha = 1; });
    if (!reduce || sparks.length) requestAnimationFrame(frame); else running = false;
  }
  requestAnimationFrame(frame);

  // ---- 音：すべてその場で合成（音のファイルを使わない）。曲はトランペット3重奏の行進曲 ----
  let ac = null, on = false, master, bgmGain, nextT = 0, step = 0, timer = null;
  function initAudio() {
    ac = new (window.AudioContext || window.webkitAudioContext)();
    const comp = ac.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ac.destination);
    master = ac.createGain(); master.gain.value = .9; master.connect(comp);
    bgmGain = ac.createGain(); bgmGain.gain.value = .7; bgmGain.connect(master);
  }
  function tone(f, t, d, type = 'square', v = .3, dest = master, slide) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + d);
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(e); e.connect(dest); o.start(t); o.stop(t + d + .02);
  }
  function noise(t, d, v = .2, dest = master, hp = 6000) {
    const b = ac.createBuffer(1, Math.ceil(ac.sampleRate * d), ac.sampleRate), a = b.getChannelData(0); for (let i = 0; i < a.length; i++) a[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = hp;
    const e = ac.createGain(); e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(f); f.connect(e); e.connect(dest); s.start(t);
  }
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  // 金管：少しずらした2本のノコギリ波を、吹き始めに開くフィルターに通す
  function brass(f, t, d, v, dest = bgmGain) {
    const e = ac.createGain(), lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(f * 1.5, t); lp.frequency.linearRampToValueAtTime(f * 6, t + .06); lp.frequency.exponentialRampToValueAtTime(f * 3, t + Math.min(d, .4));
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .04); e.gain.setValueAtTime(v * .85, t + Math.max(.05, d - .06)); e.gain.exponentialRampToValueAtTime(.0001, t + d + .08);
    [-6, 6].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = dt; o.connect(lp); o.start(t); o.stop(t + d + .1); });
    lp.connect(e); e.connect(dest);
  }
  // トランペット：明るいノコギリ波。吹き始めに音程が少し下からすくい上がり、長い音はゆれる。3本を左・真ん中・右に置く
  function trumpet(f, t, d, v, pan = 0, dest = bgmGain) {
    const e = ac.createGain(), lp = ac.createBiquadFilter(), hp = ac.createBiquadFilter(), pn = ac.createStereoPanner ? ac.createStereoPanner() : null;
    lp.type = 'lowpass'; lp.Q.value = 1.5; lp.frequency.setValueAtTime(f * 2, t); lp.frequency.linearRampToValueAtTime(f * 10, t + .05); lp.frequency.exponentialRampToValueAtTime(f * 5, t + Math.min(d, .3));
    hp.type = 'highpass'; hp.frequency.value = 300;
    e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(v, t + .03); e.gain.setValueAtTime(v * .8, t + Math.max(.04, d - .05)); e.gain.exponentialRampToValueAtTime(.0001, t + d + .07);
    const vib = ac.createOscillator(), vg = ac.createGain(); vib.frequency.value = 5.8; vg.gain.setValueAtTime(0, t); if (d > .3) vg.gain.linearRampToValueAtTime(f * .006, t + .3); vib.connect(vg);
    [-4, 4].forEach(dt => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f * .97, t); o.frequency.exponentialRampToValueAtTime(f, t + .04); o.detune.value = dt; vg.connect(o.frequency); o.connect(lp); o.start(t); o.stop(t + d + .1); });
    vib.start(t); vib.stop(t + d + .1); lp.connect(hp); hp.connect(e);
    if (pn) { pn.pan.value = pan; e.connect(pn); pn.connect(dest); } else e.connect(dest);
  }
  function timp(f, t, v = .9) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(f * 1.6, t); o.frequency.exponentialRampToValueAtTime(f, t + .08);
    e.gain.setValueAtTime(v, t); e.gain.exponentialRampToValueAtTime(.001, t + .7); o.connect(e); e.connect(bgmGain); o.start(t); o.stop(t + .75);
  }
  // 旋律は1小節を8分音符8つで書く（「-」はのばす、「.」は休み）
  const NM = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const midi = x => { const m = x.match(/^([A-G]#?)(\d)$/); return 12 * (+m[2] + 1) + NM[m[1]]; };
  function parse(bars) {
    const ev = [];
    bars.forEach((b, bi) => { const tk = b.trim().split(/\s+/); tk.forEach((x, i) => { if (x === '-' || x === '.') return; let d = 1; for (let j = i + 1; j < tk.length && tk[j] === '-'; j++) d++; ev.push([bi * 16 + i * 2, midi(x), d * 2]); }); });
    return ev;
  }
  // 出陣のファンファーレ：ニ長調の行進曲。8分で跳ねるベース・裏拍の金管・4小節ごとの太鼓の連打とせり上がる音・2周目は1音上げる
  const SONG = {
    bpm: 184,
    chords: [[62, 66, 69], [62, 67, 71], [61, 64, 69], [62, 66, 69], [62, 66, 71], [62, 67, 71], [61, 64, 69], [62, 66, 69]], bass: [38, 43, 45, 38, 47, 43, 45, 38],
    // トランペット3重奏：1本目が旋律、2本目がその下の3度、3本目が和音の下の音（リズムは3本そろえる）
    trio: [parse(['D5 . D5 D5 F#5 . A5 -', 'B5 - A5 - G5 . F#5 G5', 'A5 - E5 - C#5 . E5 A5', 'F#5 - - - D5 . . .', 'D5 . D5 D5 F#5 . B5 -', 'D6 - B5 - G5 . B5 D6', 'C#6 - B5 A5 G5 - E5 -', 'D6 - - - - - . .']),
      parse(['A4 . A4 A4 D5 . F#5 -', 'G5 - F#5 - D5 . D5 D5', 'E5 - C#5 - A4 . C#5 E5', 'D5 - - - A4 . . .', 'B4 . B4 B4 D5 . F#5 -', 'B5 - G5 - D5 . G5 B5', 'A5 - G5 E5 E5 - C#5 -', 'A5 - - - - - . .']),
      parse(['F#4 . F#4 F#4 A4 . D5 -', 'D5 - D5 - B4 . A4 B4', 'C#5 - A4 - E4 . A4 C#5', 'A4 - - - F#4 . . .', 'F#4 . F#4 F#4 B4 . D5 -', 'G5 - D5 - B4 . D5 G5', 'E5 - E5 C#5 C#5 - A4 -', 'F#5 - - - - - . .'])]
  };
  const ST = 60 / SONG.bpm / 4;
  function beat(s16, bar, t, b, tp) {
    const ch = SONG.chords[bar].map(n => n + tp);
    if (s16 === 0) ch.forEach(n => brass(N(n - 12), t, ST * 3, .05));
    if (s16 === 6 || s16 === 14) ch.forEach(n => brass(N(n - 12), t, ST * 1.2, .05));
    if (s16 % 2 === 0) tone(N(b + (s16 % 4 === 2 ? 12 : 0)), t, ST * 1.6, 'sawtooth', .13, bgmGain);
    if (s16 === 0 || s16 === 8) timp(N(b + 12), t);
    if (s16 % 4 === 0) noise(t, .1, .3, bgmGain, 150);
    if (s16 === 4 || s16 === 12) noise(t, .16, .44, bgmGain, 1500);
    if ((bar === 3 || bar === 7) && s16 >= 8) noise(t, .07, .18 + .03 * (s16 - 8), bgmGain, 2200);
    if ((bar === 3 || bar === 7) && s16 === 0) {
      const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(1600, t + ST * 16);
      e.gain.setValueAtTime(.0001, t); e.gain.exponentialRampToValueAtTime(.05, t + ST * 15); e.gain.exponentialRampToValueAtTime(.0001, t + ST * 16); o.connect(e); e.connect(bgmGain); o.start(t); o.stop(t + ST * 16);
    }
    if (bar % 4 === 0 && s16 === 0) noise(t, 1.4, .3, bgmGain, 5000);
    noise(t, .025, s16 % 2 ? .05 : .08, bgmGain, 8000);
  }
  function sched() {
    while (nextT < ac.currentTime + .15) {
      const s128 = step % 128, bar = Math.floor(s128 / 16), s16 = s128 % 16, t = nextT, tp = Math.floor(step / 128) % 2 ? 2 : 0;
      beat(s16, bar, t, SONG.bass[bar] + tp, tp);
      SONG.trio.forEach((v, vi) => { for (const [p, n0, d] of v) if (p === s128) trumpet(N(n0 + tp), t, ST * d, [.17, .12, .11][vi], [0, -.45, .45][vi]); });
      nextT += ST; step++;
    }
  }
  function bgm(play) { if (play) { nextT = ac.currentTime + .05; step = 0; timer = setInterval(sched, 25); } else { clearInterval(timer); timer = null; } }
  function timpR(t, v) {
    const o = ac.createOscillator(), e = ac.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(90, t); o.frequency.exponentialRampToValueAtTime(55, t + .1);
    e.gain.setValueAtTime(v * .8, t); e.gain.exponentialRampToValueAtTime(.001, t + .6); o.connect(e); e.connect(master); o.start(t); o.stop(t + .65);
  }
  function sfx(k) {
    if (!on || !ac) return;
    const t = ac.currentTime;
    const S = {
      pick: () => tone(880, t, .08, 'square', .18, master, 1320),
      un: () => tone(660, t, .08, 'square', .14, master, 440),
      no: () => tone(160, t, .15, 'sawtooth', .15),
      seal: () => { noise(t, .25, .25, master, 1200); tone(220, t + .18, .1, 'square', .2, master, 110); },
      reveal: () => [0, 4, 7, 12].forEach((n, i) => tone(N(72 + n), t + i * .05, .35, 'triangle', .25)),
      // ドラムロール：曲を小さくして、だんだん強くなる小太鼓
      drumroll: () => {
        bgmGain.gain.cancelScheduledValues(t); bgmGain.gain.setValueAtTime(bgmGain.gain.value, t); bgmGain.gain.linearRampToValueAtTime(.12, t + .2);
        for (let i = 0; i < 46; i++) { const tt = t + i * .04, v = .08 + .32 * (i / 46); noise(tt, .05, v, master, 1100); if (i % 3 === 0) timpR(tt, v * .6); }
      },
      // ジャジャーン：トランペットと金管の和音を2回。そのあと曲を戻す
      jajan: () => {
        [50, 62, 66, 69, 74].forEach(n => { trumpet(N(n + 12), t, .25, .14, 0, master); trumpet(N(n + 12), t + .32, 1.3, .16, 0, master); });
        [38, 50].forEach(n => { brass(N(n), t, .25, .25, master); brass(N(n), t + .32, 1.3, .28, master); });
        timpR(t, 1); timpR(t + .32, 1.2); noise(t + .32, 1.8, .4, master, 4000); noise(t, .2, .35, master, 1500);
        bgmGain.gain.setValueAtTime(.12, t + 1.4); bgmGain.gain.linearRampToValueAtTime(.7, t + 2.6);
      },
      win: () => [0, 4, 7, 12, 16].forEach((n, i) => tone(N(72 + n), t + i * .07, .3, 'square', .16)),
      lose: () => [0, -3, -7].forEach((n, i) => tone(N(64 + n), t + i * .14, .3, 'triangle', .22)),
      draw: () => [0, 7, 0].forEach((n, i) => tone(N(67 + n), t + i * .1, .2, 'triangle', .2)),
      fanfare: () => [[72, 0], [72, .12], [72, .24], [76, .36], [79, .6], [84, .84]].forEach(([n, d]) => { tone(N(n), t + d, .3, 'square', .16); tone(N(n - 12), t + d, .3, 'triangle', .2); }),
      thanks: () => [[84, 0], [88, .25], [91, .5], [96, .75]].forEach(([n, d]) => { tone(N(n), t + d, 1.4, 'sine', .22); tone(N(n) * 2.01, t + d, .8, 'sine', .05); })
    };
    if (S[k]) S[k]();
  }
  $('snd').onclick = () => {
    if (!ac) initAudio(); ac.resume(); on = !on;
    $('snd').classList.toggle('off', !on); $('snd').textContent = tr(on ? 'bSndOff' : 'bSndOn'); bgm(on); if (on) sfx('pick');
  };

  // ---- ルール動画（YouTube。押すまで通信しない。日本語の動画なので、日本語のページだけ） ----
  const VIDEO_ID = '';
  let bgmWas = false;
  if (VIDEO_ID && (window.LANG || 'ja') === 'ja') {
    $('vbtn').hidden = false;
    $('vbtn').onclick = () => {
      bgmWas = on && !!timer; if (bgmWas) bgm(false);
      const f = document.createElement('iframe'); f.className = 'vframe'; f.title = tr('bVideo'); f.allow = 'autoplay; encrypted-media; picture-in-picture'; f.allowFullscreen = true;
      f.src = `https://www.youtube-nocookie.com/embed/${VIDEO_ID}?autoplay=1&rel=0&playsinline=1`;
      $('vslot').replaceChildren(f); $('vmodal').hidden = false;
    };
    $('vclose').onclick = () => { $('vslot').replaceChildren(); $('vmodal').hidden = true; if (bgmWas) { bgm(true); bgmWas = false; } };
  }

  // ---- はじめ ----
  applyDom();
  $('rule1').innerHTML = tr('bRule1', { cap: CAP });
  draw(); drawHist(); $('mid').innerHTML = waitMsg();
  $('oppName').textContent = tr('bOpp', { name: tr('bOppName') });
  $('oppWitness').textContent = tr('bWitness', { name: tr('bOppGuard') });
  $('rvOpp').textContent = tr('bOppName');
  $('myguard').textContent = tr('bNoWitness');
  const dexP = readDex();
  $('startbtn').onclick = async () => {
    $('startbtn').disabled = true; $('startbtn').textContent = tr('bLoading');
    const all = await dexP;
    ZK = all.filter(M => !isHuman(M) && Number(M.power) > 0).map(fighter).sort((a, b) => b.p - a.p);
    GUARDS = all.filter(isHuman).map(guardOf); guardI = GUARDS.length ? 0 : -1;
    noAce = !!loadRec().noAce;
    $('intro').hidden = true; $('deck').hidden = false; drawDeck(); sfx('pick');
  };
})();
