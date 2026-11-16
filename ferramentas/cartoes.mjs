// Gera as imagens do perfil no tema "grimório neon" (fantasia medieval cyberpunk).
// Saída em assets/. Só totais vão para as imagens: nenhum nome de repositório, cliente ou mensagem.
// Uso: GH_TOKEN=... [SPOTIFY_CLIENT_ID=... SPOTIFY_CLIENT_SECRET=... SPOTIFY_REFRESH_TOKEN=...] node ferramentas/cartoes.mjs
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const LOGIN = 'sauloscm';
const FUSO = -3; // America/Fortaleza, sem horário de verão
const L = 840; // largura de todos os cartões
mkdirSync('assets', { recursive: true });

// ---------- tema ----------
const C = {
  fundo: '#0b0912', fundo2: '#130f1f', borda: '#3a2f55', ouro: '#d8b45a', ouroClaro: '#f3dc96',
  ciano: '#38f2e0', magenta: '#ff4fa8', violeta: '#9b7bff', brasa: '#ff9a3c', esmeralda: '#5ee68a',
  texto: '#e9e4f5', apagado: '#8e86a8', vazio: '#1c1830',
};
const PALETA = [C.ciano, C.magenta, C.violeta, C.ouro, C.esmeralda, C.brasa];

const fonte = (nome, arquivo) => `@font-face{font-family:'${nome}';src:url(data:font/woff2;base64,${readFileSync(`ferramentas/fontes/${arquivo}`).toString('base64')}) format('woff2')}`;
const FONTES = {
  gotica: fonte('Gotica', 'gotica.woff2'),
  cinzel: fonte('Cinzel', 'cinzel.woff2'),
  mono: fonte('Mono', 'mono.woff2'),
  monoBold: fonte('MonoB', 'mono-bold.woff2'),
};
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function cartao(nome, altura, corpo, { fontes = ['mono'], estilo = '', titulo = '' } = {}) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${L}" height="${altura}" viewBox="0 0 ${L} ${altura}" role="img" aria-label="${esc(titulo)}">
<title>${esc(titulo)}</title>
<style>${fontes.map((f) => FONTES[f]).join('')}
.mono{font-family:'Mono',monospace}.monob{font-family:'MonoB',monospace}.cinzel{font-family:'Cinzel',serif}.gotica{font-family:'Gotica',serif}
${estilo}</style>
<defs>
<linearGradient id="fundo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.fundo2}"/><stop offset="1" stop-color="${C.fundo}"/></linearGradient>
<linearGradient id="ouro" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.ouroClaro}"/><stop offset=".55" stop-color="${C.ouro}"/><stop offset="1" stop-color="#9c7a2c"/></linearGradient>
<filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="brilhoForte" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
</defs>
<rect x="1" y="1" width="${L - 2}" height="${altura - 2}" rx="14" fill="url(#fundo)" stroke="${C.borda}"/>
${cantos(altura)}
${corpo}
</svg>`;
  writeFileSync(`assets/${nome}.svg`, svg);
  console.log(`assets/${nome}.svg`, Math.round(svg.length / 1024), 'KB');
}

// Cantoneiras douradas de manuscrito nos quatro cantos.
function cantos(altura) {
  const c = (x, y, sx, sy) => `<path d="M${x + sx * 10} ${y + sy * 30}V${y + sy * 10}H${x + sx * 30}M${x + sx * 16} ${y + sy * 16}l${sx * 6} ${sy * 6}" stroke="${C.ouro}" stroke-width="1.5" fill="none" opacity=".8"/>`;
  return c(0, 0, 1, 1) + c(L, 0, -1, 1) + c(0, altura, 1, -1) + c(L, altura, -1, -1);
}

// Gerador pseudoaleatório com semente fixa, para o céu não mudar a cada atualização.
function aleatorio(semente) {
  let s = semente;
  return () => ((s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296);
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

const { user } = await gql(`query($l: String!) { user(login: $l) {
  contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } }
  repositories(first: 100, ownerAffiliations: OWNER, isFork: false) { nodes { nameWithOwner
    languages(first: 20) { edges { size node { name } } }
    refs(refPrefix: "refs/heads/", first: 50) { nodes { name } } } } } }`, { l: LOGIN });
const forjaDias = {};
for (const w of user.contributionsCollection.contributionCalendar.weeks) for (const d of w.contributionDays) forjaDias[d.date] = d.contributionCount;

// Hábitos da conta pessoal: horário de cada commit, em todas as branches, sem repetir commits.
const { viewer } = await gql('{ viewer { id } }');
const forjaHoras = Array(24).fill(0), forjaSemana = Array(7).fill(0);
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
        forjaHoras[local.getUTCHours()]++;
        forjaSemana[local.getUTCDay()]++;
      }
      c = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
    } while (c);
  }
}

const IGNORAR = new Set(['HTML', 'CSS', 'SCSS', 'Shell', 'PowerShell', 'Batchfile', 'Dockerfile', 'Makefile', 'TeX', 'Jupyter Notebook', 'Procfile', 'Inno Setup', 'NSIS']);
const linguagens = {};
for (const r of user.repositories.nodes) for (const { size, node } of r.languages.edges) linguagens[node.name] = (linguagens[node.name] ?? 0) + size;
for (const [n, s] of Object.entries(guilda.linguagens ?? {})) linguagens[n] = (linguagens[n] ?? 0) + s;

// ---------- banner ----------
function banner() {
  const A = 320;
  const r = aleatorio(7);
  const estrelas = Array.from({ length: 70 }, (_, i) => {
    const x = r() * L, y = r() * 200, raio = r() * 1.2 + 0.3;
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${raio.toFixed(2)}" fill="${C.texto}" class="estrela" style="animation-delay:${(r() * 4).toFixed(2)}s"/>`;
  }).join('');

  // Castelo de circuitos: torres com ameias, à direita.
  const base = A - 2;
  const torres = [
    [500, 60, 150], [548, 34, 110], [590, 74, 190], [652, 40, 140], [700, 90, 230], [778, 46, 165], [812, 30, 120],
  ];
  let castelo = '', janelas = '', trilhas = '';
  for (const [i, [x, w, h]] of torres.entries()) {
    const topo = base - h;
    const ameias = Math.max(2, Math.floor(w / 12));
    const passo = w / (ameias * 2 - 1);
    let d = `M${x} ${base}V${topo}`;
    for (let k = 0; k < ameias * 2 - 1; k++) d += k % 2 === 0 ? `v-8h${passo}v8` : `h${passo}`;
    d += `V${base}Z`;
    castelo += `<path d="${d}" fill="#08070d" stroke="${C.borda}" stroke-width="1"/>`;
    if (h > 180) castelo += `<path d="M${x + w / 2 - 14} ${topo - 8}L${x + w / 2} ${topo - 46}L${x + w / 2 + 14} ${topo - 8}Z" fill="#08070d" stroke="${C.borda}"/><line x1="${x + w / 2}" y1="${topo - 46}" x2="${x + w / 2}" y2="${topo - 64}" stroke="${C.magenta}" stroke-width="1.5" filter="url(#brilho)"/><circle cx="${x + w / 2}" cy="${topo - 66}" r="2.5" fill="${C.magenta}" filter="url(#brilho)" class="farol"/>`;
    for (let y = topo + 20; y < base - 24; y += 28) {
      for (let wx = x + 9; wx < x + w - 12; wx += 18) {
        if (r() < 0.45) continue;
        janelas += `<rect x="${wx}" y="${y}" width="5" height="9" rx="2.5" fill="${r() < 0.75 ? C.ciano : C.ouro}" class="janela" style="animation-delay:${(r() * 6).toFixed(2)}s"/>`;
      }
    }
    // Trilhas de circuito que sobem pelas torres e pulsam.
    const tx = x + w * (0.3 + r() * 0.4);
    trilhas += `<path d="M${tx} ${base}V${topo + 30}h${i % 2 ? 10 : -10}v-12" class="trilha" style="animation-delay:${(i * 0.4).toFixed(1)}s"/><circle cx="${tx + (i % 2 ? 10 : -10)}" cy="${topo + 18}" r="2" fill="${C.ciano}"/>`;
  }

  // Selo rúnico girando ao redor da lua.
  const lx = 690, ly = 92;
  const runas = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 24) * Math.PI * 2;
    const x1 = lx + Math.cos(a) * 62, y1 = ly + Math.sin(a) * 62;
    const x2 = lx + Math.cos(a) * (i % 3 ? 68 : 74), y2 = ly + Math.sin(a) * (i % 3 ? 68 : 74);
    return `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  }).join('');

  const corpo = `
<g>${estrelas}</g>
<circle cx="${lx}" cy="${ly}" r="40" fill="${C.ouroClaro}" opacity=".9" filter="url(#brilhoForte)"/>
<circle cx="${lx + 12}" cy="${ly - 8}" r="36" fill="${C.fundo2}" opacity=".55"/>
<g class="selo" stroke="${C.violeta}" stroke-width="1.2" fill="none" opacity=".8">
  <circle cx="${lx}" cy="${ly}" r="62"/><circle cx="${lx}" cy="${ly}" r="80" stroke-dasharray="2 6"/>${runas}
  <path d="M${lx} ${ly - 80}L${lx + 69} ${ly + 40}L${lx - 69} ${ly + 40}Z" opacity=".5"/><path d="M${lx} ${ly + 80}L${lx + 69} ${ly - 40}L${lx - 69} ${ly - 40}Z" opacity=".5"/>
</g>
<g>${castelo}</g><g>${janelas}</g><g>${trilhas}</g>
<rect x="2" y="${base - 30}" width="${L - 4}" height="30" fill="url(#neblina)"/>
<text x="44" y="70" class="mono" font-size="14" fill="${C.ciano}">~/grimorio $ <tspan fill="${C.texto}">whoami</tspan><tspan class="cursor" fill="${C.ciano}">▸</tspan></text>
<text x="40" y="160" class="gotica" font-size="84" fill="url(#ouro)" filter="url(#brilho)">Saulo Costa</text>
<text x="44" y="200" class="mono" font-size="15" fill="${C.texto}">forjo automações, agentes de IA e ferramentas</text>
<text x="44" y="222" class="mono" font-size="15" fill="${C.texto}">internas, do protótipo ao deploy.</text>
<text x="44" y="262" class="mono" font-size="12.5" fill="${C.apagado}"><tspan fill="${C.magenta}">◆</tspan> Engenharia de Computação · UFPB   <tspan fill="${C.magenta}">◆</tspan> João Pessoa, PB</text>`;
  cartao('banner', A, corpo.replace('<rect x="2" y="', '<defs><linearGradient id="neblina" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + C.violeta + '" stop-opacity="0"/><stop offset="1" stop-color="' + C.violeta + '" stop-opacity=".18"/></linearGradient></defs><rect x="2" y="'), {
    fontes: ['gotica', 'mono'],
    titulo: 'Saulo Costa: forjo automações, agentes de IA e ferramentas internas, do protótipo ao deploy. Engenharia de Computação, UFPB, João Pessoa.',
    estilo: `
.estrela{animation:piscar 4s ease-in-out infinite}@keyframes piscar{0%,100%{opacity:.25}50%{opacity:1}}
.janela{animation:janela 6s steps(1) infinite}@keyframes janela{0%,100%{opacity:.95}46%{opacity:.25}52%{opacity:.95}}
.trilha{fill:none;stroke:${C.ciano};stroke-width:1.4;stroke-dasharray:6 160;animation:pulso 3.2s linear infinite;filter:drop-shadow(0 0 3px ${C.ciano})}@keyframes pulso{from{stroke-dashoffset:166}to{stroke-dashoffset:0}}
.selo{transform-origin:690px 92px;animation:girar 60s linear infinite}@keyframes girar{to{transform:rotate(360deg)}}
.farol{animation:piscar 2s ease-in-out infinite}
.cursor{animation:piscar 1s steps(1) infinite}`,
  });
}

// ---------- títulos de capítulo ----------
function capitulo(nome, numeral, titulo, subtitulo) {
  const A = 64;
  const largura = titulo.length * 15 + numeral.length * 16 + 60;
  const fim = Math.min(L - 40, 60 + largura);
  const corpo = `
<text x="36" y="41" class="cinzel" font-size="24" fill="url(#ouro)">${numeral}<tspan fill="${C.magenta}" dx="10">·</tspan><tspan dx="10" fill="${C.texto}">${esc(titulo)}</tspan></text>
<line x1="${fim}" y1="33" x2="${L - 60}" y2="33" stroke="${C.borda}" stroke-width="1"/>
<path d="M${L - 60} 33l6 -6l6 6l-6 6Z" fill="${C.ciano}" filter="url(#brilho)"/>
<text x="${L - 76}" y="52" class="mono" font-size="11" fill="${C.apagado}" text-anchor="end">${esc(subtitulo)}</text>`;
  cartao(nome, A, corpo, { fontes: ['cinzel', 'mono'], titulo: `${numeral} · ${titulo}` });
}

// ---------- I · juramento ----------
function juramento() {
  const linhas = [
    ['$', 'cat juramento.md', C.ciano],
    ['', 'Sou o Saulo, estudante de Engenharia de Computação na UFPB e', C.texto],
    ['', 'estagiário de desenvolvimento. Coloco IA para trabalhar de verdade:', C.texto],
    ['', 'agentes que consultam dados com segurança, robôs que conferem', C.texto],
    ['', 'cobranças, sistemas que guardam os dados de cada equipe com ela.', C.texto],
    ['', '', C.texto],
    ['◆', 'guilda      Virtus Consultoria · estágio em desenvolvimento e automação', C.magenta],
    ['◆', 'ordem       PET-Saúde UFPB / SUS-PB · saúde digital (Neolis)', C.violeta],
    ['◆', 'forja       Oluasin · app local-first em piloto com colegas', C.ciano],
    ['◆', 'grimório    sauloscm.github.io · demos com dados fictícios', C.ouro],
  ];
  const corpo = linhas.map(([p, t, cor], i) => {
    const y = 48 + i * 25;
    if (!t) return '';
    if (p === '$') return `<text x="40" y="${y}" class="mono" font-size="14" fill="${cor}">~/grimorio $ <tspan fill="${C.texto}">${esc(t)}</tspan></text>`;
    if (p === '◆') {
      const [rotulo, ...resto] = t.split(/\s{2,}/);
      return `<text x="40" y="${y}" class="mono" font-size="14"><tspan fill="${cor}">◆ </tspan><tspan fill="${cor}" class="monob">${esc(rotulo.padEnd(12))}</tspan><tspan fill="${C.texto}" xml:space="preserve">${esc(resto.join(' '))}</tspan></text>`;
    }
    return `<text x="40" y="${y}" class="mono" font-size="14" fill="${cor}">${esc(t)}</text>`;
  }).join('\n');
  cartao('juramento', 300, corpo, {
    fontes: ['mono', 'monoBold'],
    titulo: 'Sou o Saulo, estudante de Engenharia de Computação na UFPB e estagiário de desenvolvimento. Guilda: Virtus Consultoria. Ordem: PET-Saúde UFPB/SUS-PB. Forja: Oluasin. Grimório: sauloscm.github.io.',
  });
}

// ---------- II · feitos ----------
function feitos(totalAno) {
  const itens = [
    [String(totalAno), 'contribuições no ano', 'conta pessoal + estágio', C.ciano],
    ['7+', 'automações no ar', 'central da empresa', C.magenta],
    ['~5.000', 'tabelas sob o agente', 'com SQL auditável', C.violeta],
    ['60+', 'etapas de teste e2e', 'dois PCs no Oluasin', C.ouro],
  ];
  const w = (L - 80 - 30) / 4;
  const corpo = itens.map(([n, t, s, cor], i) => {
    const x = 40 + i * (w + 10);
    return `<g><rect x="${x}" y="24" width="${w}" height="132" rx="10" fill="${C.fundo}" stroke="${cor}" stroke-opacity=".45"/>
<path d="M${x + 14} 24h30" stroke="${cor}" stroke-width="3" filter="url(#brilho)"/>
<text x="${x + 16}" y="82" class="monob" font-size="36" fill="${cor}" filter="url(#brilho)">${esc(n)}</text>
<text x="${x + 16}" y="112" class="mono" font-size="12.5" fill="${C.texto}">${esc(t)}</text>
<text x="${x + 16}" y="134" class="mono" font-size="10.5" fill="${C.apagado}">${esc(s)}</text></g>`;
  }).join('\n');
  cartao('feitos', 180, corpo, { fontes: ['mono', 'monoBold'], titulo: itens.map(([n, t]) => `${n} ${t}`).join('; ') });
}

// ---------- IV · crônicas (calendário 3D das duas contas) ----------
function cronicas() {
  const SEMANAS = 26;
  const hoje = new Date(Date.now() + FUSO * 36e5);
  const fim = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()));
  const inicio = new Date(fim.getTime() - ((SEMANAS - 1) * 7 + fim.getUTCDay()) * 864e5);
  const grade = [];
  for (let t = inicio.getTime(); t <= fim.getTime(); t += 864e5) {
    const data = new Date(t).toISOString().slice(0, 10);
    const idx = Math.round((t - inicio.getTime()) / 864e5);
    grade.push({ data, semana: Math.floor(idx / 7), dia: idx % 7, forja: forjaDias[data] ?? 0, guilda: guilda.dias[data] ?? 0 });
  }
  const max = Math.max(1, ...grade.map((g) => g.forja + g.guilda));
  const s = 13, a = s * 0.866, b = s * 0.5;
  const k = Math.min(7, 110 / max);
  const ox = 70, oy = 120;
  const cores = {
    forja: [C.ciano, '#1fa89d', '#137067'],
    guilda: [C.magenta, '#c22f7c', '#851d54'],
  };
  const cubo = (x, y, h, [topo, esq, dir]) => {
    const p = (pts) => pts.map((v) => v.toFixed(1)).join(' ');
    return `<polygon points="${p([x, y - h, x + a, y - h + b, x, y - h + 2 * b, x - a, y - h + b])}" fill="${topo}"/>` +
      `<polygon points="${p([x - a, y - h + b, x, y - h + 2 * b, x, y + 2 * b, x - a, y + b])}" fill="${esq}"/>` +
      `<polygon points="${p([x, y - h + 2 * b, x + a, y - h + b, x + a, y + b, x, y + 2 * b])}" fill="${dir}"/>`;
  };
  const ordem = [...grade].sort((p, q) => (p.semana + p.dia) - (q.semana + q.dia) || p.semana - q.semana);
  let iso = '';
  for (const g of ordem) {
    const x = ox + (g.semana - g.dia) * a + 7 * a;
    const y = oy + (g.semana + g.dia) * b;
    if (!g.forja && !g.guilda) {
      iso += `<polygon points="${[x, y, x + a, y + b, x, y + 2 * b, x - a, y + b].map((v) => v.toFixed(1)).join(' ')}" fill="${C.vazio}" stroke="#262038" stroke-width=".6"/>`;
      continue;
    }
    const hf = g.forja * k, hg = g.guilda * k;
    if (g.forja) iso += cubo(x, y, Math.max(hf, 3), cores.forja);
    if (g.guilda) iso += cubo(x, y - (g.forja ? Math.max(hf, 3) : 0), Math.max(hg, 3), cores.guilda);
  }

  // Estatísticas das duas contas juntas.
  const ano = [];
  for (let t = fim.getTime() - 364 * 864e5; t <= fim.getTime(); t += 864e5) {
    const d = new Date(t).toISOString().slice(0, 10);
    ano.push((forjaDias[d] ?? 0) + (guilda.dias[d] ?? 0));
  }
  const totalForja = Object.entries(forjaDias).filter(([d]) => d >= new Date(fim.getTime() - 364 * 864e5).toISOString().slice(0, 10)).reduce((s, [, n]) => s + n, 0);
  const totalGuilda = Object.entries(guilda.dias).filter(([d]) => d >= new Date(fim.getTime() - 364 * 864e5).toISOString().slice(0, 10)).reduce((s, [, n]) => s + n, 0);
  let melhor = 0, atual = 0;
  for (const n of ano) { atual = n ? atual + 1 : 0; melhor = Math.max(melhor, atual); }
  let corrente = 0;
  for (let i = ano.length - 1; i >= 0 && (ano[i] || i === ano.length - 1); i--) if (ano[i]) corrente++;
  const ativos = ano.filter(Boolean).length;
  const pico = Math.max(...ano);

  const st = [
    ['total em 12 meses', String(totalForja + totalGuilda), C.texto],
    ['forja pessoal', String(totalForja), C.ciano],
    ['guilda do estágio', String(totalGuilda), C.magenta],
    ['dias de forja acesa', String(ativos), C.ouro],
    ['maior sequência', `${melhor} dias`, C.violeta],
    ['sequência atual', `${corrente} ${corrente === 1 ? 'dia' : 'dias'}`, C.esmeralda],
    ['dia mais intenso', String(pico), C.brasa],
  ];
  const lado = st.map(([r, v, cor], i) => `<text x="560" y="${72 + i * 30}" class="mono" font-size="12" fill="${C.apagado}">${esc(r)}</text><text x="${L - 44}" y="${72 + i * 30}" class="monob" font-size="15" fill="${cor}" text-anchor="end">${esc(v)}</text>`).join('');
  const corpo = `
<text x="40" y="44" class="mono" font-size="12" fill="${C.apagado}">últimas ${SEMANAS} semanas · cada torre é um dia</text>
<g>${iso}</g>
<g transform="translate(40 ${360 - 34})"><rect width="12" height="12" rx="2" fill="${C.ciano}"/><text x="20" y="10.5" class="mono" font-size="12" fill="${C.texto}">forja pessoal (sauloscm)</text>
<rect x="230" width="12" height="12" rx="2" fill="${C.magenta}"/><text x="250" y="10.5" class="mono" font-size="12" fill="${C.texto}">guilda do estágio (saulocmvirtus)</text></g>
<line x1="540" y1="40" x2="540" y2="270" stroke="${C.borda}"/>
${lado}`;
  cartao('cronicas', 360, corpo, {
    fontes: ['mono', 'monoBold'],
    titulo: `Calendário 3D das duas contas nas últimas ${SEMANAS} semanas. ${totalForja + totalGuilda} contribuições em 12 meses: ${totalForja} na conta pessoal e ${totalGuilda} na do estágio. Maior sequência: ${melhor} dias.`,
  });
  return totalForja + totalGuilda;
}

// ---------- IV · hábitos ----------
function habitos() {
  const horas = forjaHoras.map((v, i) => [v, guilda.horas[i] ?? 0]);
  const semana = forjaSemana.map((v, i) => [v, guilda.semana[i] ?? 0]);
  const barras = (dados, rotulos, x0, y0, largura, altura) => {
    const max = Math.max(1, ...dados.map(([p, q]) => p + q));
    const passo = largura / dados.length, lb = Math.max(6, passo * 0.58);
    return dados.map(([p, q], i) => {
      const x = x0 + i * passo + (passo - lb) / 2;
      const hp = (p / max) * altura, hq = (q / max) * altura;
      let g = `<rect x="${x}" y="${y0 + altura - 2}" width="${lb}" height="2" rx="1" fill="${C.vazio}"/>`;
      if (p) g += `<rect x="${x}" y="${y0 + altura - hp}" width="${lb}" height="${Math.max(hp, 2)}" rx="2" fill="${C.ciano}"/>`;
      if (q) g += `<rect x="${x}" y="${y0 + altura - hp - hq - (p ? 2 : 0)}" width="${lb}" height="${Math.max(hq, 2)}" rx="2" fill="${C.magenta}"/>`;
      if (p + q) g += `<text x="${x + lb / 2}" y="${y0 + altura - hp - hq - 7}" class="mono" font-size="9" fill="${C.apagado}" text-anchor="middle">${p + q}</text>`;
      return g + `<text x="${x + lb / 2}" y="${y0 + altura + 15}" class="mono" font-size="9.5" fill="${C.apagado}" text-anchor="middle">${rotulos[i]}</text>`;
    }).join('');
  };
  const total = [...forjaHoras, ...guilda.horas].reduce((s, n) => s + n, 0);
  const pico = horas.map(([p, q], i) => [p + q, i]).sort((x, y) => y[0] - x[0])[0][1];
  const corpo = `
<text x="40" y="44" class="mono" font-size="12" fill="${C.apagado}">${total} commits em 12 meses, no horário de Brasília · a forja arde mais às <tspan fill="${C.ouro}">${String(pico).padStart(2, '0')}h</tspan></text>
<text x="40" y="78" class="cinzel" font-size="13" fill="${C.texto}">Por hora do dia</text>
${barras(horas, horas.map((_, i) => String(i).padStart(2, '0')), 40, 96, L - 80, 90)}
<text x="40" y="240" class="cinzel" font-size="13" fill="${C.texto}">Por dia da semana</text>
${barras(semana, ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'], 40, 258, 420, 80)}
<g transform="translate(520 300)"><rect width="12" height="12" rx="2" fill="${C.ciano}"/><text x="20" y="10.5" class="mono" font-size="12" fill="${C.texto}">forja pessoal</text>
<rect y="22" width="12" height="12" rx="2" fill="${C.magenta}"/><text x="20" y="32.5" class="mono" font-size="12" fill="${C.texto}">guilda do estágio</text></g>`;
  cartao('habitos', 380, corpo, { fontes: ['mono', 'cinzel'], titulo: `Hábitos de commit das duas contas: ${total} commits em 12 meses, pico às ${pico}h.` });
}

// ---------- IV · linguagens ----------
function idiomas() {
  const lista = Object.entries(linguagens).filter(([n]) => !IGNORAR.has(n)).sort((x, y) => y[1] - x[1]);
  const total = lista.reduce((s, [, v]) => s + v, 0);
  const top = lista.slice(0, 6);
  const outros = total - top.reduce((s, [, v]) => s + v, 0);
  if (outros > 0) top.push(['Outras', outros]);
  let x = 40;
  const barra = top.map(([n, v], i) => {
    const w = ((L - 80) * v) / total;
    const r = `<rect x="${x.toFixed(1)}" y="56" width="${Math.max(w - 2, 1).toFixed(1)}" height="14" rx="3" fill="${i < 6 ? PALETA[i] : C.apagado}"/>`;
    x += w;
    return r;
  }).join('');
  const legenda = top.map(([n, v], i) => {
    const cx = 40 + (i % 4) * 196, cy = 104 + Math.floor(i / 4) * 26;
    return `<circle cx="${cx + 5}" cy="${cy - 4}" r="5" fill="${i < 6 ? PALETA[i] : C.apagado}"/><text x="${cx + 18}" y="${cy}" class="mono" font-size="12.5" fill="${C.texto}">${esc(n)} <tspan fill="${C.apagado}">${((v / total) * 100).toFixed(1)}%</tspan></text>`;
  }).join('');
  const corpo = `<text x="40" y="40" class="mono" font-size="12" fill="${C.apagado}">línguas arcanas · por volume de código nas duas contas</text>${barra}${legenda}`;
  cartao('linguagens', 170, corpo, { fontes: ['mono'], titulo: 'Linguagens mais usadas: ' + top.map(([n, v]) => `${n} ${((v / total) * 100).toFixed(0)}%`).join(', ') });
}

// ---------- V · o bardo (Spotify) ----------
async function bardo() {
  const { SPOTIFY_CLIENT_ID: id, SPOTIFY_CLIENT_SECRET: segredo, SPOTIFY_REFRESH_TOKEN: refresh } = process.env;
  let faixas = [];
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
  let corpo;
  if (faixas.length) {
    const w = (L - 80 - 20) / 3;
    corpo = `<text x="40" y="40" class="mono" font-size="12" fill="${C.apagado}">o que o bardo tocou por último na taverna · via Spotify</text>` + faixas.map((f, i) => {
      const x = 40 + i * (w + 10);
      return `<rect x="${x}" y="56" width="${w}" height="76" rx="10" fill="${C.fundo}" stroke="${C.borda}"/>
<clipPath id="capa${i}"><rect x="${x + 10}" y="66" width="56" height="56" rx="6"/></clipPath>
${f.capa ? `<image x="${x + 10}" y="66" width="56" height="56" href="${f.capa}" clip-path="url(#capa${i})"/>` : ''}
<text x="${x + 78}" y="90" class="mono" font-size="12.5" fill="${C.texto}">${esc(corta(f.nome, 22))}</text>
<text x="${x + 78}" y="110" class="mono" font-size="11" fill="${C.apagado}">${esc(corta(f.artista, 25))}</text>
<g transform="translate(${x + w - 34} 72)" class="eq">${[0, 1, 2].map((k) => `<rect x="${k * 6}" y="0" width="4" height="14" rx="1" fill="${PALETA[i]}" style="animation-delay:${k * 0.25}s"/>`).join('')}</g>`;
    }).join('');
  } else {
    corpo = `<text x="40" y="70" class="mono" font-size="13" fill="${C.apagado}">o bardo descansa · nenhuma música recente na taverna</text>
<g transform="translate(${L - 80} 56)" opacity=".5">${[0, 1, 2].map((k) => `<rect x="${k * 6}" y="0" width="4" height="14" rx="1" fill="${C.apagado}"/>`).join('')}</g>`;
  }
  cartao('bardo', faixas.length ? 152 : 110, corpo, {
    fontes: ['mono'],
    titulo: faixas.length ? 'Ouvindo por último: ' + faixas.map((f) => `${f.nome}, de ${f.artista}`).join('; ') : 'Nenhuma música recente',
    estilo: `.eq rect{transform-box:fill-box;transform-origin:bottom;animation:eq 1.1s ease-in-out infinite alternate}@keyframes eq{from{transform:scaleY(.25)}to{transform:scaleY(1)}}`,
  });
}

// ---------- divisor ----------
function divisor() {
  const corpo = `<line x1="60" y1="20" x2="${L / 2 - 40}" y2="20" stroke="${C.borda}"/><line x1="${L / 2 + 40}" y1="20" x2="${L - 60}" y2="20" stroke="${C.borda}"/>
<path d="M${L / 2} 10l10 10l-10 10l-10 -10Z" fill="none" stroke="${C.ouro}"/><circle cx="${L / 2}" cy="20" r="3" fill="${C.ciano}" filter="url(#brilho)"/>
<circle cx="${L / 2 - 26}" cy="20" r="2" fill="${C.magenta}"/><circle cx="${L / 2 + 26}" cy="20" r="2" fill="${C.magenta}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="40" viewBox="0 0 ${L} 40" role="img" aria-label=""><defs><filter id="brilho" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>${corpo}</svg>`;
  writeFileSync('assets/divisor.svg', svg);
}

banner();
divisor();
capitulo('cap-1', 'I', 'O Juramento', 'quem empunha a pena');
capitulo('cap-2', 'II', 'Feitos', 'números que posso provar');
capitulo('cap-3', 'III', 'O Arsenal', 'ferramentas da forja');
capitulo('cap-4', 'IV', 'Crônicas da Forja', 'duas contas, uma só pessoa');
capitulo('cap-5', 'V', 'O Bardo', 'trilha sonora da forja');
juramento();
const totalAno = cronicas();
feitos(totalAno);
habitos();
idiomas();
await bardo();
