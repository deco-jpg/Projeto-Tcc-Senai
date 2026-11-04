"""menor_caminho() (Dijkstra), implementado pelos alunos. Se algum ficar vermelho, alguém quebrou."""
import pytest

from app.schemas.mapa import Mapa
from app.services.erros import PontoNaoEncontrado, RotaInexistente
from app.services.grafo import Grafo
from app.services.roteamento import menor_caminho

pytestmark = pytest.mark.todo


def test_caminho_simples(grafo):
    assert menor_caminho(grafo, "A", "B") == (["A", "X", "B"], 20.0)


def test_prefere_o_mais_curto_mesmo_com_mais_paradas(grafo):
    # A-C direto = 80 m; A-X-Y-C = 55 m
    assert menor_caminho(grafo, "A", "C") == (["A", "X", "Y", "C"], 55.0)


def test_modo_acessivel_evita_escada(grafo):
    assert menor_caminho(grafo, "A", "C", somente_acessivel=True) == (["A", "C"], 80.0)


def test_origem_igual_destino(grafo):
    assert menor_caminho(grafo, "A", "A") == (["A"], 0.0)


def test_ponto_inexistente(grafo):
    with pytest.raises(PontoNaoEncontrado):
        menor_caminho(grafo, "A", "Q")


def test_sem_caminho(grafo):
    with pytest.raises(RotaInexistente):
        menor_caminho(grafo, "A", "Z")


def test_respeita_mao_unica():
    g = Grafo(Mapa.model_validate({
        "imagem": {"arquivo": "t.png", "largura": 100, "altura": 100, "metros_por_pixel": 1},
        "pontos": [
            {"id": "A", "tipo": "bloco", "nome": "A", "x": 0, "y": 0},
            {"id": "B", "tipo": "bloco", "nome": "B", "x": 10, "y": 0},
        ],
        "conexoes": [{"de": "A", "para": "B", "bidirecional": False}],
    }))
    assert menor_caminho(g, "A", "B") == (["A", "B"], 10.0)
    with pytest.raises(RotaInexistente):
        menor_caminho(g, "B", "A")
