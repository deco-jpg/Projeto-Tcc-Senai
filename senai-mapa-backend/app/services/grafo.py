"""Carrega o mapa (JSON) e o transforma em grafo navegável.

Representação escolhida: LISTA DE ADJACÊNCIA
    {"A": [("P1", 12.5, True), ("B", 30.0, False)], ...}
     ^ponto   ^vizinho ^metros ^acessível
"""
import json
import math
from pathlib import Path

from app.schemas.mapa import Mapa, Ponto
from app.services.erros import MapaInvalido, PontoNaoEncontrado

Vizinho = tuple[str, float, bool]


def carregar_mapa(caminho: Path) -> Mapa:
    with open(caminho, encoding="utf-8") as f:
        return Mapa.model_validate(json.load(f))


def validar_mapa(mapa: Mapa) -> list[str]:
    erros: list[str] = []

    # 1. IDs repetidos (um erro por ID repetido)
    vistos: set[str] = set()
    repetidos: set[str] = set()
    for p in mapa.pontos:
        if p.id in vistos and p.id not in repetidos:
            erros.append(f"ID repetido: '{p.id}'")
            repetidos.add(p.id)
        vistos.add(p.id)

    # 4. Pontos fora da imagem
    largura, altura = mapa.imagem.largura, mapa.imagem.altura
    for p in mapa.pontos:
        if p.x > largura or p.y > altura:
            erros.append(
                f"Ponto '{p.id}' fora da imagem: ({p.x}, {p.y}) "
                f"não cabe em {largura}x{altura}"
            )

    # 2 e 3. Conexões
    for c in mapa.conexoes:
        ausentes = {pid for pid in (c.de, c.para) if pid not in vistos}
        for pid in sorted(ausentes):
            erros.append(f"Conexão '{c.de}' -> '{c.para}' usa ponto inexistente: '{pid}'")
        if c.de == c.para and not ausentes:
            erros.append(f"Conexão de '{c.de}' para ele mesmo")

    return erros


class Grafo:
    def __init__(self, mapa: Mapa):
        erros = validar_mapa(mapa)
        if erros:
            raise MapaInvalido(erros)

        self.mapa = mapa
        self.pontos: dict[str, Ponto] = {p.id: p for p in mapa.pontos}
        self._adj: dict[str, list[Vizinho]] = {pid: [] for pid in self.pontos}

        for c in mapa.conexoes:
            dist = c.distancia_m if c.distancia_m is not None else self._distancia_px(c.de, c.para)
            self._adj[c.de].append((c.para, dist, c.acessivel))
            if c.bidirecional:
                self._adj[c.para].append((c.de, dist, c.acessivel))

    def _distancia_px(self, a: str, b: str) -> float:
        """Distância em linha reta entre dois pontos, já convertida para metros."""
        pa, pb = self.pontos[a], self.pontos[b]
        pixels = math.hypot(pb.x - pa.x, pb.y - pa.y)
        return round(pixels * self.mapa.imagem.metros_por_pixel, 2)

    def ponto(self, ponto_id: str) -> Ponto:
        try:
            return self.pontos[ponto_id]
        except KeyError:
            raise PontoNaoEncontrado(ponto_id) from None

    def blocos(self) -> list[Ponto]:
        return sorted((p for p in self.pontos.values() if p.tipo == "bloco"), key=lambda p: p.id)

    def vizinhos(self, ponto_id: str, somente_acessivel: bool = False) -> list[Vizinho]:
        self.ponto(ponto_id)  # valida existência
        viz = self._adj[ponto_id]
        return [v for v in viz if v[2]] if somente_acessivel else list(viz)
