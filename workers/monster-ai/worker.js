// モンスタードロッパーの AI 中継。
// ページから「写真か人生の記録か・言語・縮めた画像」だけを受け取り、頼み文はここで付けて OpenAI に渡す。
// ページから頼み文を受け取らないのは、この中継を「何でも聞ける無料の AI」として使わせないため。
// 画像も答えも保存しない・記録に残さない（console.log に中身を出さないこと）。
// 費用は OpenAI の「データ提供と引き換えの毎日の無料トークン」の中だけで済むよう、その日の使用量を数えて手前で止める。
import './shim.js';
import '../../play/monster-i18n.js'; // 頼み文の出どころ。ページの辞書と同じ物を使う（直したら出し直す）
import { eventPrompt, schedulePrompt, HINTS } from './tool-prompts.js';
import { nightPrompt, LANG_NAME, KEYS, INSTS, BUILDS } from './night-prompt.js';
import MUSEUM from '../../play/museum/museum.json'; // 合体の材料。ページからは作品のファイル名だけを受け取り、中身はここから引く

const I18N = globalThis.I18N;
const MAX_IMAGE = 2000000; // base64 の文字数（約1.5MB）
const WAIT = 40000;
// イベントドロッパー・予定表ドロッパー（app.dropper-tools.com）から。ファイルそのもの（PDF・画像）を base64 で受け取る
const MAX_FILE = 14000000; // base64 の文字数（約10MB）
// base64 に使う文字だけか（ほかの文字があると、OpenAI への頼みの JSON に別の指示を差し込めてしまう）
const B64 = new Uint8Array(256);
for (const c of 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=') B64[c.charCodeAt(0)] = 1;
const TOOL_WAIT = 90000;   // 予定表は1枚で何十件も返すので長めに待つ
const MIMES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const EVENT_TYPES = ['sports', 'general', ...Object.keys(HINTS)];
const WORKS = new Map(MUSEUM.map(w => [w.f, w]));

export default {
  async fetch(req, env) {
    const origin = req.headers.get('Origin') || '';
    const url = new URL(req.url), path = url.pathname;
    // 遊び場は周知サイトから、道具2本はツール本体からだけ受け付ける
    const allowed = (path === '/monster' ? env.ALLOWED_ORIGINS : env.TOOL_ORIGINS).split(',').map(s => s.trim());
    if (!allowed.includes(origin)) return new Response('forbidden', { status: 403 });
    const cors = { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' };
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'POST', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Max-Age': '86400' } });
    const out = (body, status = 200) => Response.json(body, { status, headers: cors });
    if (req.method === 'POST' && (path === '/event' || path === '/schedule')) return tool(req, env, url, out);
    if (req.method !== 'POST' || path !== '/monster') return out({ error: 'bad' }, 404);

    let q;
    try { q = await req.json(); } catch (e) { return out({ error: 'bad' }, 400); }
    const kind = q && q.kind, lang = q && q.lang, image = q && q.image;
    if (kind === 'fuse') return fuse(req, env, q, out);
    if (kind === 'night') return night(req, env, q, out);
    if (!['photo', 'life'].includes(kind) || !I18N[lang] || typeof image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(image)) return out({ error: 'bad' }, 400);
    if (image.length > MAX_IMAGE) return out({ error: 'size' }, 413);

    const day = new Date().toISOString().slice(0, 10);
    const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ? AND k = 'tokens'").bind(day).first('n') || 0;
    if (used + Number(env.RESERVE_TOKENS) > Number(env.DAILY_TOKEN_LIMIT)) return out({ error: 'quota' }, 429);
    // 接続元はそのまま残さない。日ごとに変わる塩と混ぜて切り詰めた印だけで数え、翌日に消す
    const who = 'ip:' + (await sha256(env.IP_SALT + day + (req.headers.get('CF-Connecting-IP') || ''))).slice(0, 16);
    if (await add(env, day, who, 1) > Number(env.PER_IP_DAILY)) return out({ error: 'limit' }, 429);

    const prompt = kind === 'life' ? I18N[lang].lifePrompt : I18N[lang].prompt;
    let a;
    try { a = await ask(env, prompt, image, kind === 'life' ? 'high' : 'low'); }
    catch (e) { await add(env, day, who, -1); return out({ error: e.kind || 'busy' }, e.kind === 'bad' ? 502 : 503); }
    await add(env, day, 'tokens', a.tokens);
    return out({ answer: a.answer });
  },
  async scheduled(ev, env) {
    await env.DB.prepare('DELETE FROM counts WHERE day < ?').bind(new Date().toISOString().slice(0, 10)).run();
  }
};

// 美術館の作品の合体（2026-10-20〜）。ページが送るのは言語と、合体した作品のファイル名（2〜3点）だけ。
// 利用者の画像も文字も受け取らない。作品の名前・由来はこの中継の素材集（museum.json）から引いて、AI に新しい名前と物語を書かせる
async function fuse(req, env, q, out) {
  const lang = q.lang, fs = q.works;
  if (!I18N[lang] || !Array.isArray(fs) || fs.length < 2 || fs.length > 3 || !fs.every(f => typeof f === 'string' && WORKS.has(f))) return out({ error: 'bad' }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ? AND k = 'tokens'").bind(day).first('n') || 0;
  if (used + Number(env.RESERVE_TOKENS) > Number(env.DAILY_TOKEN_LIMIT)) return out({ error: 'quota' }, 429);
  // 1人1日の枚数は、写真・人生の記録と同じ数に入れる
  const who = 'ip:' + (await sha256(env.IP_SALT + day + (req.headers.get('CF-Connecting-IP') || ''))).slice(0, 16);
  if (await add(env, day, who, 1) > Number(env.PER_IP_DAILY)) return out({ error: 'limit' }, 429);
  const works = fs.map((f, i) => {
    const w = WORKS.get(f), t = w.t[lang] || w.t.en;
    return `${i + 1}. ${w.title}（${w.date}）\n   ${t.name} / ${t.motif}\n   ${t.story}`;
  }).join('\n');
  const prompt = I18N[lang].fusePrompt.replace('{n}', fs.length) + '\n\n' + works;
  let a;
  try {
    a = await call(env, effort => JSON.stringify(Object.assign({
      model: env.OPENAI_MODEL,
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 2000
    }, effort ? { reasoning_effort: 'minimal' } : {})), WAIT);
  } catch (e) { await add(env, day, who, -1); return out({ error: e.kind || 'busy' }, e.kind === 'bad' ? 502 : 503); }
  await add(env, day, 'tokens', a.tokens);
  return out({ answer: a.answer });
}

// 夜の美術館の最後の部屋（2026-10-25〜）。ページが送るのは言語と、その夜の精霊ごとの作品のファイル名・精霊の名前（2〜7体）だけ。
// 守り神・人生の記録・利用者の画像は受け取らない。作品の題と由来は museum.json から引き、作品の絵（当方の CC0 の素材）を小さく見せて、
// その夜の題・精霊ごとの一言・結びの一言と、曲の設計図を書かせる。答えはここで形を確かめ、決まった言葉の外は捨てる
const MUSEUM_URL = 'https://dropper-tools.com/play/museum/';
const clipText = (v, n) => typeof v === 'string' ? [...v.replace(/[\u0000-\u001f\u007f<>]/g, '').trim()].slice(0, n).join('') : '';
async function night(req, env, q, out) {
  const lang = q.lang, cs = q.cards;
  if (!LANG_NAME[lang] || !I18N[lang] || !Array.isArray(cs) || cs.length < 2 || cs.length > 7
    || !cs.every(c => c && typeof c.f === 'string' && WORKS.has(c.f) && typeof c.n === 'string' && c.n.length <= 40)) return out({ error: 'bad' }, 400);
  const day = new Date().toISOString().slice(0, 10);
  const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ? AND k = 'tokens'").bind(day).first('n') || 0;
  if (used + Number(env.RESERVE_TOKENS) > Number(env.DAILY_TOKEN_LIMIT)) return out({ error: 'quota' }, 429);
  // 1人1日の数は、写真・人生の記録・合体と同じ数に入れる（ページは1晩に1回だけ頼む）
  const who = 'ip:' + (await sha256(env.IP_SALT + day + (req.headers.get('CF-Connecting-IP') || ''))).slice(0, 16);
  if (await add(env, day, who, 1) > Number(env.PER_IP_DAILY)) return out({ error: 'limit' }, 429);
  const data = cs.map((c, i) => {
    const w = WORKS.get(c.f), t = w.t[lang] || w.t.en;
    const d = { no: i + 1, artwork: w.title, date: w.date, shows: t.motif, about: t.desc, spirit: clipText(c.n, 24) };
    if (c.rar === 'gold' || c.rar === 'silver') d.special = c.rar === 'gold' ? 'gold light (a very rare spirit that shines gold)' : 'silver light (a rare spirit that shines silver)';
    if (c.kin === true) d.born = 'from the bond of two spirits (a child of two spirits)';
    return JSON.stringify(d);
  }).join('\n');
  const content = [{ type: 'text', text: nightPrompt(lang, cs.length) + '\n\n' + data }]
    .concat(cs.map(c => ({ type: 'image_url', image_url: { url: MUSEUM_URL + c.f, detail: 'low' } })));
  let a;
  try {
    a = await call(env, effort => JSON.stringify(Object.assign({
      model: env.OPENAI_MODEL,
      messages: [{ role: 'user', content }],
      response_format: { type: 'json_object' },
      max_completion_tokens: 2500
    }, effort ? { reasoning_effort: 'minimal' } : {})), WAIT);
  } catch (e) { await add(env, day, who, -1); return out({ error: e.kind || 'busy' }, e.kind === 'bad' ? 502 : 503); }
  await add(env, day, 'tokens', a.tokens);
  const r = a.answer || {}, m = r.music || {};
  const lines = Array.isArray(r.lines) ? r.lines.slice(0, cs.length).map(x => clipText(x, 60)) : [];
  const inst = [...new Set(Array.isArray(m.inst) ? m.inst.filter(x => INSTS.includes(x)) : [])].slice(0, 3);
  const answer = {
    title: clipText(r.title, 30), lines, close: clipText(r.close, 70),
    music: {
      tempo: Math.max(66, Math.min(108, Math.round(Number(m.tempo)) || 84)),
      key: KEYS.includes(m.key) ? m.key : 'Bb',
      inst: inst.length >= 2 ? inst : ['bell', 'strings'],
      build: BUILDS.includes(m.build) ? m.build : 'rise'
    }
  };
  if (!answer.title || lines.length !== cs.length || lines.some(x => !x)) return out({ error: 'bad' }, 502);
  return out({ answer });
}

// イベント・予定表。言語・種類（または年度）・ファイルの種類は URL で、ファイルそのもの（base64）は本文で受け取る。
// 本文は文字として読まず、バイトのまま OpenAI への頼みに挟む（大きなファイルで Worker の計算時間を使わないため）
async function tool(req, env, url, out) {
  const isEvent = url.pathname === '/event';
  const lang = url.searchParams.get('lang'), mime = url.searchParams.get('mime');
  if (!['ja', 'en', 'in'].includes(lang) || !MIMES.includes(mime)) return out({ error: 'bad' }, 400);
  let prompt;
  if (isEvent) {
    const type = url.searchParams.get('type');
    if (!EVENT_TYPES.includes(type)) return out({ error: 'bad' }, 400);
    prompt = eventPrompt(lang, type);
  } else {
    const fy = url.searchParams.get('fy');
    if (fy && !/^20\d\d$/.test(fy)) return out({ error: 'bad' }, 400);
    prompt = schedulePrompt(lang, fy ? Number(fy) : 0);
  }
  if (Number(req.headers.get('Content-Length') || 0) > MAX_FILE) return out({ error: 'size' }, 413);
  const file = new Uint8Array(await req.arrayBuffer());
  if (!file.length) return out({ error: 'bad' }, 400);
  if (file.length > MAX_FILE) return out({ error: 'size' }, 413);
  for (let i = 0; i < file.length; i++) if (!B64[file[i]]) return out({ error: 'bad' }, 400);

  const name = isEvent ? 'event' : 'schedule';
  const reserve = Number(isEvent ? env.RESERVE_EVENT : env.RESERVE_SCHEDULE);
  const perIp = Number(isEvent ? env.PER_IP_EVENT : env.PER_IP_SCHEDULE);
  const day = new Date().toISOString().slice(0, 10);
  const used = await env.DB.prepare("SELECT n FROM counts WHERE day = ? AND k = 'tokens'").bind(day).first('n') || 0;
  if (used + reserve > Number(env.DAILY_TOKEN_LIMIT)) return out({ error: 'quota' }, 429);
  const who = name + ':' + (await sha256(env.IP_SALT + day + (req.headers.get('CF-Connecting-IP') || ''))).slice(0, 16);
  if (await add(env, day, who, 1) > perIp) return out({ error: 'limit' }, 429);

  const MARK = '@@FILE@@';
  const part = mime === 'application/pdf'
    ? { type: 'file', file: { filename: 'document.pdf', file_data: 'data:application/pdf;base64,' + MARK } }
    : { type: 'image_url', image_url: { url: 'data:' + mime + ';base64,' + MARK, detail: 'high' } };
  const mk = effort => {
    const [pre, post] = JSON.stringify(Object.assign({
      model: env.OPENAI_MODEL,
      messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, part] }],
      response_format: { type: 'json_object' },
      max_completion_tokens: isEvent ? 6000 : 20000
    }, effort ? { reasoning_effort: 'minimal' } : {})).split(MARK);
    const a = new TextEncoder().encode(pre), b = new TextEncoder().encode(post);
    const body = new Uint8Array(a.length + file.length + b.length);
    body.set(a, 0); body.set(file, a.length); body.set(b, a.length + file.length);
    return body;
  };
  let a;
  try { a = await call(env, mk, TOOL_WAIT); }
  catch (e) { await add(env, day, who, -1); return out({ error: e.kind || 'busy' }, e.kind === 'bad' ? 502 : 503); }
  await add(env, day, 'tokens', a.tokens);
  return out({ answer: a.answer });
}

async function add(env, day, k, n) {
  return env.DB.prepare('INSERT INTO counts (day, k, n) VALUES (?, ?, ?) ON CONFLICT (day, k) DO UPDATE SET n = n + excluded.n RETURNING n')
    .bind(day, k, n).first('n');
}

async function sha256(s) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}

// detail：写真は 'low'（小さく読ませて安く）、人生の記録は文字を読むので 'high'
async function ask(env, prompt, image, detail) {
  return call(env, effort => JSON.stringify(Object.assign({
    model: env.OPENAI_MODEL,
    messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: 'data:image/jpeg;base64,' + image, detail } }] }],
    response_format: { type: 'json_object' },
    max_completion_tokens: 4000
  }, effort ? { reasoning_effort: 'minimal' } : {})), WAIT);
}

// mk(true) は考える量を指定した頼み、mk(false) は指定しない頼み（指定できないモデルのとき）
async function call(env, mk, wait) {
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), wait);
  const send = body => fetch(env.OPENAI_URL || 'https://api.openai.com/v1/chat/completions', { // OPENAI_URL は手元で試すときだけ
    method: 'POST', signal: ctl.signal,
    headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + env.OPENAI_API_KEY },
    body
  });
  let resp;
  try {
    resp = await send(mk(true));
    // 考える量を指定できないモデルなら、指定せずに頼み直す
    if (resp.status === 400 && /reasoning_effort/i.test(await resp.clone().text())) resp = await send(mk(false));
  } catch (e) { throw fail(e.name === 'AbortError' ? 'slow' : 'busy'); }
  finally { clearTimeout(timer); }
  if (resp.status === 429 || resp.status >= 500) throw fail('busy');
  if (!resp.ok) throw fail('bad');
  const data = await resp.json();
  const txt = ((((data.choices || [])[0] || {}).message || {}).content || '').trim();
  let answer;
  try { answer = JSON.parse(txt); } catch (e) { throw fail('bad'); }
  return { answer, tokens: (data.usage && data.usage.total_tokens) || Number(env.RESERVE_TOKENS) };
}
function fail(kind) { const e = new Error(kind); e.kind = kind; return e; }
