"""Monta o README.md do perfil a partir dos cartões em assets/. Rodar quando o texto mudar:
python ferramentas/readme.py
"""
from pathlib import Path
from urllib.parse import quote

RAIZ = Path(__file__).resolve().parent.parent


def pic(nome, alt, link=None):
    p = (f'<picture><source media="(prefers-color-scheme: dark)" srcset="assets/{nome}-dark.svg">'
         f'<img src="assets/{nome}-light.svg" width="100%" alt="{alt}"></picture>')
    return f'<a href="{link}">{p}</a>' if link else p


def selo(texto, cor, logo=None, escuro=False):
    rotulo = quote(texto.replace("-", "--").replace(" ", "_"))
    logo_cor = "ECE9E3" if escuro else "1A1408"
    extra = f"&logo={logo}" if logo else ""
    return f'<img src="https://img.shields.io/badge/{rotulo}-{cor}?style=flat-square{extra}&logoColor={logo_cor}" alt="{texto}">'


DIVISOR = pic("divisor", "")


def projeto(nome, data, resumo, contexto, saidas, fonte):
    itens = "\n".join(f"- {s}" for s in saidas)
    return f"""<table>
<tr>
<td width="110" valign="top"><code>query</code></td>
<td valign="top"><strong>{nome}</strong> · {data}<br>{resumo}</td>
</tr>
<tr>
<td valign="top"><code>context</code></td>
<td valign="top">{contexto}</td>
</tr>
<tr>
<td valign="top"><code>output</code></td>
<td valign="top">

{itens}

</td>
</tr>
<tr>
<td valign="top"><code>source</code></td>
<td valign="top"><a href="https://{fonte}">{fonte}</a></td>
</tr>
</table>"""


EMBEDDINGS = [
    ("linguagens/", "F2A93B", False, [("Python", "python"), ("TypeScript", "typescript"), ("JavaScript", "javascript"), ("SQL", None), ("Rust", "rust"), ("C++", "cplusplus")]),
    ("ia/", "A594FF", False, [("API do Claude", "anthropic"), ("agentes com ferramentas", None), ("MCP", None), ("avaliação de LLMs", None)]),
    ("backend-frontend/", "15171B", True, [("FastAPI", "fastapi"), ("Flask", "flask"), ("Node.js", "nodedotjs"), ("Express", "express"), ("React", "react"), ("Electron", "electron"), ("Tailwind CSS", "tailwindcss")]),
    ("dados/", "5BD6A2", False, [("DuckDB", "duckdb"), ("dbt", "dbt"), ("PostgreSQL", "postgresql"), ("SQLite", "sqlite"), ("pandas", "pandas")]),
    ("automação-infra/", "15171B", True, [("Playwright", None), ("Docker", "docker"), ("GitHub Actions", "githubactions"), ("Cloudflare Workers", "cloudflareworkers"), ("WebRTC", "webrtc")]),
]
linhas_emb = []
for i, (ns, cor, escuro, itens) in enumerate(EMBEDDINGS):
    largura = ' width="160"' if i == 0 else ""
    selos = "\n".join(selo(t, cor, l, escuro) for t, l in itens)
    linhas_emb.append(f'<tr>\n<td{largura} valign="top"><code>{ns}</code></td>\n<td>\n{selos}\n</td>\n</tr>')

README = f"""{pic("hero", "Contexto: Saulo Costa. Pergunta: quem é o saulo costa? Resposta: constrói agentes de IA, automações e ferramentas internas, do protótipo ao deploy; Engenharia de Computação na UFPB, conclusão em 2027, João Pessoa. Fontes: Sagaz, Nexo, Oluasin, Neolis. Ao lado, um espaço de embeddings em que a pergunta acende os 5 vizinhos mais próximos.")}

<p align="center">
  <a href="https://sauloscm.github.io">{selo("sauloscm.github.io", "F2A93B", "googlechrome")}</a>
  <a href="https://sauloscm.github.io/curriculo/">{selo("currículo", "15171B", "readdotcv", True)}</a>
  <a href="https://www.linkedin.com/in/saulo-costa-ma">{selo("linkedin", "A594FF")}</a>
  <a href="mailto:saulocm1@gmail.com">{selo("email", "5BD6A2", "gmail")}</a>
</p>

{pic("impacto", "Impacto: 7+ automações em produção; cerca de 5.000 tabelas ao alcance do agente de dados; 60+ etapas no teste de ponta a ponta do Oluasin; contribuições em 12 meses somando a conta pessoal e a do estágio.")}

{DIVISOR}

## 00 · system prompt

{pic("term-system-prompt", "Terminal. cat system_prompt.md. Sistema: você é Saulo Costa, estudante de Engenharia de Computação na UFPB e estagiário de desenvolvimento em João Pessoa. Regras: responder só com os trechos recuperados e citar a seção; dados de clientes nunca entram no contexto, as demos usam dados fictícios.")}

{DIVISOR}

## 01 · retrieved chunks

<sub>top-k = 3 · o código é privado (empresa ou produto próprio); cada fonte leva a uma demo com dados fictícios</sub>

{pic("pipeline-sagaz", "Pipeline do Sagaz: pergunta em português, catálogo de cerca de 5.000 tabelas, Claude com ferramentas e memória, SQL somente leitura, resposta com o SQL que a prova.", "https://sauloscm.github.io/projetos/warehouse-mcp/")}

{projeto("Sagaz", "Nov 2026", "Pergunte sobre os dados de um ERP em português e receba a resposta com o SQL que a comprova.",
         "API do Claude · MCP (FastMCP) · DuckDB · dbt · Python · Flask",
         ["Warehouse em DuckDB e dbt (staging, core e marts, com testes) sobre o backup de um ERP contábil de cerca de 5.000 tabelas.",
          "O agente escolhe as tabelas pelo catálogo, roda SQL em modo somente leitura e mostra a consulta junto da resposta.",
          "Pede esclarecimento quando a pergunta é ambígua, lembra a conversa e registra tokens e custo de cada pergunta.",
          "As mesmas ferramentas ficam disponíveis para qualquer cliente MCP."],
         "sauloscm.github.io/projetos/warehouse-mcp")}

{pic("pipeline-nexo", "Pipeline do Nexo: login único, permissões por automação, mais de 7 automações em containers, execuções com progresso ao vivo, agendamento.", "https://sauloscm.github.io/projetos/central-automacoes/")}

{projeto("Nexo", "Set 2026", "Uma porta só para as automações da empresa, com quem pode o quê e o registro de cada execução.",
         "Node.js · Express · PostgreSQL · Flask · FastAPI · Playwright · Docker Compose",
         ["Portal com login por pessoa e permissões por automação; cada automação roda no seu container, numa rede interna isolada.",
          "Robô com Playwright que entra num portal com verificação em duas etapas e confere as taxas cobradas venda a venda.",
          "Emissor de NFS-e no padrão nacional: XML assinado com certificado digital, DANFSe em PDF e envio por e-mail.",
          "Painel de execuções com progresso ao vivo e agendamento que roda as automações sozinho."],
         "sauloscm.github.io/projetos/central-automacoes")}

{pic("pipeline-oluasin", "Pipeline do Oluasin: SQLite local, sincronia entre os PCs, voz e tela por WebRTC, licenças assinadas com Ed25519, atualização assinada.", "https://sauloscm.github.io/projetos/oluasin/")}

{projeto("Oluasin", "2026", "Chat, voz, tela, páginas, kanban e planilha para equipes, com os dados nos próprios PCs.",
         "Electron · React · TypeScript · SQLite · WebRTC · Rust/WebAssembly · Cloudflare Workers",
         ["Local-first: cada PC tem seu banco e os PCs sincronizam direto entre si, inclusive depois de ficarem offline.",
          "Voz e tela compartilhada ponto a ponto; páginas com importação do Notion, kanban, calendário e planilha com fórmulas em português.",
          "Licenças assinadas com Ed25519 e um painel que controla versões e máquinas sem nunca receber o conteúdo das equipes.",
          "Atualização automática assinada e testes de ponta a ponta com mais de 60 etapas, simulando dois PCs."],
         "sauloscm.github.io/projetos/oluasin")}

{DIVISOR}

## 02 · ingestion log

<sub>mais recentes primeiro</sub>

{pic("term-ingestion-log", "Terminal. journalctl -u saulo --since 2023 --reverse. 2026-05, Virtus Consultoria, estagiário em desenvolvimento de software e automação. 2025, PET-Saúde UFPB/SUS-PB, pesquisador e desenvolvedor. 2023, Outlier, especialista em IA. UFPB, Engenharia de Computação, conclusão prevista em 2027.")}

{DIVISOR}

## 03 · embeddings

<sub>um namespace para cada tipo de coisa</sub>

<table>
{chr(10).join(linhas_emb)}
</table>

{DIVISOR}

## 04 · telemetry

<sub>a conta pessoal e a do estágio somadas; da conta do estágio entram só contagens</sub>

{pic("telemetria", "Telemetria das duas contas: contribuições no mesmo calendário, hábitos de commit por hora e linguagens mais usadas.")}

{pic("tocando", "Músicas ouvidas por último no Spotify")}

{DIVISOR}

## 05 · endpoint

{pic("term-endpoint", "Terminal. curl sauloscm.github.io/contato. E-mail saulocm1@gmail.com, LinkedIn saulo-costa-ma, portfólio sauloscm.github.io, currículo sauloscm.github.io/curriculo.")}

<p align="center"><sub><a href="mailto:saulocm1@gmail.com">saulocm1@gmail.com</a> · <a href="https://www.linkedin.com/in/saulo-costa-ma">linkedin.com/in/saulo-costa-ma</a> · <a href="https://sauloscm.github.io">sauloscm.github.io</a></sub></p>
"""

(RAIZ / "README.md").write_text(README, encoding="utf-8", newline="\n")
print("README.md", len(README), "caracteres")
