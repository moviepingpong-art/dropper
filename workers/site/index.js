// dropper-tools.com の配信（Cloudflare Workers 静的アセット）で、ファイルが見つからなかったときだけ動く。
// html_handling "none" にしているので、/play/spirit.html などはファイルのまま返り、ここへは来ない。
// ここで GitHub Pages と同じふるまいを足す：
//   /  /en/  /in/ … → そのフォルダの index.html
//   /en  /play/spirit（拡張子なし）→ /en/ へ転送、または spirit.html を返す
//   それ以外 → 404.html を 404 で返す
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
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
