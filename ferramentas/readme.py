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

README = f"""{pic("hero", "Contexto: Saulo Costa. Pergunta: quem sou? Resposta: construo agentes de IA, automações e ferramentas internas, do protótipo ao deploy; Engenharia de Computação na UFPB, João Pessoa. Fontes: Sagaz, Nexo, Oluasin, Neolis. Ao lado, um espaço de embeddings em que a pergunta acende os 5 vizinhos mais próximos.")}

<p align="center">
  <a href="https://sauloscm.github.io">{selo("sauloscm.github.io", "F2A93B", "googlechrome")}</a>
  <a href="https://sauloscm.github.io/curriculo/">{selo("currículo", "15171B", "readdotcv", True)}</a>
  <a href="https://www.linkedin.com/in/saulo-costa-ma">{selo("linkedin", "A594FF")}</a>
  <a href="mailto:saulocm1@gmail.com">{selo("email", "5BD6A2", "gmail")}</a>
</p>

{pic("impacto", "Impacto: 7+ automações em produção; cerca de 5.000 tabelas ao alcance do agente de dados; 60+ etapas no teste de ponta a ponta do Oluasin; contribuições em 12 meses somando a conta pessoal e a do estágio.")}

{DIVISOR}

## 00 · ingestion log

<sub>mais recentes primeiro</sub>

{pic("term-ingestion-log", "Terminal. journalctl -u saulo --since 2023 --reverse. 2026-05, Virtus Consultoria, estagiário em desenvolvimento de software e automação. 2025, PET-Saúde UFPB/SUS-PB, pesquisador e desenvolvedor. 2023, Outlier, especialista em IA. UFPB, Engenharia de Computação, em andamento.")}

{DIVISOR}

## 01 · embeddings

<sub>um namespace para cada tipo de coisa</sub>

<table>
{chr(10).join(linhas_emb)}
</table>

{DIVISOR}

## 02 · telemetry

<sub>a conta pessoal e a do estágio somadas; da conta do estágio entram só contagens</sub>

{pic("telemetria", "Telemetria das duas contas: contribuições no mesmo calendário, hábitos de commit por hora e linguagens mais usadas.")}

{pic("tocando", "Músicas ouvidas por último no Spotify")}

{DIVISOR}

## 03 · endpoint

{pic("term-endpoint", "Terminal. curl sauloscm.github.io/contato. E-mail saulocm1@gmail.com, LinkedIn saulo-costa-ma, portfólio sauloscm.github.io, currículo sauloscm.github.io/curriculo.")}

<p align="center"><sub><a href="mailto:saulocm1@gmail.com">saulocm1@gmail.com</a> · <a href="https://www.linkedin.com/in/saulo-costa-ma">linkedin.com/in/saulo-costa-ma</a> · <a href="https://sauloscm.github.io">sauloscm.github.io</a></sub></p>
"""

(RAIZ / "README.md").write_text(README, encoding="utf-8", newline="\n")
print("README.md", len(README), "caracteres")
