<picture><source media="(prefers-color-scheme: dark)" srcset="assets/hero-dark.svg"><img src="assets/hero-light.svg" width="100%" alt="Contexto: Saulo Costa. Pergunta: quem é o saulo costa? Resposta: constrói agentes de IA, automações e ferramentas internas, do protótipo ao deploy; Engenharia de Computação na UFPB, conclusão em 2027, João Pessoa. Fontes: Sagaz, Nexo, Oluasin, Neolis. Ao lado, um espaço de embeddings em que a pergunta acende os 5 vizinhos mais próximos."></picture>

<p align="center">
  <a href="https://sauloscm.github.io"><img src="https://img.shields.io/badge/sauloscm.github.io-F2A93B?style=flat-square&logo=googlechrome&logoColor=1A1408" alt="sauloscm.github.io"></a>
  <a href="https://sauloscm.github.io/curriculo/"><img src="https://img.shields.io/badge/curr%C3%ADculo-15171B?style=flat-square&logo=readdotcv&logoColor=ECE9E3" alt="currículo"></a>
  <a href="https://www.linkedin.com/in/saulo-costa-ma"><img src="https://img.shields.io/badge/linkedin-A594FF?style=flat-square&logoColor=1A1408" alt="linkedin"></a>
  <a href="mailto:saulocm1@gmail.com"><img src="https://img.shields.io/badge/email-5BD6A2?style=flat-square&logo=gmail&logoColor=1A1408" alt="email"></a>
</p>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/impacto-dark.svg"><img src="assets/impacto-light.svg" width="100%" alt="Impacto: 7+ automações em produção; cerca de 5.000 tabelas ao alcance do agente de dados; 60+ etapas no teste de ponta a ponta do Oluasin; contribuições em 12 meses somando a conta pessoal e a do estágio."></picture>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 00 · system prompt

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/term-system-prompt-dark.svg"><img src="assets/term-system-prompt-light.svg" width="100%" alt="Terminal. cat system_prompt.md. Sistema: você é Saulo Costa, estudante de Engenharia de Computação na UFPB e estagiário de desenvolvimento em João Pessoa. Regras: responder só com os trechos recuperados e citar a seção; dados de clientes nunca entram no contexto, as demos usam dados fictícios."></picture>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 01 · retrieved chunks

<sub>top-k = 3 · o código é privado (empresa ou produto próprio); cada fonte leva a uma demo com dados fictícios</sub>

<a href="https://sauloscm.github.io/projetos/warehouse-mcp/"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/pipeline-sagaz-dark.svg"><img src="assets/pipeline-sagaz-light.svg" width="100%" alt="Pipeline do Sagaz: pergunta em português, catálogo de cerca de 5.000 tabelas, Claude com ferramentas e memória, SQL somente leitura, resposta com o SQL que a prova."></picture></a>

<table>
<tr>
<td width="110" valign="top"><code>query</code></td>
<td valign="top"><strong>Sagaz</strong> · Nov 2026<br>Pergunte sobre os dados de um ERP em português e receba a resposta com o SQL que a comprova.</td>
</tr>
<tr>
<td valign="top"><code>context</code></td>
<td valign="top">API do Claude · MCP (FastMCP) · DuckDB · dbt · Python · Flask</td>
</tr>
<tr>
<td valign="top"><code>output</code></td>
<td valign="top">

- Warehouse em DuckDB e dbt (staging, core e marts, com testes) sobre o backup de um ERP contábil de cerca de 5.000 tabelas.
- O agente escolhe as tabelas pelo catálogo, roda SQL em modo somente leitura e mostra a consulta junto da resposta.
- Pede esclarecimento quando a pergunta é ambígua, lembra a conversa e registra tokens e custo de cada pergunta.
- As mesmas ferramentas ficam disponíveis para qualquer cliente MCP.

</td>
</tr>
<tr>
<td valign="top"><code>source</code></td>
<td valign="top"><a href="https://sauloscm.github.io/projetos/warehouse-mcp">sauloscm.github.io/projetos/warehouse-mcp</a></td>
</tr>
</table>

<a href="https://sauloscm.github.io/projetos/central-automacoes/"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/pipeline-nexo-dark.svg"><img src="assets/pipeline-nexo-light.svg" width="100%" alt="Pipeline do Nexo: login único, permissões por automação, mais de 7 automações em containers, execuções com progresso ao vivo, agendamento."></picture></a>

<table>
<tr>
<td width="110" valign="top"><code>query</code></td>
<td valign="top"><strong>Nexo</strong> · Set 2026<br>Uma porta só para as automações da empresa, com quem pode o quê e o registro de cada execução.</td>
</tr>
<tr>
<td valign="top"><code>context</code></td>
<td valign="top">Node.js · Express · PostgreSQL · Flask · FastAPI · Playwright · Docker Compose</td>
</tr>
<tr>
<td valign="top"><code>output</code></td>
<td valign="top">

- Portal com login por pessoa e permissões por automação; cada automação roda no seu container, numa rede interna isolada.
- Robô com Playwright que entra num portal com verificação em duas etapas e confere as taxas cobradas venda a venda.
- Emissor de NFS-e no padrão nacional: XML assinado com certificado digital, DANFSe em PDF e envio por e-mail.
- Painel de execuções com progresso ao vivo e agendamento que roda as automações sozinho.

</td>
</tr>
<tr>
<td valign="top"><code>source</code></td>
<td valign="top"><a href="https://sauloscm.github.io/projetos/central-automacoes">sauloscm.github.io/projetos/central-automacoes</a></td>
</tr>
</table>

<a href="https://sauloscm.github.io/projetos/oluasin/"><picture><source media="(prefers-color-scheme: dark)" srcset="assets/pipeline-oluasin-dark.svg"><img src="assets/pipeline-oluasin-light.svg" width="100%" alt="Pipeline do Oluasin: SQLite local, sincronia entre os PCs, voz e tela por WebRTC, licenças assinadas com Ed25519, atualização assinada."></picture></a>

<table>
<tr>
<td width="110" valign="top"><code>query</code></td>
<td valign="top"><strong>Oluasin</strong> · 2026<br>Chat, voz, tela, páginas, kanban e planilha para equipes, com os dados nos próprios PCs.</td>
</tr>
<tr>
<td valign="top"><code>context</code></td>
<td valign="top">Electron · React · TypeScript · SQLite · WebRTC · Rust/WebAssembly · Cloudflare Workers</td>
</tr>
<tr>
<td valign="top"><code>output</code></td>
<td valign="top">

- Local-first: cada PC tem seu banco e os PCs sincronizam direto entre si, inclusive depois de ficarem offline.
- Voz e tela compartilhada ponto a ponto; páginas com importação do Notion, kanban, calendário e planilha com fórmulas em português.
- Licenças assinadas com Ed25519 e um painel que controla versões e máquinas sem nunca receber o conteúdo das equipes.
- Atualização automática assinada e testes de ponta a ponta com mais de 60 etapas, simulando dois PCs.

</td>
</tr>
<tr>
<td valign="top"><code>source</code></td>
<td valign="top"><a href="https://sauloscm.github.io/projetos/oluasin">sauloscm.github.io/projetos/oluasin</a></td>
</tr>
</table>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 02 · ingestion log

<sub>mais recentes primeiro</sub>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/term-ingestion-log-dark.svg"><img src="assets/term-ingestion-log-light.svg" width="100%" alt="Terminal. journalctl -u saulo --since 2023 --reverse. 2026-05, Virtus Consultoria, estagiário em desenvolvimento de software e automação. 2025, PET-Saúde UFPB/SUS-PB, pesquisador e desenvolvedor. 2023, Outlier, especialista em IA. UFPB, Engenharia de Computação, conclusão prevista em 2027."></picture>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 03 · embeddings

<sub>um namespace para cada tipo de coisa</sub>

<table>
<tr>
<td width="160" valign="top"><code>linguagens/</code></td>
<td>
<img src="https://img.shields.io/badge/Python-F2A93B?style=flat-square&logo=python&logoColor=1A1408" alt="Python">
<img src="https://img.shields.io/badge/TypeScript-F2A93B?style=flat-square&logo=typescript&logoColor=1A1408" alt="TypeScript">
<img src="https://img.shields.io/badge/JavaScript-F2A93B?style=flat-square&logo=javascript&logoColor=1A1408" alt="JavaScript">
<img src="https://img.shields.io/badge/SQL-F2A93B?style=flat-square&logoColor=1A1408" alt="SQL">
<img src="https://img.shields.io/badge/Rust-F2A93B?style=flat-square&logo=rust&logoColor=1A1408" alt="Rust">
<img src="https://img.shields.io/badge/C%2B%2B-F2A93B?style=flat-square&logo=cplusplus&logoColor=1A1408" alt="C++">
</td>
</tr>
<tr>
<td valign="top"><code>ia/</code></td>
<td>
<img src="https://img.shields.io/badge/API_do_Claude-A594FF?style=flat-square&logo=anthropic&logoColor=1A1408" alt="API do Claude">
<img src="https://img.shields.io/badge/agentes_com_ferramentas-A594FF?style=flat-square&logoColor=1A1408" alt="agentes com ferramentas">
<img src="https://img.shields.io/badge/MCP-A594FF?style=flat-square&logoColor=1A1408" alt="MCP">
<img src="https://img.shields.io/badge/avalia%C3%A7%C3%A3o_de_LLMs-A594FF?style=flat-square&logoColor=1A1408" alt="avaliação de LLMs">
</td>
</tr>
<tr>
<td valign="top"><code>backend-frontend/</code></td>
<td>
<img src="https://img.shields.io/badge/FastAPI-15171B?style=flat-square&logo=fastapi&logoColor=ECE9E3" alt="FastAPI">
<img src="https://img.shields.io/badge/Flask-15171B?style=flat-square&logo=flask&logoColor=ECE9E3" alt="Flask">
<img src="https://img.shields.io/badge/Node.js-15171B?style=flat-square&logo=nodedotjs&logoColor=ECE9E3" alt="Node.js">
<img src="https://img.shields.io/badge/Express-15171B?style=flat-square&logo=express&logoColor=ECE9E3" alt="Express">
<img src="https://img.shields.io/badge/React-15171B?style=flat-square&logo=react&logoColor=ECE9E3" alt="React">
<img src="https://img.shields.io/badge/Electron-15171B?style=flat-square&logo=electron&logoColor=ECE9E3" alt="Electron">
<img src="https://img.shields.io/badge/Tailwind_CSS-15171B?style=flat-square&logo=tailwindcss&logoColor=ECE9E3" alt="Tailwind CSS">
</td>
</tr>
<tr>
<td valign="top"><code>dados/</code></td>
<td>
<img src="https://img.shields.io/badge/DuckDB-5BD6A2?style=flat-square&logo=duckdb&logoColor=1A1408" alt="DuckDB">
<img src="https://img.shields.io/badge/dbt-5BD6A2?style=flat-square&logo=dbt&logoColor=1A1408" alt="dbt">
<img src="https://img.shields.io/badge/PostgreSQL-5BD6A2?style=flat-square&logo=postgresql&logoColor=1A1408" alt="PostgreSQL">
<img src="https://img.shields.io/badge/SQLite-5BD6A2?style=flat-square&logo=sqlite&logoColor=1A1408" alt="SQLite">
<img src="https://img.shields.io/badge/pandas-5BD6A2?style=flat-square&logo=pandas&logoColor=1A1408" alt="pandas">
</td>
</tr>
<tr>
<td valign="top"><code>automação-infra/</code></td>
<td>
<img src="https://img.shields.io/badge/Playwright-15171B?style=flat-square&logoColor=ECE9E3" alt="Playwright">
<img src="https://img.shields.io/badge/Docker-15171B?style=flat-square&logo=docker&logoColor=ECE9E3" alt="Docker">
<img src="https://img.shields.io/badge/GitHub_Actions-15171B?style=flat-square&logo=githubactions&logoColor=ECE9E3" alt="GitHub Actions">
<img src="https://img.shields.io/badge/Cloudflare_Workers-15171B?style=flat-square&logo=cloudflareworkers&logoColor=ECE9E3" alt="Cloudflare Workers">
<img src="https://img.shields.io/badge/WebRTC-15171B?style=flat-square&logo=webrtc&logoColor=ECE9E3" alt="WebRTC">
</td>
</tr>
</table>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 04 · telemetry

<sub>a conta pessoal e a do estágio somadas; da conta do estágio entram só contagens</sub>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/telemetria-dark.svg"><img src="assets/telemetria-light.svg" width="100%" alt="Telemetria das duas contas: contribuições no mesmo calendário, hábitos de commit por hora e linguagens mais usadas."></picture>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/tocando-dark.svg"><img src="assets/tocando-light.svg" width="100%" alt="Músicas ouvidas por último no Spotify"></picture>

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/divisor-dark.svg"><img src="assets/divisor-light.svg" width="100%" alt=""></picture>

## 05 · endpoint

<picture><source media="(prefers-color-scheme: dark)" srcset="assets/term-endpoint-dark.svg"><img src="assets/term-endpoint-light.svg" width="100%" alt="Terminal. curl sauloscm.github.io/contato. E-mail saulocm1@gmail.com, LinkedIn saulo-costa-ma, portfólio sauloscm.github.io, currículo sauloscm.github.io/curriculo."></picture>

<p align="center"><sub><a href="mailto:saulocm1@gmail.com">saulocm1@gmail.com</a> · <a href="https://www.linkedin.com/in/saulo-costa-ma">linkedin.com/in/saulo-costa-ma</a> · <a href="https://sauloscm.github.io">sauloscm.github.io</a></sub></p>
