"""Cálculo de rota entre dois pontos do grafo.

Este é o núcleo do projeto: GET /rotas chama montar_rota(), que usa o
menor_caminho() (Dijkstra) e o gerar_passos() (ainda um desafio).
Os testes em tests/test_roteamento.py dizem exatamente o que se espera.
"""
import heapq
import math

from app.schemas.rota import PontoRota, RotaOut
from app.services.erros import RotaInexistente
from app.services.grafo import Grafo

VELOCIDADE_CAMINHADA_M_MIN = 75.0  # ~4,5 km/h


def menor_caminho(
    grafo: Grafo,
    origem: str,
    destino: str,
    somente_acessivel: bool = False,
) -> tuple[list[str], float]:
    # Valida antes de tudo: lança PontoNaoEncontrado se o ID não existir
    grafo.ponto(origem)
    grafo.ponto(destino)

    if origem == destino:
        return [origem], 0.0

    dist: dict[str, float] = {origem: 0.0}
    anterior: dict[str, str] = {}
    fila: list[tuple[float, str]] = [(0.0, origem)]

    while fila:
        d, atual = heapq.heappop(fila)
        if atual == destino:
            break
        if d > dist.get(atual, math.inf):
            continue  # entrada velha na fila
        for viz, peso, _ in grafo.vizinhos(atual, somente_acessivel):
            nova = d + peso
            if nova < dist.get(viz, math.inf):
                dist[viz] = nova
                anterior[viz] = atual
                heapq.heappush(fila, (nova, viz))

    if destino not in dist:
        raise RotaInexistente(origem, destino)

    caminho = [destino]
    while caminho[-1] != origem:
        caminho.append(anterior[caminho[-1]])
    caminho.reverse()
    return caminho, dist[destino]


def gerar_passos(grafo: Grafo, caminho: list[str]) -> list[str]:
    """Instruções em texto para o usuário.

    TODO (desafio): usar o ângulo entre segmentos consecutivos (math.atan2) para
    dizer 'vire à esquerda' / 'vire à direita' / 'siga em frente'.
    Lembre: na imagem, y cresce PARA BAIXO.

    Roteiro sugerido (um passo de cada vez, com teste para cada um):
      1. Para cada ponto do MEIO do caminho (nem o primeiro, nem o último),
         pegue o anterior (a), ele (b) e o próximo (c).
      2. Calcule a direção de a->b e de b->c com math.atan2(dy, dx).
      3. A curva é a diferença entre as duas direções. Normalize para ficar
         entre -180° e +180° (senão 350° e -10° parecem curvas diferentes).
      4. Escolha uma tolerância (ex.: menos de 30° = "siga em frente").
      5. Descubra o SINAL da curva desenhando no papel: com y para baixo, o
         sentido horário e o anti-horário ficam invertidos em relação à aula
         de matemática. Monte um caminho em "L" no conftest e confira.
      6. Bônus: juntar trechos seguidos de "siga em frente" e somar os metros,
         como o front faz hoje em passosAPartirDosPontos() (frontend-rota/js/app.js).

    Quando esta função devolver uma lista não vazia, o front passa a usá-la
    no lugar dos passos que ele mesmo monta.
    """
    return []


def montar_rota(grafo: Grafo, origem: str, destino: str, somente_acessivel: bool = False) -> RotaOut:
    caminho, distancia = menor_caminho(grafo, origem, destino, somente_acessivel)
    pontos = [
        PontoRota(id=p.id, nome=p.nome, x=p.x, y=p.y) for p in (grafo.ponto(i) for i in caminho)
    ]
    return RotaOut(
        origem=origem,
        destino=destino,
        distancia_m=round(distancia, 1),
        tempo_estimado_min=round(distancia / VELOCIDADE_CAMINHADA_M_MIN, 1),
        pontos=pontos,
        passos=gerar_passos(grafo, caminho),
    )
