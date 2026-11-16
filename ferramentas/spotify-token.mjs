// Gera o refresh token do Spotify para o painel do perfil, sem dependências.
// Uso: node ferramentas/spotify-token.mjs  e abra http://127.0.0.1:8888 no navegador.
// No app do developer.spotify.com, cadastre a Redirect URI: http://127.0.0.1:8888/callback
// O client secret e o token só passam por este PC: nada é gravado em disco.
import http from 'node:http';
import { randomBytes } from 'node:crypto';

const PORTA = 8888;
const RETORNO = `http://127.0.0.1:${PORTA}/callback`;
const estado = randomBytes(16).toString('hex');
let credenciais = null;

const pagina = (corpo) => `<!doctype html><meta charset="utf-8"><title>Token do Spotify</title>
<style>body{font:16px system-ui;max-width:640px;margin:48px auto;padding:0 16px}input,textarea{width:100%;padding:8px;margin:4px 0 12px;font:14px monospace}button{padding:8px 16px}</style>${corpo}`;

const lerCorpo = (req) => new Promise((ok) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => ok(new URLSearchParams(d))); });

http.createServer(async (req, res) => {
  const url = new URL(req.url, RETORNO);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  if (req.method === 'POST' && url.pathname === '/') {
    const f = await lerCorpo(req);
    credenciais = { id: f.get('id').trim(), segredo: f.get('segredo').trim() };
    const auth = new URL('https://accounts.spotify.com/authorize');
    auth.search = new URLSearchParams({ client_id: credenciais.id, response_type: 'code', redirect_uri: RETORNO, scope: 'user-read-recently-played', state: estado });
    res.writeHead(302, { location: auth.toString() }).end();
  } else if (url.pathname === '/callback') {
    if (!credenciais || url.searchParams.get('state') !== estado || !url.searchParams.get('code')) {
      return res.end(pagina(`<p>Autorização recusada ou expirada (${url.searchParams.get('error') ?? 'estado inválido'}). <a href="/">Tentar de novo</a></p>`));
    }
    const r = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${credenciais.id}:${credenciais.segredo}`).toString('base64') },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: url.searchParams.get('code'), redirect_uri: RETORNO }),
    });
    const j = await r.json();
    if (!j.refresh_token) return res.end(pagina(`<p>O Spotify não devolveu o token: ${j.error_description ?? j.error ?? r.status}. Confira o client secret e a Redirect URI.</p>`));
    res.end(pagina(`<h1>Pronto</h1><p>Copie este valor para o secret <b>SPOTIFY_REFRESH_TOKEN</b> do repositório sauloscm/sauloscm:</p><textarea rows="4" readonly onclick="this.select()">${j.refresh_token}</textarea><p>Depois pode fechar esta aba; o programa no terminal encerra sozinho.</p>`));
    console.log('Token gerado e mostrado no navegador. Encerrando.');
    setTimeout(() => process.exit(0), 500);
  } else {
    res.end(pagina(`<h1>Token do Spotify</h1><form method="post"><label>Client ID<input name="id" required></label><label>Client secret<input name="segredo" type="password" required></label><button>Autorizar no Spotify</button></form>`));
  }
}).listen(PORTA, '127.0.0.1', () => console.log(`Abra http://127.0.0.1:${PORTA} no navegador.`));
