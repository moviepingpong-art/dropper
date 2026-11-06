// dropper-tools.com の配信（Cloudflare Workers 静的アセット）で、ファイルが見つからなかったときだけ動く。
// html_handling "none" にしているので、/play/spirit.html などはファイルのまま返り、ここへは来ない。
// ここで GitHub Pages と同じふるまいを足す：
//   /  /en/  /in/ … → そのフォルダの index.html
//   /en  /play/spirit（拡張子なし）→ /en/ へ転送、または spirit.html を返す
//   それ以外 → 404.html を 404 で返す
//
// もう1つ：動画の部分読み込み（Range → 206）。Workers の静的アセットは Range に答えず全部を 200 で返す
// （公式の「Billing and Limitations」）。iPhone の Safari は 206 が無いと動画を流さないので、
// wrangler.jsonc の run_worker_first で /play/gallery/* だけをここへ先に回し、動画なら切り出して返す。
// 動画でないもの（同じフォルダの jpg・webp など）は、そのまま静的アセットへ渡す。
const MEDIA = /\.(?:mp4|webm|m4v|mov|mp3|m4a|ogg|wav)$/i;

async function media(request, env) {
  const range = request.headers.get('Range');
  const plain = new Request(request.url, { method: 'GET', headers: { 'Accept-Encoding': 'identity' } });
  let res = await env.ASSETS.fetch(plain);
  if (!res.ok) return res;
  let size = Number(res.headers.get('Content-Length') || NaN);
  if (range && !(size > 0)) {
    // 大きさが書かれていない応答（wrangler dev など）は、いったん読み切って大きさを知る（いちばん大きい動画で15MB）
    const buf = await res.arrayBuffer();
    size = buf.byteLength;
    res = new Response(buf, res);
  }
  const headers = new Headers(res.headers);
  headers.set('Accept-Ranges', 'bytes');
  const head = request.method === 'HEAD';
  const m = range && Number.isFinite(size) && size > 0 && /^bytes=(\d*)-(\d*)$/.exec(range.trim());
  if (!m || (m[1] === '' && m[2] === '')) {
    // Range が無い・形がおかしい・複数の範囲のときは全部を返す（RFC 9110 で許される）
    if (head) { res.body && res.body.cancel(); return new Response(null, { status: 200, headers }); }
    return new Response(res.body, { status: 200, headers });
  }
  let start, end;
  if (m[1] === '') { // bytes=-500（後ろから500バイト）
    start = Math.max(0, size - Number(m[2]));
    end = size - 1;
  } else {
    start = Number(m[1]);
    end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1);
  }
  if (start >= size || start > end) {
    res.body && res.body.cancel();
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}`, 'Accept-Ranges': 'bytes' } });
  }
  const len = end - start + 1;
  headers.set('Content-Range', `bytes ${start}-${end}/${size}`);
  headers.set('Content-Length', String(len));
  if (head) { res.body && res.body.cancel(); return new Response(null, { status: 206, headers }); }

  // 前を読み飛ばし、要る所だけを流す（全部をメモリに載せない）
  const { readable, writable } = new FixedLengthStream(len);
  (async () => {
    const reader = res.body.getReader();
    const writer = writable.getWriter();
    let pos = 0;
    try {
      while (pos <= end) {
        const { done, value } = await reader.read();
        if (done) break;
        const a = pos, b = pos + value.length; // この切れ端は [a, b)
        pos = b;
        if (b <= start) continue;
        const from = Math.max(start, a) - a;
        const to = Math.min(end + 1, b) - a;
        await writer.write(value.subarray(from, to));
      }
      await writer.close();
    } catch (e) {
      try { await writer.abort(e); } catch (_) {}
    } finally {
      reader.cancel().catch(() => {});
    }
  })();
  return new Response(readable, { status: 206, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // run_worker_first（/play/gallery/*）で来たもの
    if (path.startsWith('/play/gallery/')) {
      if (MEDIA.test(path) && (request.method === 'GET' || request.method === 'HEAD')) return media(request, env);
      const res = await env.ASSETS.fetch(request);
      if (res.status !== 404) return res;
    }
    const get = (p) => {
      const u = new URL(url);
      u.pathname = p;
      return env.ASSETS.fetch(new Request(u, request));
    };

    if (path.endsWith('/')) {
      const res = await get(path + 'index.html');
      if (res.ok) return res;
    } else if (!/\.[A-Za-z0-9]+$/.test(path.split('/').pop())) {
      const dir = await get(path + '/index.html');
      if (dir.ok) {
        url.pathname = path + '/';
        return Response.redirect(url.toString(), 301);
      }
      const html = await get(path + '.html');
      if (html.ok) return html;
    }

    const nf = await get('/404.html');
    return new Response(nf.body, {
      status: 404,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' },
    });
  },
};
