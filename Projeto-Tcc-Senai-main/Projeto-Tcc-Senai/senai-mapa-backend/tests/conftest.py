import pytest
from fastapi.testclient import TestClient

from app.api.deps import get_grafo
from app.main import app
from app.schemas.mapa import Mapa
from app.services.grafo import Grafo


def _mapa_teste() -> Mapa:
    """Mini-campus com escala 1 px = 1 m, para conferir as contas de cabeça.

        A --10-- X --10-- B          Z  (isolado, sem conexões)
        |        |
        |        5  escada (NÃO acessível)
        |        |
        80       Y
      (rampa)    |
        |        40
        +------- C

    Menor A->C: A-X-Y-C = 55 m.   Menor A->C acessível: A-C = 80 m.
    """
    return Mapa.model_validate({
        "imagem": {"arquivo": "t.png", "largura": 100, "altura": 100, "metros_por_pixel": 1},
        "pontos": [
            {"id": "A", "tipo": "bloco", "nome": "A", "x": 0, "y": 0},
            {"id": "B", "tipo": "bloco", "nome": "B", "x": 20, "y": 0},
            {"id": "C", "tipo": "bloco", "nome": "C", "x": 10, "y": 45},
            {"id": "Z", "tipo": "bloco", "nome": "Z", "x": 90, "y": 90},
            {"id": "X", "tipo": "passagem", "nome": "X", "x": 10, "y": 0},
            {"id": "Y", "tipo": "passagem", "nome": "Y", "x": 10, "y": 5},
        ],
        "conexoes": [
            {"de": "A", "para": "X"},                               # 10 m (calculado)
            {"de": "X", "para": "B"},                               # 10 m (calculado)
            {"de": "X", "para": "Y", "acessivel": False},           # 5 m, escada
            {"de": "Y", "para": "C"},                               # 40 m (calculado)
            {"de": "A", "para": "C", "distancia_m": 80},            # rampa longa, acessível
        ],
    })


@pytest.fixture
def grafo() -> Grafo:
    return Grafo(_mapa_teste())


@pytest.fixture
def client(grafo):
    app.dependency_overrides[get_grafo] = lambda: grafo
    yield TestClient(app)
    app.dependency_overrides.clear()
