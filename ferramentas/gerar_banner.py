"""Desenha a cena do banner (espadachim no penhasco, ruínas sob a lua) e a converte em ASCII.

A cena é desenhada em camadas com o Pillow; cada camada vira caracteres pela cobertura de cada célula,
com contornos nas bordas para as silhuetas ficarem legíveis.
Saída: dados/banner.json, que o cartoes.mjs transforma em SVG. Rodar só quando a arte mudar:
python ferramentas/gerar_banner.py
"""
import json
import math
import random
from pathlib import Path

from PIL import Image, ImageDraw

COLS, LINHAS = 150, 36
CW, CH = 8, 16  # cada célula de texto é duas vezes mais alta que larga
W, H = COLS * CW, LINHAS * CH
rnd = random.Random(1997)


def camada():
    img = Image.new("L", (W, H), 0)
    return img, ImageDraw.Draw(img)


def cobertura(img):
    dados = list(img.resize((COLS, LINHAS), Image.BOX).getdata())
    return [[dados[y * COLS + x] / 255 for x in range(COLS)] for y in range(LINHAS)]


def faixa(cx, cy, comprimento, largura, angulo, inicio=0.0):
    """Retângulo que sai de (cx, cy) na direção do ângulo: devolve os 4 cantos."""
    dx, dy = math.cos(angulo), math.sin(angulo)
    px, py = -dy, dx
    a = (cx + dx * inicio, cy + dy * inicio)
    b = (cx + dx * (inicio + comprimento), cy + dy * (inicio + comprimento))
    m = largura / 2
    return [(a[0] + px * m, a[1] + py * m), (b[0] + px * m, b[1] + py * m), (b[0] - px * m, b[1] - py * m), (a[0] - px * m, a[1] - py * m)]


# ---- lua: brilho com o limbo escurecido e crateras ----
lua = Image.new("L", (W, H), 0)
LX, LY, LR = 870, 150, 96
px = lua.load()
crateras = [(840, 120, 22), (895, 185, 17), (885, 105, 11), (835, 185, 10), (915, 140, 8)]
for y in range(LY - LR, LY + LR):
    for x in range(LX - LR, LX + LR):
        d = math.hypot(x - LX, y - LY) / LR
        if d <= 1:
            v = 0.5 + 0.5 * math.sqrt(1 - d * d)
            for cx, cy, cr in crateras:
                if math.hypot(x - cx, y - cy) < cr:
                    v *= 0.6
            px[x, y] = int(255 * v)

# ---- ruínas: muralha partida e torres com topos quebrados ----
ruinas, d = camada()
for x0, x1 in [(680, 800), (835, 1010), (1050, 1200)]:
    d.rectangle([x0, 336, x1, 420], fill=255)
    for x in range(x0, x1 - 10, 24):
        d.rectangle([x, 322, x + 12, 336], fill=255)
torres = [(700, 46, 250), (772, 34, 296), (830, 76, 206), (934, 40, 172), (1000, 60, 236), (1088, 44, 280), (1150, 48, 252)]
for x, w, topo in torres:
    pontos = [(x, 420)]
    for k in range(5):
        pontos.append((x + w * k / 4, topo + (rnd.randint(-22, 22) if 0 < k < 4 else rnd.randint(-6, 6))))
    pontos.append((x + w, 420))
    d.polygon(pontos, fill=255)
    for jy in range(int(topo) + 34, 390, 44):  # seteiras vazias
        d.rectangle([x + w / 2 - 4, jy, x + w / 2 + 4, jy + 16], fill=0)
colina, d = camada()
d.polygon([(560, H), (640, 430), (760, 412), (1000, 406), (1200, 416), (1200, H)], fill=255)

# ---- penhasco em primeiro plano ----
penhasco, d = camada()
d.polygon([(0, H), (0, 470), (90, 452), (190, 470), (250, 474), (360, 472), (440, 486), (520, 520), (600, 560), (640, H)], fill=255)

# ---- espadachim de costas, capa rasgada ao vento ----
figura, d = camada()
d.polygon([(278, 380), (300, 380), (268, 474), (246, 474)], fill=255)  # perna esquerda
d.polygon([(302, 380), (324, 380), (358, 474), (336, 474)], fill=255)  # perna direita
d.polygon([(238, 236), (362, 236), (392, 300), (430, 360), (470, 416), (436, 406), (448, 446), (404, 414), (392, 452), (362, 418), (326, 436), (296, 418), (264, 440), (248, 412), (226, 428), (232, 330)], fill=255)  # capa
d.ellipse([228, 214, 372, 268], fill=255)  # ombros
d.ellipse([280, 166, 322, 222], fill=255)  # capuz
d.polygon([(282, 196), (301, 152), (320, 196)], fill=255)

# ---- espada enorme apoiada no ombro ----
espada, d = camada()
HX, HY = 352, 236
ang = math.atan2(30 - HY, 92 - HX)
lamina = faixa(HX, HY, 300, 38, ang, inicio=30)
d.polygon(lamina, fill=255)
centro = ((lamina[1][0] + lamina[2][0]) / 2, (lamina[1][1] + lamina[2][1]) / 2)
d.polygon([lamina[1], lamina[2], (centro[0] + math.cos(ang) * 16, centro[1] + math.sin(ang) * 16)], fill=255)
d.polygon(faixa(HX + math.cos(ang) * 30, HY + math.sin(ang) * 30, 12, 96, ang, inicio=-6), fill=255)  # guarda
d.polygon(faixa(HX, HY, 56, 13, ang + math.pi, inicio=-30), fill=255)  # cabo
pomo = (HX - math.cos(ang) * 28, HY - math.sin(ang) * 28)
d.ellipse([pomo[0] - 10, pomo[1] - 10, pomo[0] + 10, pomo[1] + 10], fill=255)

cov = {nome: cobertura(img) for nome, img in [("lua", lua), ("ruinas", ruinas), ("colina", colina), ("penhasco", penhasco), ("figura", figura), ("espada", espada)]}


def borda(nome, x, y, limite=0.3):
    g = cov[nome]
    viz = lambda xx, yy: g[yy][xx] if 0 <= xx < COLS and 0 <= yy < LINHAS else 0
    return {"esq": viz(x - 1, y) < limite, "dir": viz(x + 1, y) < limite, "cima": viz(x, y - 1) < limite}


RAMPA_LUA = " .:-=+*#%@"
grade = []
for y in range(LINHAS):
    linha = []
    for x in range(COLS):
        c, cor = " ", "ceu"
        if y < 24 and rnd.random() < 0.01:
            c, cor = rnd.choice(".`'.+"), "estrela"
        v = cov["lua"][y][x]
        if v > 0.05:
            c, cor = RAMPA_LUA[min(9, int(v * 10))], "lua"
        if cov["colina"][y][x] > 0.5:
            c, cor = rnd.choice("      .,'"), "colina"
        v = cov["ruinas"][y][x]
        if v > 0.5:
            b = borda("ruinas", x, y)
            c = "_" if b["cima"] else "|" if b["esq"] or b["dir"] else ("=" if y % 3 == 0 else rnd.choice("##[]"))
            cor = "ruinas"
        v = cov["penhasco"][y][x]
        if v > 0.5:
            b = borda("penhasco", x, y)
            c = ("/" if not b["esq"] and cov["penhasco"][y - 1][x - 1] < 0.3 else "\\" if cov["penhasco"][y - 1][x + 1 if x + 1 < COLS else x] < 0.3 else "_") if b["cima"] else ("/" if (x + 2 * y) % 6 == 0 else rnd.choice("%#&8"))
            cor = "penhasco"
        v = cov["espada"][y][x]
        if v > 0.45:
            b = borda("espada", x, y)
            c, cor = ("\\" if b["cima"] or b["esq"] else "=" if (x + y) % 2 else "#"), "espada"
        elif v > 0.2:
            c, cor = "\\", "espada"
        v = cov["figura"][y][x]
        if v > 0.5:
            b = borda("figura", x, y)
            c = "(" if b["esq"] else ")" if b["dir"] else "^" if b["cima"] else ("\\" if (x - y) % 5 == 0 else rnd.choice("@#WM%"))
            cor = "figura"
        elif v > 0.25:
            c, cor = rnd.choice(";:"), "figura"
        linha.append([c, cor])
    grade.append(linha)

# Corvos perto da lua e brasas que sobem do penhasco.
for x, y in [(96, 3), (100, 2), (104, 5), (90, 6), (110, 4)]:
    grade[y][x] = ["v", "corvo"]
for _ in range(22):
    x, y = rnd.randint(14, 72), rnd.randint(10, 28)
    if grade[y][x][1] in ("ceu", "estrela"):
        grade[y][x] = [rnd.choice(".'`*"), "brasa"]

# Junta caracteres seguidos da mesma cor em trechos, para o SVG ficar leve.
linhas = []
for linha in grade:
    trechos = []
    for c, cor in linha:
        if trechos and trechos[-1][0] == cor:
            trechos[-1][1] += c
        else:
            trechos.append([cor, c])
    linhas.append(trechos)

saida = Path(__file__).resolve().parent.parent / "dados" / "banner.json"
saida.write_text(json.dumps({"cols": COLS, "linhas": linhas}, ensure_ascii=False), encoding="utf-8")
print(saida, sum(len(l) for l in linhas), "trechos")
