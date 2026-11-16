// Gera as imagens do perfil no tema "fogueira": ferro, osso e brasa, arte em ASCII.
// Saída em assets/. Só totais vão para as imagens: nenhum nome de repositório, cliente ou mensagem.
// Uso: GH_TOKEN=... [SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... SPOTIFY_REFRESH_TOKEN=...] node ferramentas/cartoes.mjs
// Para iterar no visual sem consultar o GitHub de novo: CARTOES_CACHE=caminho.json (criado na primeira execução).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const LOGIN = 'sauloscm';
const FUSO = -3; // America/Fortaleza, sem horário de verão
const L = 840; // largura de todos os cartões
mkdirSync('assets', { recursive: true });

// ---------- tema ----------
const C = {
  fundo: '#0d0c0a', painel: '#14120f', borda: '#3b3328', bordaInterna: '#26211b', bronze: '#9a8455',
  osso: '#d6cbb0', ossoEscuro: '#a39778', cinza: '#6f675a', apagado: '#3a342b', brasa: '#c4632b', sangue: '#8c2a1b',
};

const fonte = (nome, arquivo) => `@font-face{font-family:'${nome}';src:url(data:font/woff2;base64,${readFileSync(`ferramentas/fontes/${arquivo}`).toString('base64')}) format('woff2')}`;
const FONTES = {
  cinzel: fonte('Cinzel', 'cinzel.woff2'),
  garamond: fonte('Garamond', 'garamond.woff2'),
  italico: fonte('GaramondI', 'garamond-italico.woff2'),
  mono: fonte('Mono', 'mono.woff2'),
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function painel(nome, altura, corpo, { fontes = [], estilo = '', titulo = '' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${altura}" viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(titulo)}">
<title>${esc(titulo)}</title>
<style>${fontes.map((f) => FONTES[f]).join('')}
.mono{font-family:'Mono',monospace;white-space:pre}.cinzel{font-family:'Cinzel',serif}.gar{font-family:'Garamond',serif}.ita{font-family:'GaramondI',serif;font-style:italic}
${estilo}</style>
<defs>
<filter id="grao" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" seed="4"/><feColorMatrix values="0 0 0 0 .84  0 0 0 0 .8  0 0 0 0 .69  0 0 0 .07 0"/></filter>
<radialGradient id="vinheta" cx=".5" cy=".45" r=".75"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
</defs>
<rect width="${L}" height="${altura}" rx="4" fill="${C.painel}"/>
<rect width="${L}" height="${altura}" rx="4" filter="url(#grao)"/>
${corpo}
<rect width="${L}" height="${altura}" rx="4" fill="url(#vinheta)" pointer-events="none"/>
<rect x=".5" y=".5" width="${L - 1}" height="${altura - 1}" rx="4" fill="none" stroke="${C.borda}"/>
<rect x="6.5" y="6.5" width="${L - 13}" height="${altura - 13}" fill="none" stroke="${C.bordaInterna}"/>
${[[6.5, 6.5], [L - 6.5, 6.5], [6.5, altura - 6.5], [L - 6.5, altura - 6.5]].map(([x, y]) => `<path d="M${x} ${y - 4}l4 4l-4 4l-4 -4Z" fill="${C.bronze}"/>`).join('')}
</svg>`;
  writeFileSync(`assets/${nome}.svg`, svg);
  console.log(`assets/${nome}.svg`, Math.round(svg.length / 1024), 'KB');
}

// Texto monoespaçado em trechos coloridos: [[cor, texto], ...]
const trechos = (lista) => lista.map(([cor, t]) => `<tspan fill="${cor}">${esc(t)}</tspan>`).join('');

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

// Últimos 12 meses das duas contas, dia a dia.
const hoje = new Date(Date.now() + FUSO * 36e5);
const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
const ano = [];
for (let t = fim.getTime() - 364 * 864e5; t <= fim.getTime(); t += 864e5) {
  const data = new Date(t).toISOString().slice(0, 10);
  ano.push({ data, forja: forja.dias[data] ?? 0, guilda: guilda.dias[data] ?? 0 });
}
const somaForja = ano.reduce((s, d) => s + d.forja, 0);
const somaGuilda = ano.reduce((s, d) => s + d.guilda, 0);
let melhor = 0, seq = 0;
for (const d of ano) { seq = d.forja + d.guilda ? seq + 1 : 0; melhor = Math.max(melhor, seq); }
let atual = 0;
for (let i = ano.length - 1; i >= 0; i--) {
  if (ano[i].forja + ano[i].guilda) atual++;
  else if (i < ano.length - 1) break;
}
const ativos = ano.filter((d) => d.forja + d.guilda).length;
const pico = Math.max(...ano.map((d) => d.forja + d.guilda));

// ---------- banner: cena em ASCII e o título ----------
function banner() {
  const arte = JSON.parse(readFileSync('dados/banner.json', 'utf8'));
  const CORES = { ceu: C.fundo, estrela: '#5d5649', lua: '#ddd1b2', colina: '#3a342b', ruinas: '#5a5144', penhasco: '#5f5240', figura: '#c9b994', espada: '#9d9a91', corvo: '#8a8170', brasa: C.brasa };
  const fs = 800 / (arte.cols * 0.6), lh = fs * 1.2, y0 = 34;
  const linhas = arte.linhas.map((l, i) => `<text x="20" y="${(y0 + i * lh).toFixed(1)}" class="mono" font-size="${fs.toFixed(3)}">${l.map(([cor, t]) => cor === 'brasa' ? `<tspan fill="${CORES.brasa}" class="brasa" style="animation-delay:${((i * 7) % 23) / 10}s">${esc(t)}</tspan>` : `<tspan fill="${CORES[cor]}">${esc(t)}</tspan>`).join('')}</text>`).join('\n');
  const yt = y0 + arte.linhas.length * lh + 30;
  const corpo = `${linhas}
<line x1="80" y1="${yt}" x2="${L / 2 - 30}" y2="${yt}" stroke="${C.borda}"/><line x1="${L / 2 + 30}" y1="${yt}" x2="${L - 80}" y2="${yt}" stroke="${C.borda}"/>
<text x="${L / 2}" y="${yt + 5}" class="gar" font-size="16" fill="${C.bronze}" text-anchor="middle">†</text>
<text x="${L / 2}" y="${yt + 50}" class="cinzel" font-size="40" letter-spacing="10" fill="${C.osso}" text-anchor="middle">SAULO COSTA</text>
<text x="${L / 2}" y="${yt + 82}" class="ita" font-size="18" fill="${C.ossoEscuro}" text-anchor="middle">Forjador de automações, agentes e ferramentas internas, do protótipo ao deploy.</text>
<text x="${L / 2}" y="${yt + 108}" class="cinzel" font-size="11" letter-spacing="3" fill="${C.cinza}" text-anchor="middle">ENGENHARIA DE COMPUTAÇÃO · UFPB · JOÃO PESSOA</text>`;
  painel('banner', Math.round(yt + 134), corpo, {
    fontes: ['mono', 'cinzel', 'italico', 'garamond'],
    titulo: 'Saulo Costa: forjador de automações, agentes e ferramentas internas, do protótipo ao deploy. Engenharia de Computação, UFPB, João Pessoa.',
    estilo: `.brasa{animation:brasa 2.6s ease-in-out infinite}@keyframes brasa{0%,100%{opacity:.2}50%{opacity:1}}`,
  });
}

// ---------- títulos de capítulo ----------
function capitulo(nome, numeral, titulo, subtitulo) {
  const texto = `${numeral} · ${titulo.toUpperCase()}`;
  const meia = texto.length * 8.6;
  const corpo = `
<line x1="40" y1="34" x2="${L / 2 - meia - 18}" y2="34" stroke="${C.borda}"/><line x1="${L / 2 + meia + 18}" y1="34" x2="${L - 40}" y2="34" stroke="${C.borda}"/>
<path d="M${L / 2 - meia - 14} 30l4 4l-4 4l-4 -4Z" fill="${C.bronze}"/><path d="M${L / 2 + meia + 14} 30l4 4l-4 4l-4 -4Z" fill="${C.bronze}"/>
<text x="${L / 2}" y="41" class="cinzel" font-size="20" letter-spacing="4" fill="${C.osso}" text-anchor="middle">${esc(texto)}</text>
<text x="${L / 2}" y="64" class="ita" font-size="14" fill="${C.cinza}" text-anchor="middle">${esc(subtitulo)}</text>`;
  painel(nome, 82, corpo, { fontes: ['cinzel', 'italico'], titulo: texto });
}

// ---------- I · juramento (descrição de item) ----------
function juramento() {
  const lore = [
    'Estudante de Engenharia de Computação na UFPB e estagiário de desenvolvimento em João Pessoa.',
    'Dizem que forja autômatos que trabalham enquanto o escritório dorme, e agentes que leem os',
    'arquivos antigos da guilda sem jamais reescrevê-los.',
  ];
  const linhas = [
    ['GUILDA', 'Virtus Consultoria · estágio em desenvolvimento e automação'],
    ['ORDEM', 'PET-Saúde UFPB / SUS-PB · saúde digital'],
    ['FORJA', 'Oluasin · app local-first, em piloto com colegas'],
    ['GRIMÓRIO', 'sauloscm.github.io · demonstrações com dados fictícios'],
  ];
  const corpo = `
<text x="44" y="52" class="cinzel" font-size="20" letter-spacing="2" fill="${C.osso}">Saulo Costa</text>
<text x="44" y="74" class="ita" font-size="15" fill="${C.cinza}">aprendiz de engenheiro, portador da pena e do teclado</text>
<line x1="44" y1="90" x2="${L - 44}" y2="90" stroke="${C.bordaInterna}"/>
${lore.map((t, i) => `<text x="44" y="${120 + i * 24}" class="ita" font-size="17" fill="${C.ossoEscuro}">${esc(t)}</text>`).join('\n')}
<line x1="44" y1="${120 + lore.length * 24}" x2="${L - 44}" y2="${120 + lore.length * 24}" stroke="${C.bordaInterna}"/>
${linhas.map(([r, v], i) => {
    const y = 120 + lore.length * 24 + 34 + i * 28;
    return `<text x="44" y="${y}" class="cinzel" font-size="12" letter-spacing="2.5" fill="${C.bronze}">${r}</text><text x="170" y="${y}" class="gar" font-size="17" fill="${C.osso}">${esc(v)}</text>`;
  }).join('\n')}`;
  painel('juramento', 120 + lore.length * 24 + 34 + linhas.length * 28 + 10, corpo, {
    fontes: ['cinzel', 'garamond', 'italico'],
    titulo: 'Saulo Costa, estudante de Engenharia de Computação na UFPB e estagiário de desenvolvimento em João Pessoa. Guilda: Virtus Consultoria. Ordem: PET-Saúde UFPB/SUS-PB. Forja: Oluasin. Grimório: sauloscm.github.io.',
  });
}

// ---------- II · feitos (tela de atributos) ----------
function feitos() {
  const itens = [
    ['Nível', String(somaForja + somaGuilda)],
    ['Autômatos em serviço', '7+'],
    ['Tabelas sob o agente', '~5.000'],
    ['Provações do teste e2e', '60+'],
    ['Dias junto à fogueira', String(ativos)],
    ['Maior sequência', `${melhor} dias`],
  ];
  const col = (L - 88 - 40) / 2;
  const corpo = itens.map(([r, v], i) => {
    const x = 44 + (i % 2) * (col + 40), y = 56 + Math.floor(i / 2) * 40;
    return `<text x="${x}" y="${y}" class="gar" font-size="18" fill="${C.ossoEscuro}">${esc(r)}</text>
<line x1="${x + r.length * 8.4 + 10}" y1="${y - 4}" x2="${x + col - v.length * 12 - 14}" y2="${y - 4}" stroke="${C.apagado}" stroke-dasharray="1 5"/>
<text x="${x + col}" y="${y}" class="cinzel" font-size="20" fill="${C.osso}" text-anchor="end">${esc(v)}</text>`;
  }).join('\n') + `
<text x="44" y="${56 + 3 * 40 + 4}" class="ita" font-size="14" fill="${C.cinza}">o nível são as contribuições dos últimos 12 meses, somando a conta pessoal e a do estágio.</text>`;
  painel('feitos', 56 + 3 * 40 + 28, corpo, { fontes: ['cinzel', 'garamond', 'italico'], titulo: itens.map(([r, v]) => `${r}: ${v}`).join('; ') });
}

// ---------- III · o arsenal (inventário) ----------
function arsenal() {
  const grupos = [
    ['ARMAS', 'Python · TypeScript · JavaScript · SQL · Rust · C++'],
    ['CATALISADORES', 'API do Claude · agentes com ferramentas · MCP · avaliação de LLMs'],
    ['FERRAMENTAS', 'Playwright · pandas · DuckDB · dbt · FastAPI · Flask · React · Electron'],
    ['FORTIFICAÇÕES', 'Docker · PostgreSQL · SQLite · Cloudflare Workers · GitHub Actions · WebRTC'],
  ];
  const corpo = grupos.map(([r, v], i) => {
    const y = 52 + i * 38;
    return `<text x="44" y="${y}" class="cinzel" font-size="12" letter-spacing="2.5" fill="${C.bronze}">${r}</text><text x="210" y="${y}" class="gar" font-size="17" fill="${C.osso}">${esc(v)}</text>${i < grupos.length - 1 ? `<line x1="44" y1="${y + 16}" x2="${L - 44}" y2="${y + 16}" stroke="${C.bordaInterna}"/>` : ''}`;
  }).join('\n');
  painel('arsenal', 52 + grupos.length * 38, corpo, { fontes: ['cinzel', 'garamond'], titulo: grupos.map(([r, v]) => `${r}: ${v}`).join('. ') });
}

// ---------- IV · crônicas: calendário em ASCII das duas contas ----------
function cronicas() {
  const SEMANAS = 26;
  const inicio = new Date(fim.getTime() - ((SEMANAS - 1) * 7 + fim.getUTCDay()) * 864e5);
  const porData = Object.fromEntries(ano.map((d) => [d.data, d]));
  const dias = [];
  for (let t = inicio.getTime(); t <= fim.getTime(); t += 864e5) dias.push(porData[new Date(t).toISOString().slice(0, 10)] ?? { forja: 0, guilda: 0, data: new Date(t).toISOString().slice(0, 10) });
  const max = Math.max(1, ...dias.map((d) => d.forja + d.guilda));
  const fs = 15, cw = fs * 0.6, lh = 19, x0 = 92, y0 = 84;
  const ROT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let grade = '';
  for (let dia = 0; dia < 7; dia++) {
    const partes = [];
    for (let s = 0; s < SEMANAS; s++) {
      const d = dias[s * 7 + dia];
      if (!d) { partes.push([C.fundo, '  ']); continue; }
      const t = d.forja + d.guilda;
      if (!t) { partes.push([C.apagado, '· ']); continue; }
      const nivel = Math.min(3, Math.floor((t / max) * 4));
      partes.push([d.guilda > d.forja ? C.brasa : C.osso, '░▒▓█'[nivel] + ' ']);
    }
    grade += `<text x="44" y="${y0 + dia * lh}" class="gar" font-size="13" fill="${C.cinza}">${ROT[dia]}</text><text x="${x0}" y="${y0 + dia * lh}" class="mono" font-size="${fs}">${trechos(partes)}</text>\n`;
  }
  const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  let meses = '', ultimo = -1;
  for (let s = 0; s < SEMANAS; s++) {
    const m = new Date(inicio.getTime() + s * 7 * 864e5).getUTCMonth();
    if (m !== ultimo) { meses += `<text x="${x0 + s * 2 * cw}" y="${y0 - 24}" class="cinzel" font-size="10" letter-spacing="1" fill="${C.cinza}">${MESES[m].toUpperCase()}</text>`; ultimo = m; }
  }
  const st = [
    ['conta pessoal', String(somaForja), C.osso],
    ['conta do estágio', String(somaGuilda), C.brasa],
    ['dia mais intenso', String(pico), C.osso],
    ['sequência atual', `${atual} ${atual === 1 ? 'dia' : 'dias'}`, C.osso],
  ];
  const xs = x0 + SEMANAS * 2 * cw + 40;
  const lado = st.map(([r, v, cor], i) => `<text x="${xs}" y="${y0 + 8 + i * 30}" class="ita" font-size="15" fill="${C.ossoEscuro}">${esc(r)}</text><text x="${L - 44}" y="${y0 + 8 + i * 30}" class="cinzel" font-size="17" fill="${cor}" text-anchor="end">${esc(v)}</text>`).join('');
  const yl = y0 + 7 * lh + 22;
  const corpo = `<text x="44" y="38" class="ita" font-size="15" fill="${C.cinza}">últimas ${SEMANAS} semanas, as duas contas na mesma página do diário</text>
${meses}${grade}
<line x1="${xs - 20}" y1="${y0 - 14}" x2="${xs - 20}" y2="${y0 + 6 * lh}" stroke="${C.bordaInterna}"/>
${lado}
<text x="44" y="${yl}" class="mono" font-size="14">${trechos([[C.osso, '█'], [C.ossoEscuro, ' ']])}</text><text x="64" y="${yl}" class="gar" font-size="15" fill="${C.ossoEscuro}">mais da conta pessoal (sauloscm)</text>
<text x="320" y="${yl}" class="mono" font-size="14">${trechos([[C.brasa, '█']])}</text><text x="340" y="${yl}" class="gar" font-size="15" fill="${C.ossoEscuro}">mais da conta do estágio (saulocmvirtus)</text>
<text x="${L - 44}" y="${yl}" class="mono" font-size="13" fill="${C.cinza}" text-anchor="end">· ░ ▒ ▓ █</text>`;
  painel('cronicas', yl + 30, corpo, {
    fontes: ['mono', 'cinzel', 'garamond', 'italico'],
    titulo: `Calendário das duas contas nas últimas ${SEMANAS} semanas. ${somaForja + somaGuilda} contribuições em 12 meses: ${somaForja} na conta pessoal e ${somaGuilda} na do estágio.`,
  });
}

// ---------- IV · hábitos em ASCII ----------
function habitos() {
  const horas = forja.horas.map((v, i) => [v, guilda.horas[i] ?? 0]);
  const semana = forja.semana.map((v, i) => [v, guilda.semana[i] ?? 0]);
  const ALT = 9, fs = 13, cw = fs * 0.6, lh = 12, x0 = 44, y0 = 74;
  const max = Math.max(1, ...horas.map(([p, q]) => p + q));
  const cols = horas.map(([p, q]) => {
    const total = Math.round(((p + q) / max) * ALT);
    const fp = p + q ? Math.round((p / (p + q)) * total) : 0;
    return { fp: Math.max(fp, p ? 1 : 0), fq: Math.max(total - fp, q ? 1 : 0) };
  });
  let colunas = '';
  for (let r = 0; r < ALT; r++) {
    const nivel = ALT - r; // 9 no topo, 1 na base
    const partes = cols.map(({ fp, fq }) => nivel <= fp ? [C.osso, '██ '] : nivel <= fp + fq ? [C.brasa, '▓▓ '] : [C.fundo, '   ']);
    colunas += `<text x="${x0}" y="${y0 + r * lh}" class="mono" font-size="${fs}">${trechos(partes)}</text>`;
  }
  const rotHoras = horas.map((_, i) => String(i).padStart(2, '0') + ' ').join('');
  const yh = y0 + ALT * lh + 6;
  const maxS = Math.max(1, ...semana.map(([p, q]) => p + q));
  const ROT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const ys = yh + 58;
  const barras = semana.map(([p, q], i) => {
    const np = Math.round((p / maxS) * 40), nq = Math.round((q / maxS) * 40);
    return `<text x="44" y="${ys + i * 20}" class="gar" font-size="14" fill="${C.cinza}">${ROT[i]}</text><text x="92" y="${ys + i * 20}" class="mono" font-size="14">${trechos([[C.osso, '█'.repeat(np)], [C.brasa, '▓'.repeat(nq)], [C.cinza, ` ${p + q}`]])}</text>`;
  }).join('\n');
  const total = horas.reduce((s, [p, q]) => s + p + q, 0);
  const picoH = horas.map(([p, q], i) => [p + q, i]).sort((a, b) => b[0] - a[0])[0][1];
  const corpo = `<text x="44" y="38" class="ita" font-size="15" fill="${C.cinza}">${total} commits em 12 meses, no horário de Brasília. A fogueira arde mais às ${String(picoH).padStart(2, '0')}h.</text>
${colunas}
<text x="${x0}" y="${yh + 8}" class="mono" font-size="${fs}" fill="${C.cinza}">${rotHoras}</text>
<text x="44" y="${ys - 26}" class="cinzel" font-size="11" letter-spacing="2.5" fill="${C.bronze}">POR DIA DA SEMANA</text>
${barras}
<text x="${L - 44}" y="${ys + 6 * 20}" class="mono" font-size="14" text-anchor="end">${trechos([[C.osso, '█'], [C.ossoEscuro, ' pessoal   '], [C.brasa, '▓'], [C.ossoEscuro, ' estágio']])}</text>`;
  painel('habitos', ys + 7 * 20 + 14, corpo, { fontes: ['mono', 'cinzel', 'garamond', 'italico'], titulo: `Hábitos de commit das duas contas: ${total} commits em 12 meses, pico às ${picoH}h.` });
}

// ---------- IV · línguas ----------
function idiomas() {
  const lista = Object.entries(linguagens).filter(([n]) => !IGNORAR.has(n)).sort((x, y) => y[1] - x[1]);
  const total = lista.reduce((s, [, v]) => s + v, 0);
  const top = lista.slice(0, 6);
  const LARG = 44;
  const corpo = `<text x="44" y="38" class="ita" font-size="15" fill="${C.cinza}">línguas em que escrevo, por volume de código nas duas contas</text>
` + top.map(([n, v], i) => {
    const y = 72 + i * 26, k = Math.max(1, Math.round((v / total) * LARG));
    return `<text x="44" y="${y}" class="gar" font-size="17" fill="${C.osso}">${esc(n)}</text><text x="200" y="${y}" class="mono" font-size="14">${trechos([[i === 0 ? C.osso : C.ossoEscuro, '█'.repeat(k)], [C.apagado, '░'.repeat(LARG - k)]])}</text><text x="${L - 44}" y="${y}" class="cinzel" font-size="14" fill="${C.ossoEscuro}" text-anchor="end">${((v / total) * 100).toFixed(1)}%</text>`;
  }).join('\n');
  painel('linguagens', 72 + top.length * 26 + 4, corpo, { fontes: ['mono', 'cinzel', 'garamond', 'italico'], titulo: 'Linguagens mais usadas: ' + top.map(([n, v]) => `${n} ${((v / total) * 100).toFixed(0)}%`).join(', ') });
}

// ---------- V · o bardo (Spotify) ----------
async function bardo() {
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
  let corpo, altura;
  if (faixas.length) {
    const w = (L - 88 - 24) / 3;
    corpo = `<defs><filter id="sepia"><feColorMatrix values=".39 .77 .19 0 0  .35 .69 .17 0 0  .27 .53 .13 0 0  0 0 0 1 0"/><feComponentTransfer><feFuncR type="linear" slope=".8"/><feFuncG type="linear" slope=".8"/><feFuncB type="linear" slope=".8"/></feComponentTransfer></filter></defs>
<text x="44" y="38" class="ita" font-size="15" fill="${C.cinza}">o que o bardo tocou por último na taverna, via Spotify</text>` + faixas.map((f, i) => {
      const x = 44 + i * (w + 12);
      return `<rect x="${x}" y="54" width="${w}" height="70" fill="${C.fundo}" stroke="${C.bordaInterna}"/>
${f.capa ? `<image x="${x + 9}" y="63" width="52" height="52" href="${f.capa}" filter="url(#sepia)"/><rect x="${x + 9}" y="63" width="52" height="52" fill="none" stroke="${C.borda}"/>` : ''}
<text x="${x + 72}" y="86" class="ita" font-size="16" fill="${C.osso}">${esc(corta(f.nome, 20))}</text>
<text x="${x + 72}" y="106" class="cinzel" font-size="10" letter-spacing="1" fill="${C.cinza}">${esc(corta(f.artista.toUpperCase(), 24))}</text>`;
    }).join('');
    altura = 146;
  } else {
    corpo = `<text x="${L / 2}" y="54" class="ita" font-size="16" fill="${C.cinza}" text-anchor="middle">O bardo descansa. Nenhuma canção recente na taverna.</text>`;
    altura = 86;
  }
  painel('bardo', altura, corpo, {
    fontes: ['cinzel', 'italico'],
    titulo: faixas.length ? 'Ouvindo por último: ' + faixas.map((f) => `${f.nome}, de ${f.artista}`).join('; ') : 'Nenhuma música recente',
  });
}

// ---------- divisor ----------
function divisor() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="34" viewBox="0 0 ${L} 34" role="img" aria-label="">
<line x1="120" y1="17" x2="${L / 2 - 24}" y2="17" stroke="${C.borda}"/><line x1="${L / 2 + 24}" y1="17" x2="${L - 120}" y2="17" stroke="${C.borda}"/>
<path d="M${L / 2} 9l8 8l-8 8l-8 -8Z" fill="none" stroke="${C.bronze}"/><path d="M${L / 2} 14l3 3l-3 3l-3 -3Z" fill="${C.bronze}"/></svg>`;
  writeFileSync('assets/divisor.svg', svg);
}

banner();
divisor();
capitulo('cap-1', 'I', 'O Juramento', 'quem empunha a pena');
capitulo('cap-2', 'II', 'Feitos', 'atributos que posso provar');
capitulo('cap-3', 'III', 'O Arsenal', 'o que carrego para a batalha');
capitulo('cap-4', 'IV', 'Crônicas', 'duas contas, uma só pessoa');
capitulo('cap-5', 'V', 'O Bardo', 'canções da taverna');
juramento();
feitos();
arsenal();
cronicas();
habitos();
idiomas();
await bardo();
