// Conta os commits da conta do estágio (saulocmvirtus) por dia e por hora, em todas as branches.
// Grava só números em dados/guilda.json: nenhum nome de repositório, cliente ou mensagem sai daqui.
// Uso: VIRTUS_TOKEN=... node ferramentas/guilda.mjs
import { writeFileSync } from 'node:fs';

const TOKEN = process.env.VIRTUS_TOKEN;
const FUSO = -3;
const desde = new Date(Date.now() - 366 * 864e5).toISOString();
// Identidades com que o Saulo assinou commits no estágio; commits de colegas ficam de fora.
const LOGINS = new Set(['saulocmvirtus', 'sauloscm']);
const ehMeu = ({ user, email, name }) =>
  (user && LOGINS.has(user.login)) || /saulo|marcelsantiago/i.test(email ?? '') || /^saulo/i.test(name ?? '');

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

const repos = [];
let cur = null;
do {
  const d = await gql(`query($c: String) { viewer { repositories(first: 100, after: $c, affiliations: [OWNER, COLLABORATOR, ORGANIZATION_MEMBER]) {
    pageInfo { hasNextPage endCursor } nodes { nameWithOwner isFork refs(refPrefix: "refs/heads/", first: 50) { nodes { name } } } } } }`, { c: cur });
  repos.push(...d.viewer.repositories.nodes.filter((r) => !r.isFork));
  cur = d.viewer.repositories.pageInfo.hasNextPage ? d.viewer.repositories.pageInfo.endCursor : null;
} while (cur);

const vistos = new Set();
const comMeusCommits = new Set();
const dias = {};
const horas = Array(24).fill(0);
const semana = Array(7).fill(0);
for (const repo of repos) {
  const [owner, name] = repo.nameWithOwner.split('/');
  for (const { name: branch } of repo.refs.nodes) {
    let c = null;
    do {
      const d = await gql(`query($o: String!, $n: String!, $r: String!, $s: GitTimestamp!, $c: String) {
        repository(owner: $o, name: $n) { ref(qualifiedName: $r) { target { ... on Commit {
          history(first: 100, after: $c, since: $s) { pageInfo { hasNextPage endCursor }
            nodes { oid authoredDate author { name email user { login } } } } } } } } }`,
        { o: owner, n: name, r: `refs/heads/${branch}`, s: desde, c });
      const h = d.repository.ref?.target?.history;
      if (!h) break;
      for (const k of h.nodes) {
        if (vistos.has(k.oid) || !ehMeu(k.author)) continue;
        vistos.add(k.oid);
        comMeusCommits.add(repo.nameWithOwner);
        const local = new Date(new Date(k.authoredDate).getTime() + FUSO * 36e5);
        const dia = local.toISOString().slice(0, 10);
        dias[dia] = (dias[dia] ?? 0) + 1;
        horas[local.getUTCHours()]++;
        semana[local.getUTCDay()]++;
      }
      c = h.pageInfo.hasNextPage ? h.pageInfo.endCursor : null;
    } while (c);
  }
}
// Linguagens só dos repositórios em que o Saulo commitou, somadas: os nomes dos repositórios não são gravados.
const linguagens = {};
for (const nome of comMeusCommits) {
  const [o, n] = nome.split('/');
  const d = await gql(`query($o: String!, $n: String!) { repository(owner: $o, name: $n) { languages(first: 20) { edges { size node { name } } } } }`, { o, n });
  for (const { size, node } of d.repository.languages.edges) linguagens[node.name] = (linguagens[node.name] ?? 0) + size;
}
const ordenado = Object.fromEntries(Object.entries(dias).sort());
writeFileSync('dados/guilda.json', JSON.stringify({ atualizado: new Date().toISOString().slice(0, 10), total: vistos.size, dias: ordenado, horas, semana, linguagens }, null, 1) + '\n');
console.log(`guilda: ${vistos.size} commits em ${Object.keys(dias).length} dias`);
