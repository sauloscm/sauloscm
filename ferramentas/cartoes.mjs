// Gera as imagens do perfil: cartões no formato de um sistema de RAG, em versão clara e escura.
// Saída em assets/<nome>-dark.svg e assets/<nome>-light.svg. Só totais vão para as imagens:
// nenhum nome de repositório, cliente ou mensagem.
// Uso: GH_TOKEN=... [SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... SPOTIFY_REFRESH_TOKEN=...] node ferramentas/cartoes.mjs
// Para iterar no visual sem consultar o GitHub de novo: CARTOES_CACHE=caminho.json (criado na primeira execução).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const LOGIN = 'sauloscm';
const FUSO = -3; // America/Fortaleza, sem horário de verão
const L = 840; // largura de todos os cartões
mkdirSync('assets', { recursive: true });

// ---------- temas ----------
const TEMAS = {
  dark: { fundo: '#15171B', painel: '#1B1E23', borda: '#2E323A', linha: '#262A31', texto: '#ECE9E3', suave: '#9A9DA6', apagado: '#6A6E77', ambar: '#F2A93B', violeta: '#A594FF', verde: '#5BD6A2', sobreAmbar: '#1A1408' },
  light: { fundo: '#FBFAF7', painel: '#FFFFFF', borda: '#E3DFD6', linha: '#EEEAE2', texto: '#1C1A16', suave: '#5F5A50', apagado: '#8F8A80', ambar: '#B86E00', violeta: '#6A55E0', verde: '#1F8F5F', sobreAmbar: '#FFFFFF' },
};
const fonte = (nome, arquivo) => `@font-face{font-family:'${nome}';src:url(data:font/woff2;base64,${readFileSync(`ferramentas/fontes/${arquivo}`).toString('base64')}) format('woff2')}`;
const FONTES = fonte('Mono', 'mono.woff2') + fonte('MonoB', 'mono-bold.woff2');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const CW = 0.6; // largura de um caractere da JetBrains Mono, em em

// Cada cartão é uma função (tema) => { altura, corpo, estilo }; grava as duas versões.
function gravar(nome, titulo, desenhar) {
  for (const [id, T] of Object.entries(TEMAS)) {
    const { altura, corpo, estilo = '', moldura = true } = desenhar(T);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${altura}" viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(titulo)}">
<title>${esc(titulo)}</title>
<style>${FONTES}
text{font-family:'Mono',monospace;white-space:pre}.b{font-family:'MonoB',monospace}
.cursor{animation:piscar 1s steps(1) infinite}@keyframes piscar{50%{opacity:0}}
${estilo}</style>
${moldura ? `<rect x=".5" y=".5" width="${L - 1}" height="${altura - 1}" rx="10" fill="${T.painel}" stroke="${T.borda}"/>` : ''}
${corpo}
</svg>`;
    writeFileSync(`assets/${nome}-${id}.svg`, svg);
  }
  console.log(`assets/${nome}`);
}

// Palavras que aparecem uma a uma, como uma resposta em streaming.
function stream(x, y, texto, { tamanho = 15, cor, inicio = 0, passo = 0.06, classe = '' } = {}) {
  const palavras = texto.split(' ');
  return `<text x="${x}" y="${y}" font-size="${tamanho}" fill="${cor}" class="${classe}">${palavras.map((p, i) => `<tspan class="w" style="animation-delay:${(inicio + i * passo).toFixed(2)}s">${esc(p)}${i < palavras.length - 1 ? ' ' : ''}</tspan>`).join('')}</text>`;
}
const ESTILO_STREAM = `.w{opacity:0;animation:aparecer .01s linear forwards}@keyframes aparecer{to{opacity:1}}`;

function chip(x, y, texto, T, { cor = T.ambar, cheio = false, tamanho = 11 } = {}) {
  const w = texto.length * tamanho * CW + 14;
  return { w, svg: `<rect x="${x}" y="${y - tamanho - 3}" width="${w.toFixed(1)}" height="${tamanho + 9}" rx="4" fill="${cheio ? cor : 'none'}" stroke="${cor}" stroke-opacity="${cheio ? 1 : 0.6}"/><text x="${x + 7}" y="${y}" font-size="${tamanho}" fill="${cheio ? T.sobreAmbar : cor}">${esc(texto)}</text>` };
}

function quebrar(texto, largura) {
  const linhas = [];
  let atual = '';
  for (const p of texto.split(' ')) {
    if ((atual + ' ' + p).trim().length > largura) { linhas.push(atual); atual = p; } else atual = (atual + ' ' + p).trim();
  }
  if (atual) linhas.push(atual);
  return linhas;
}

// ---------- dados ----------
async function gql(query, variables = {}) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors.map((e) => e.message).join('; '));
  return j.data;
}

const guilda = existsSync('dados/guilda.json') ? JSON.parse(readFileSync('dados/guilda.json', 'utf8')) : { total: 0, dias: {}, horas: Array(24).fill(0), semana: Array(7).fill(0), linguagens: {} };

async function dadosDaForja() {
  const { user } = await gql(`query($l: String!) { user(login: $l) {
    contributionsCollection { contributionCalendar { weeks { contributionDays { date contributionCount } } } }
    repositories(first: 100, ownerAffiliations: OWNER, isFork: false) { nodes { nameWithOwner
      languages(first: 20) { edges { size node { name } } }
      refs(refPrefix: "refs/heads/", first: 50) { nodes { name } } } } } }`, { l: LOGIN });
  const dias = {};
  for (const w of user.contributionsCollection.contributionCalendar.weeks) for (const d of w.contributionDays) dias[d.date] = d.contributionCount;

  // Horário de cada commit da conta pessoal, em todas as branches, sem repetir commits.
  const { viewer } = await gql('{ viewer { id } }');
  const horas = Array(24).fill(0), semana = Array(7).fill(0);
  const vistos = new Set();
  const desde = new Date(Date.now() - 365 * 864e5).toISOString();
  for (const repo of user.repositories.nodes) {
    const [o, n] = repo.nameWithOwner.split('/');
    for (const { name: branch } of repo.refs.nodes) {
      let c = null;
      do {
        const d = await gql(`query($o: String!, $n: String!, $r: String!, $a: ID!, $s: GitTimestamp!, $c: String) {
          repository(owner: $o, name: $n) { ref(qualifiedName: $r) { target { ... on Commit {
            history(first: 100, after: $c, since: $s, author: { id: $a }) { pageInfo { hasNextPage endCursor } nodes { oid authoredDate } } } } } } }`,
          { o, n, r: `refs/heads/${branch}`, a: viewer.id, s: desde, c });
        const h = d.repository.ref?.target?.history;
        if (!h) break;
        for (const k of h.nodes) {
          if (vistos.has(k.oid)) continue;
          vistos.add(k.oid);
          const local = new Date(new Date(k.authoredDate).getTime() + FUSO * 36e5);
          horas[local.getUTCHours()]++;
          semana[local.getUTCDay()]++;
        }
        c = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
      } while (c);
    }
  }
  const linguagens = {};
  for (const r of user.repositories.nodes) for (const { size, node } of r.languages.edges) linguagens[node.name] = (linguagens[node.name] ?? 0) + size;
  return { dias, horas, semana, linguagens };
}

const CACHE = process.env.CARTOES_CACHE;
const forja = CACHE && existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : await dadosDaForja();
if (CACHE && !existsSync(CACHE)) writeFileSync(CACHE, JSON.stringify(forja));

const IGNORAR = new Set(['HTML', 'CSS', 'SCSS', 'Shell', 'PowerShell', 'Batchfile', 'Dockerfile', 'Makefile', 'TeX', 'Jupyter Notebook', 'Procfile', 'Inno Setup', 'NSIS']);
const linguagens = { ...forja.linguagens };
for (const [n, s] of Object.entries(guilda.linguagens ?? {})) linguagens[n] = (linguagens[n] ?? 0) + s;

const hoje = new Date(Date.now() + FUSO * 36e5);
const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
const ano = [];
for (let t = fim.getTime() - 364 * 864e5; t <= fim.getTime(); t += 864e5) {
  const data = new Date(t).toISOString().slice(0, 10);
  ano.push({ data, pessoal: forja.dias[data] ?? 0, estagio: guilda.dias[data] ?? 0 });
}
const somaPessoal = ano.reduce((s, d) => s + d.pessoal, 0);
const somaEstagio = ano.reduce((s, d) => s + d.estagio, 0);
let melhor = 0, seq = 0;
for (const d of ano) { seq = d.pessoal + d.estagio ? seq + 1 : 0; melhor = Math.max(melhor, seq); }
const ativos = ano.filter((d) => d.pessoal + d.estagio).length;

// ---------- hero: a pergunta, a resposta e o espaço de embeddings ----------
function hero() {
  gravar('hero', 'Contexto: Saulo Costa. Pergunta: quem é o saulo costa? Resposta: constrói agentes de IA, automações e ferramentas internas, do protótipo ao deploy; Engenharia de Computação na UFPB, conclusão prevista em 2027, João Pessoa. Fontes: Sagaz, Nexo, Oluasin, Neolis. Ao lado, um espaço de embeddings em que a pergunta acende os 5 vizinhos mais próximos.', (T) => {
    const q = chip(36, 50, 'query', T);
    const fontesX = [36];
    const fontes = ['fontes', 'sagaz', 'nexo', 'oluasin', 'neolis'].map((f, i) => {
      const c = chip(fontesX[i], 318, f, T, i === 0 ? { cor: T.verde, cheio: true } : { cor: T.suave });
      fontesX.push(fontesX[i] + c.w + 8);
      return c.svg;
    }).join('');
    const c1 = chip(338, 196, '01', T, { tamanho: 10 }), c2 = chip(372, 196, '02', T, { tamanho: 10 }), c3 = chip(294, 268, '03', T, { tamanho: 10 });

    // Espaço de embeddings: agrupamentos fixos, a consulta e os 5 vizinhos mais próximos.
    const ex = 520, ey = 40, ew = 284, eh = 300;
    let s = 11;
    const rnd = () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const grupos = [['claude · mcp', 110, 90], ['playwright · robôs', 210, 70], ['electron · webrtc', 70, 210], ['postgres · dbt', 190, 230], ['fastapi · flask', 230, 150]];
    const pontos = [];
    for (const [rot, gx, gy] of grupos) for (let i = 0; i < 9; i++) pontos.push({ x: gx + (rnd() - 0.5) * 70, y: gy + (rnd() - 0.5) * 50, rot });
    const consulta = { x: 150, y: 140 };
    const vizinhos = [...pontos].sort((a, b) => Math.hypot(a.x - consulta.x, a.y - consulta.y) - Math.hypot(b.x - consulta.x, b.y - consulta.y)).slice(0, 5);
    const pts = pontos.map((p) => `<circle cx="${(ex + p.x).toFixed(1)}" cy="${(ey + p.y).toFixed(1)}" r="${vizinhos.includes(p) ? 3.6 : 2.4}" fill="${vizinhos.includes(p) ? T.ambar : T.apagado}"/>`).join('');
    const linhas = vizinhos.map((p, i) => `<line x1="${ex + consulta.x}" y1="${ey + consulta.y}" x2="${(ex + p.x).toFixed(1)}" y2="${(ey + p.y).toFixed(1)}" stroke="${T.ambar}" stroke-width="1.2" class="traco" style="animation-delay:${(2.2 + i * 0.15).toFixed(2)}s"/>`).join('');
    const rotulos = grupos.map(([rot, gx, gy]) => `<text x="${ex + gx}" y="${ey + gy + 38}" font-size="9.5" fill="${T.apagado}" text-anchor="middle">${rot}</text>`).join('');
    const corpo = `
${q.svg}<text x="${36 + q.w + 12}" y="50" font-size="15" fill="${T.texto}">"quem é o saulo costa?"</text>
<text x="34" y="122" font-size="54" class="b" fill="${T.texto}">Saulo Costa</text>
${stream(36, 172, 'Constrói agentes de IA, automações e', { cor: T.texto, inicio: 0.6 })}
${stream(36, 196, 'ferramentas internas, do', { cor: T.texto, inicio: 0.96 })}<text x="264" y="196" font-size="15" fill="${T.texto}" class="w" style="animation-delay:1.14s">deploy.</text>
${c1.svg.replace('<rect', '<rect class="w" style="animation-delay:1.3s"').replace('<text', '<text class="w" style="animation-delay:1.3s"')}${c2.svg.replace('<rect', '<rect class="w" style="animation-delay:1.36s"').replace('<text', '<text class="w" style="animation-delay:1.36s"')}
<text x="36" y="244" font-size="13" fill="${T.suave}">Engenharia de Computação · UFPB</text>
<text x="36" y="268" font-size="13" fill="${T.suave}">conclusão em 2027 · João Pessoa</text>${c3.svg}
${fontes}
<text x="36" y="372" font-size="18" fill="${T.ambar}" class="cursor">&gt;</text>
<rect x="${ex - 16}" y="${ey - 16}" width="${ew + 32}" height="${eh + 32}" rx="8" fill="none" stroke="${T.linha}"/>
<text x="${ex}" y="${ey + 6}" font-size="10" fill="${T.apagado}" letter-spacing="1.5">ESPAÇO DE EMBEDDINGS</text>
<text x="${ex + ew}" y="${ey + 6}" font-size="10" fill="${T.ambar}" text-anchor="end">top-k = 5</text>
${pts}${linhas}${rotulos}
<circle cx="${ex + consulta.x}" cy="${ey + consulta.y}" r="5" fill="${T.ambar}"/>
<circle cx="${ex + consulta.x}" cy="${ey + consulta.y}" r="5" fill="none" stroke="${T.ambar}" class="anel"/>`;
    return {
      altura: 400, corpo, moldura: false,
      estilo: `${ESTILO_STREAM}
.traco{stroke-dasharray:200;stroke-dashoffset:200;animation:tracar .6s ease-out forwards}@keyframes tracar{to{stroke-dashoffset:0}}
.anel{transform-box:fill-box;transform-origin:center;animation:anel 2.4s ease-out infinite}@keyframes anel{from{transform:scale(1);opacity:.9}to{transform:scale(4);opacity:0}}`,
    };
  });
}

// ---------- impacto: quatro números, cada um com sua fonte ----------
function impacto() {
  const itens = [
    ['7+', 'automações em produção', 'fonte · central de automações do estágio'],
    ['~5.000', 'tabelas ao alcance do agente', 'fonte · sagaz, warehouse em duckdb e dbt'],
    ['60+', 'etapas no teste de ponta a ponta', 'fonte · oluasin, dois PCs simulados'],
    [String(somaPessoal + somaEstagio), 'contribuições em 12 meses', 'fonte · github, conta pessoal + estágio'],
  ];
  gravar('impacto', 'Impacto: ' + itens.map(([n, t]) => `${n} ${t}`).join('; '), (T) => {
    const corpo = `<rect x="28" y="30" width="8" height="8" fill="${T.ambar}"/><text x="44" y="38" font-size="11" fill="${T.ambar}" letter-spacing="3">IMPACTO</text>
<text x="${L - 28}" y="38" font-size="11" fill="${T.apagado}" text-anchor="end">cada número aponta para uma fonte</text>
<line x1="${L / 2}" y1="62" x2="${L / 2}" y2="254" stroke="${T.linha}"/><line x1="28" y1="158" x2="${L - 28}" y2="158" stroke="${T.linha}"/>
${itens.map(([n, t, f], i) => {
      const x = 28 + (i % 2) * (L / 2), y = 112 + Math.floor(i / 2) * 96;
      return `<text x="${x}" y="${y}" font-size="44" class="b" fill="${T.texto}">${esc(n)}</text><text x="${x}" y="${y + 22}" font-size="13" fill="${T.texto}">${esc(t)}</text><text x="${x}" y="${y + 40}" font-size="11" fill="${T.apagado}">${esc(f)}</text>`;
    }).join('\n')}`;
    return { altura: 278, corpo };
  });
}

// ---------- divisor ----------
function divisor() {
  gravar('divisor', '', (T) => {
    const n = 9, w = 34, g = 8, x0 = (L - (n * w + (n - 1) * g)) / 2;
    const corpo = Array.from({ length: n }, (_, i) => `<rect x="${x0 + i * (w + g)}" y="10" width="${w}" height="3" rx="1.5" fill="${i === 4 ? T.ambar : T.borda}"/>`).join('');
    return { altura: 24, corpo, moldura: false };
  });
}

// ---------- terminal: um comando e a saída aparecendo linha a linha ----------
// linhas: array de strings ou de trechos [[cor, texto], ...]; cores por nome do tema.
function terminal(nome, titulo, comando, linhas) {
  gravar(nome, titulo, (T) => {
    const y0 = 76, lh = 21;
    const cor = (c) => T[c] ?? c;
    const saida = linhas.map((l, i) => {
      const trechos = typeof l === 'string' ? [['texto', l]] : l;
      return `<text x="28" y="${y0 + 26 + i * lh}" font-size="13" class="w" style="animation-delay:${(1.1 + i * 0.08).toFixed(2)}s">${trechos.map(([c, t]) => `<tspan fill="${cor(c)}"${c === 'ambar' && t.startsWith('#') ? ' class="b"' : ''}>${esc(t)}</tspan>`).join('')}</text>`;
    }).join('\n');
    const larguraCmd = (comando.length + 1) * 13 * CW;
    const prompt = 'saulo@contexto:~$ ';
    const xp = 28 + prompt.length * 13 * CW;
    const altura = y0 + 26 + linhas.length * lh + 24;
    const corpo = `<line x1="1" y1="40" x2="${L - 1}" y2="40" stroke="${T.borda}"/>
<text x="${L / 2}" y="25" font-size="11" fill="${T.apagado}" text-anchor="middle">saulo@contexto: ~</text><text x="${L - 24}" y="25" font-size="13" fill="${T.apagado}">×</text>
<text x="28" y="${y0}" font-size="13"><tspan fill="${T.verde}" class="b">${prompt}</tspan></text>
<clipPath id="digitar"><rect x="${xp}" y="${y0 - 14}" height="20" class="digitando" width="0"/></clipPath>
<text x="${xp}" y="${y0}" font-size="13" fill="${T.texto}" clip-path="url(#digitar)">${esc(comando)}</text>
${saida}
<text x="28" y="${altura - 20}" font-size="13" class="w" style="animation-delay:${(1.2 + linhas.length * 0.08).toFixed(2)}s"><tspan fill="${T.verde}" class="b">${prompt}</tspan><tspan fill="${T.ambar}" class="cursor">▋</tspan></text>`;
    return {
      altura, corpo,
      estilo: `${ESTILO_STREAM}.digitando{animation:digitar .9s steps(${comando.length}) .1s forwards}@keyframes digitar{to{width:${larguraCmd.toFixed(1)}px}}`,
    };
  });
}

// ---------- pipeline de um projeto ----------
function pipeline(nome, rotulo, etapas, nota) {
  gravar(nome, `${rotulo}: ${etapas.map(([t, s]) => `${t} (${s})`).join(', ')}. ${nota}`, (T) => {
    const n = etapas.length, g = 26, w = (L - 56 - (n - 1) * g) / n, y = 58, h = 62;
    const caixas = etapas.map(([t, s], i) => {
      const x = 28 + i * (w + g);
      const destaque = i === n - 1 ? T.ambar : i === Math.floor(n / 2) ? T.violeta : T.borda;
      const seta = i < n - 1 ? `<line x1="${x + w + 3}" y1="${y + h / 2}" x2="${x + w + g - 5}" y2="${y + h / 2}" stroke="${T.ambar}" stroke-width="1.4" stroke-dasharray="3 3" class="fluxo"/><path d="M${x + w + g - 6} ${y + h / 2 - 4}l5 4l-5 4" fill="none" stroke="${T.ambar}" stroke-width="1.4"/>` : '';
      return `<rect x="${x}" y="${y}" width="${w.toFixed(1)}" height="${h}" rx="6" fill="${T.fundo}" stroke="${destaque}"/>
<text x="${(x + w / 2).toFixed(1)}" y="${y + 26}" font-size="12.5" class="b" fill="${T.texto}" text-anchor="middle">${esc(t)}</text>
<text x="${(x + w / 2).toFixed(1)}" y="${y + 45}" font-size="10" fill="${T.apagado}" text-anchor="middle">${esc(s)}</text>${seta}`;
    }).join('\n');
    const corpo = `<rect x="28" y="24" width="8" height="8" fill="${T.ambar}"/><text x="44" y="32" font-size="11" fill="${T.ambar}" letter-spacing="3">${esc(rotulo.toUpperCase())}</text>
${caixas}
<text x="${L / 2}" y="${y + h + 30}" font-size="11" fill="${T.apagado}" text-anchor="middle">${esc(nota)}</text>`;
    return { altura: y + h + 48, corpo, estilo: `.fluxo{animation:fluxo 1s linear infinite}@keyframes fluxo{to{stroke-dashoffset:-12}}` };
  });
}

// ---------- telemetria: as duas contas no mesmo calendário, hábitos e linguagens ----------
function telemetria() {
  const SEMANAS = 30;
  const inicio = new Date(fim.getTime() - ((SEMANAS - 1) * 7 + fim.getUTCDay()) * 864e5);
  const porData = Object.fromEntries(ano.map((d) => [d.data, d]));
  const max = Math.max(1, ...ano.map((d) => d.pessoal + d.estagio));
  const horas = forja.horas.map((v, i) => [v, guilda.horas[i] ?? 0]);
  const maxH = Math.max(1, ...horas.map(([p, q]) => p + q));
  const totalCommits = horas.reduce((s, [p, q]) => s + p + q, 0);
  const picoH = horas.map(([p, q], i) => [p + q, i]).sort((a, b) => b[0] - a[0])[0][1];
  const lista = Object.entries(linguagens).filter(([n]) => !IGNORAR.has(n)).sort((x, y) => y[1] - x[1]);
  const totalL = lista.reduce((s, [, v]) => s + v, 0);
  const top = lista.slice(0, 5);
  gravar('telemetria', `Telemetria das duas contas: ${somaPessoal + somaEstagio} contribuições em 12 meses (${somaPessoal} pessoais, ${somaEstagio} no estágio); maior sequência de ${melhor} dias; ${totalCommits} commits, pico às ${picoH}h; linguagens: ${top.map(([n, v]) => `${n} ${((v / totalL) * 100).toFixed(0)}%`).join(', ')}.`, (T) => {
    const cel = 13, gap = 3, x0 = 28, y0 = 70;
    let grade = '';
    for (let s = 0; s < SEMANAS; s++) for (let d = 0; d < 7; d++) {
      const t = inicio.getTime() + (s * 7 + d) * 864e5;
      if (t > fim.getTime()) continue;
      const dia = porData[new Date(t).toISOString().slice(0, 10)] ?? { pessoal: 0, estagio: 0 };
      const total = dia.pessoal + dia.estagio;
      const cor = !total ? T.linha : dia.estagio > dia.pessoal ? T.violeta : T.ambar;
      const op = !total ? 1 : 0.35 + 0.65 * Math.min(1, total / (max * 0.6));
      grade += `<rect x="${x0 + s * (cel + gap)}" y="${y0 + d * (cel + gap)}" width="${cel}" height="${cel}" rx="2.5" fill="${cor}" fill-opacity="${op.toFixed(2)}"/>`;
    }
    const xs = x0 + SEMANAS * (cel + gap) + 30;
    const st = [['pessoal', somaPessoal, T.ambar], ['estágio', somaEstagio, T.violeta], ['dias ativos', ativos, T.texto], ['maior sequência', `${melhor} dias`, T.texto]];
    const lado = st.map(([r, v, cor], i) => `<text x="${xs}" y="${y0 + 12 + i * 28}" font-size="12" fill="${T.apagado}">${r}</text><text x="${L - 28}" y="${y0 + 12 + i * 28}" font-size="14" class="b" fill="${cor}" text-anchor="end">${v}</text>`).join('');
    const yh = y0 + 7 * (cel + gap) + 64, hh = 70, bw = (L - 56) / 24;
    const barras = horas.map(([p, q], i) => {
      const hp = (p / maxH) * hh, hq = (q / maxH) * hh, x = 28 + i * bw + 3;
      return `${p ? `<rect x="${x.toFixed(1)}" y="${(yh + hh - hp).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${hp.toFixed(1)}" rx="2" fill="${T.ambar}"/>` : ''}${q ? `<rect x="${x.toFixed(1)}" y="${(yh + hh - hp - hq - (p ? 2 : 0)).toFixed(1)}" width="${(bw - 6).toFixed(1)}" height="${hq.toFixed(1)}" rx="2" fill="${T.violeta}"/>` : ''}${!p && !q ? `<rect x="${x.toFixed(1)}" y="${yh + hh - 2}" width="${(bw - 6).toFixed(1)}" height="2" rx="1" fill="${T.linha}"/>` : ''}<text x="${(x + (bw - 6) / 2).toFixed(1)}" y="${yh + hh + 16}" font-size="9" fill="${T.apagado}" text-anchor="middle">${String(i).padStart(2, '0')}</text>`;
    }).join('');
    const yl = yh + hh + 64;
    let xl = 28;
    const PAL = [T.ambar, T.violeta, T.verde, T.suave, T.apagado];
    const barraL = top.map(([, v], i) => { const w = ((L - 56) * v) / top.reduce((s, [, x]) => s + x, 0); const r = `<rect x="${xl.toFixed(1)}" y="${yl}" width="${Math.max(w - 3, 1).toFixed(1)}" height="8" rx="2" fill="${PAL[i]}"/>`; xl += w; return r; }).join('');
    const legL = top.map(([n, v], i) => `<rect x="${28 + i * 162}" y="${yl + 24}" width="8" height="8" rx="2" fill="${PAL[i]}"/><text x="${42 + i * 162}" y="${yl + 32}" font-size="11.5" fill="${T.texto}">${esc(n)} <tspan fill="${T.apagado}">${((v / totalL) * 100).toFixed(0)}%</tspan></text>`).join('');
    const titulo = (y, t, d) => `<rect x="28" y="${y - 8}" width="8" height="8" fill="${T.ambar}"/><text x="44" y="${y}" font-size="11" fill="${T.ambar}" letter-spacing="3">${t}</text><text x="${L - 28}" y="${y}" font-size="11" fill="${T.apagado}" text-anchor="end">${esc(d)}</text>`;
    const corpo = `${titulo(38, 'CONTRIBUIÇÕES', `últimas ${SEMANAS} semanas · duas contas, uma pessoa`)}
${grade}${lado}
<rect x="${xs}" y="${y0 + 118}" width="9" height="9" rx="2" fill="${T.ambar}"/><text x="${xs + 15}" y="${y0 + 126}" font-size="11" fill="${T.suave}">sauloscm</text>
<rect x="${xs + 100}" y="${y0 + 118}" width="9" height="9" rx="2" fill="${T.violeta}"/><text x="${xs + 115}" y="${y0 + 126}" font-size="11" fill="${T.suave}">saulocmvirtus</text>
${titulo(yh - 22, 'HÁBITOS', `${totalCommits} commits · pico às ${String(picoH).padStart(2, '0')}h, horário de Brasília`)}
${barras}
${titulo(yl - 22, 'LINGUAGENS', 'por volume de código')}
${barraL}${legL}`;
    return { altura: yl + 56, corpo };
  });
}

// ---------- tocando por último (Spotify) ----------
async function tocando() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: segredo, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  const faixas = [];
  if (id && segredo && refresh) {
    try {
      const t = await (await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'content-type': 'application/x-www-form-urlencoded', authorization: 'Basic ' + Buffer.from(`${id}:${segredo}`).toString('base64') },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: refresh }),
      })).json();
      const j = await (await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=12', { headers: { authorization: `Bearer ${t.access_token}` } })).json();
      const vistas = new Set();
      for (const { track } of j.items ?? []) {
        if (vistas.has(track.id) || faixas.length === 3) continue;
        vistas.add(track.id);
        const img = track.album.images.at(-1)?.url;
        const capa = img ? `data:image/jpeg;base64,${Buffer.from(await (await fetch(img)).arrayBuffer()).toString('base64')}` : '';
        faixas.push({ nome: track.name, artista: track.artists.map((a) => a.name).join(', '), capa });
      }
    } catch (e) {
      console.error('Spotify:', e.message);
    }
  }
  const corta = (s, n) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
  gravar('tocando', faixas.length ? 'Ouvindo por último: ' + faixas.map((f) => `${f.nome}, de ${f.artista}`).join('; ') : 'Nenhuma música recente', (T) => {
    const titulo = `<rect x="28" y="24" width="8" height="8" fill="${T.ambar}"/><text x="44" y="32" font-size="11" fill="${T.ambar}" letter-spacing="3">TOCANDO POR ÚLTIMO</text><text x="${L - 28}" y="32" font-size="11" fill="${T.apagado}" text-anchor="end">via spotify</text>`;
    if (!faixas.length) return { altura: 90, corpo: `${titulo}<text x="28" y="66" font-size="13" fill="${T.apagado}">nada tocando agora.</text>` };
    const w = (L - 56 - 24) / 3;
    const corpo = titulo + faixas.map((f, i) => {
      const x = 28 + i * (w + 12);
      return `<rect x="${x}" y="50" width="${w.toFixed(1)}" height="64" rx="6" fill="${T.fundo}" stroke="${T.borda}"/>
<clipPath id="capa${i}"><rect x="${x + 8}" y="58" width="48" height="48" rx="4"/></clipPath>
${f.capa ? `<image x="${x + 8}" y="58" width="48" height="48" href="${f.capa}" clip-path="url(#capa${i})"/>` : ''}
<text x="${x + 66}" y="78" font-size="12.5" class="b" fill="${T.texto}">${esc(corta(f.nome, 21))}</text>
<text x="${x + 66}" y="97" font-size="11" fill="${T.apagado}">${esc(corta(f.artista, 23))}</text>`;
    }).join('');
    return { altura: 136, corpo };
  });
}

// ---------- montagem ----------
hero();
impacto();
divisor();
terminal('term-system-prompt', 'Terminal. cat system_prompt.md. Sistema: você é Saulo Costa, estudante de Engenharia de Computação na UFPB, estagiário de desenvolvimento em João Pessoa. Regras: responder só com os trechos recuperados e citar a seção; sem dados de clientes, as demos usam dados fictícios.', 'cat system_prompt.md', [
  [['ambar', '# system']],
  ...quebrar('Você é Saulo Costa, estudante de Engenharia de Computação na UFPB (conclusão prevista em 2027) e estagiário de desenvolvimento em João Pessoa. Você coloca IA para trabalhar em produção: agentes que consultam dados com segurança, robôs que conferem cobranças venda a venda e sistemas que deixam os dados de cada equipe com ela. Três coisas que você entregou: Sagaz, Nexo e Oluasin.', 96),
  '',
  [['ambar', '# regras']],
  ...quebrar('- responda só com os trechos recuperados e cite a seção, como [01];', 96),
  ...quebrar('- se a resposta não estiver no contexto, diga isso em vez de adivinhar;', 96),
  ...quebrar('- dados de clientes nunca entram no contexto: as demos usam dados fictícios.', 96),
]);
pipeline('pipeline-sagaz', 'sagaz · agente de dados', [['pergunta', 'em português'], ['catálogo', '~5.000 tabelas'], ['claude', 'ferramentas + memória'], ['sql', 'somente leitura'], ['resposta', 'com o sql que prova']], 'as mesmas ferramentas ficam expostas por um servidor MCP · custo de cada pergunta registrado');
pipeline('pipeline-nexo', 'nexo · central de automações', [['login único', 'sessão por pessoa'], ['permissões', 'por automação'], ['containers', '7+ automações'], ['execuções', 'progresso ao vivo'], ['agendamento', 'rodadas sozinhas']], 'rede interna isolada · identidade passada por cabeçalho que o portal remove na entrada');
pipeline('pipeline-oluasin', 'oluasin · app local-first', [['sqlite local', 'dados no PC'], ['sincronia', 'entre os PCs'], ['webrtc', 'voz e tela'], ['licenças', 'assinadas Ed25519'], ['atualização', 'assinada']], 'funciona offline · servidor de licenças nunca recebe o conteúdo das equipes');
terminal('term-ingestion-log', 'Terminal. journalctl -u saulo --since 2023 --reverse. 2026-05, Virtus Consultoria, estagiário em desenvolvimento de software e automação. 2025, PET-Saúde UFPB/SUS-PB, pesquisador e desenvolvedor. 2023, Outlier, especialista em IA. UFPB, Engenharia de Computação, conclusão prevista em 2027.', 'journalctl -u saulo --since 2023 --reverse', [
  [['apagado', '2026-05  '], ['ambar', 'Virtus Consultoria'], ['texto', ' · Estagiário em Desenvolvimento e Automação'], ['apagado', ' · mai 2026 → hoje']],
  ...quebrar('central de automações com login único e 7+ automações em containers; robôs de extração e conciliação com Playwright e APIs; emissor de NFS-e no padrão nacional, com XML assinado por certificado digital; agente com a API do Claude sobre um warehouse em DuckDB e dbt.', 86).map((t) => [['apagado', '         '], ['suave', t]]),
  '',
  [['apagado', '2025     '], ['ambar', 'PET-Saúde UFPB / SUS-PB'], ['texto', ' · Pesquisador e Desenvolvedor'], ['apagado', ' · 2025 → hoje']],
  ...quebrar('ciclo completo do Neolis, triagem neonatal para o SUS-PB: portal dos pais, onboarding com ambiente de treino, segurança e monitoramento, com Flask, PostgreSQL, Docker e GitHub Actions.', 86).map((t) => [['apagado', '         '], ['suave', t]]),
  '',
  [['apagado', '2023     '], ['ambar', 'Outlier'], ['texto', ' · Especialista em IA (freelance)'], ['apagado', ' · remoto']],
  [['apagado', '         '], ['suave', 'prompts e avaliações de qualidade e segurança para treinar modelos de linguagem.']],
  '',
  [['apagado', '2027     '], ['ambar', 'UFPB'], ['texto', ' · Bacharelado em Engenharia de Computação'], ['apagado', ' · ainda indexando.']],
]);
telemetria();
await tocando();
terminal('term-endpoint', 'Terminal. curl sauloscm.github.io/contato. E-mail saulocm1@gmail.com, LinkedIn saulo-costa-ma, portfólio sauloscm.github.io, currículo sauloscm.github.io/curriculo.', 'curl -s sauloscm.github.io/contato', [
  [['texto', '{']],
  [['texto', '  '], ['violeta', '"email"'], ['texto', ': '], ['verde', '"saulocm1@gmail.com"'], ['texto', ',']],
  [['texto', '  '], ['violeta', '"linkedin"'], ['texto', ': '], ['verde', '"linkedin.com/in/saulo-costa-ma"'], ['texto', ',']],
  [['texto', '  '], ['violeta', '"portfolio"'], ['texto', ': '], ['verde', '"sauloscm.github.io"'], ['texto', ',']],
  [['texto', '  '], ['violeta', '"curriculo"'], ['texto', ': '], ['verde', '"sauloscm.github.io/curriculo"']],
  [['texto', '}']],
]);
