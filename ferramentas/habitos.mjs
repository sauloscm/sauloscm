// Gera habitos.svg: commits por hora do dia e por dia da semana nos repositórios da conta.
// Substitui o plugin habits do lowlighter/metrics, que quebrou quando o GitHub tirou os commits dos eventos de push.
// Só os totais vão para a imagem; nomes de repositórios e mensagens nunca saem do script.
// Uso: GH_TOKEN=... node ferramentas/habitos.mjs [saida.svg]
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.GH_TOKEN;
const DIAS = 365;
const FUSO = -3; // America/Fortaleza, sem horário de verão
const desde = new Date(Date.now() - DIAS * 864e5).toISOString();

async function gql(query, variables) {
  const r = await fetch('https://api.github.com/graphql', {
    method: 'POST',
    headers: { authorization: `bearer ${TOKEN}`, 'content-type': 'application/json' },
    body: JSON.stringify({ query, variables }),
  });
  const j = await r.json();
  if (j.errors) throw new Error(j.errors.map((e) => e.message).join('; '));
  return j.data;
}

const { viewer } = await gql(`{ viewer { id repositories(first: 100, ownerAffiliations: OWNER, isFork: false) { nodes { nameWithOwner refs(refPrefix: "refs/heads/", first: 50) { nodes { name } } } } } }`);
const porHora = Array(24).fill(0);
const porDia = Array(7).fill(0);
let total = 0;
const vistos = new Set(); // o mesmo commit aparece em várias branches

for (const repo of viewer.repositories.nodes) {
  const [owner, name] = repo.nameWithOwner.split('/');
  for (const { name: branch } of repo.refs.nodes) {
  let cursor = null;
  do {
    const d = await gql(
      `query($owner: String!, $name: String!, $ref: String!, $author: ID!, $since: GitTimestamp!, $cursor: String) {
        repository(owner: $owner, name: $name) { ref(qualifiedName: $ref) { target { ... on Commit {
          history(first: 100, after: $cursor, since: $since, author: { id: $author }) {
            pageInfo { hasNextPage endCursor } nodes { oid authoredDate } } } } } } }`,
      { owner, name, ref: `refs/heads/${branch}`, author: viewer.id, since: desde, cursor },
    );
    const h = d.repository.ref.target.history;
    for (const { oid, authoredDate } of h.nodes) {
      if (vistos.has(oid)) continue;
      vistos.add(oid);
      const local = new Date(new Date(authoredDate).getTime() + FUSO * 36e5);
      porHora[local.getUTCHours()]++;
      porDia[local.getUTCDay()]++;
      total++;
    }
    cursor = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
  } while (cursor);
  }
}

// Mesmo visual do template classic do metrics: título azul, texto cinza, barras verdes, fundo transparente.
const L = 480, A = 320;
const fonte = `-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif`;
function barras(valores, rotulos, x0, y0, largura, altura) {
  const max = Math.max(1, ...valores);
  const passo = largura / valores.length;
  const lb = Math.max(4, passo * 0.55);
  return valores.map((v, i) => {
    const h = Math.round((v / max) * altura);
    const x = x0 + i * passo + (passo - lb) / 2;
    const topo = y0 + altura - h;
    const valor = v ? `<text x="${x + lb / 2}" y="${topo - 4}" class="v">${v}</text>` : '';
    const barra = v ? `<rect x="${x}" y="${topo}" width="${lb}" height="${Math.max(h, 2)}" rx="${Math.min(4, lb / 2)}" class="b"/>` : `<rect x="${x}" y="${y0 + altura - 2}" width="${lb}" height="2" rx="1" class="z"/>`;
    return `${barra}${valor}<text x="${x + lb / 2}" y="${y0 + altura + 14}" class="r">${rotulos[i]}</text>`;
  }).join('');
}
const horas = porHora.map((_, i) => String(i).padStart(2, '0'));
const dias = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L}" height="${A}" viewBox="0 0 ${L} ${A}">
<style>
text{font-family:${fonte}}
.t{fill:#0366d6;font-size:16px}.s{fill:#777;font-size:12px}
.r{fill:#777;font-size:9px;text-anchor:middle}.v{fill:#777;font-size:9px;text-anchor:middle}
.b{fill:#2ea043}.z{fill:#959da5;opacity:.35}
</style>
<text x="0" y="18" class="t">Hábitos de commit</text>
<text x="0" y="36" class="s">${total} commits nos últimos 12 meses, no horário de Brasília</text>
<text x="0" y="66" class="s">Por hora do dia</text>
${barras(porHora, horas, 0, 88, L, 70)}
<text x="0" y="208" class="s">Por dia da semana</text>
${barras(porDia, dias, 0, 230, L * 0.6, 70)}
</svg>`;
writeFileSync(process.argv[2] ?? 'habitos.svg', svg);
console.log(`habitos.svg: ${total} commits`);
