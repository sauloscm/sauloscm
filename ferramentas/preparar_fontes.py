"""Gera subconjuntos WOFF2 das fontes OFL para embutir nos SVGs do perfil (o GitHub não carrega fontes externas em imagens).

Os TTF originais não ficam no repositório. Para regenerar, baixe de github.com/google/fonts/tree/main/ofl:
unifrakturmaguntia/UnifrakturMaguntia-Book.ttf (Unifraktur.ttf), cinzel/Cinzel[wght].ttf (Cinzel.ttf)
e jetbrainsmono/JetBrainsMono[wght].ttf (JetBrainsMono.ttf), salvando em ferramentas/fontes/."""
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

PASTA = Path(__file__).parent / "fontes"
UNICODES = "U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201E,U+2022,U+2026,U+2190-2193,U+2197,U+25B8,U+25C6,U+25C7,U+2726,U+2727"

def gerar(origem, destino, peso=None):
    fonte = TTFont(PASTA / origem)
    if peso and "fvar" in fonte:
        fonte = instantiateVariableFont(fonte, {"wght": peso})
    opcoes = subset.Options()
    opcoes.flavor = "woff2"
    opcoes.layout_features = ["kern", "liga", "calt"]
    sub = subset.Subsetter(opcoes)
    sub.populate(unicodes=subset.parse_unicodes(UNICODES))
    sub.subset(fonte)
    fonte.flavor = "woff2"
    fonte.save(PASTA / destino)
    print(destino, (PASTA / destino).stat().st_size)

gerar("Unifraktur.ttf", "gotica.woff2")
gerar("Cinzel.ttf", "cinzel.woff2", 700)
gerar("JetBrainsMono.ttf", "mono.woff2", 400)
gerar("JetBrainsMono.ttf", "mono-bold.woff2", 700)
