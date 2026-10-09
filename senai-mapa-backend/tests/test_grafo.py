"""Infraestrutura do grafo: já deve passar (verde) desde o primeiro dia."""
import pytest

from app.schemas.mapa import Mapa
from app.services.erros import PontoNaoEncontrado
from app.services.grafo import validar_mapa


def test_distancia_calculada_pelas_coordenadas(grafo):
    assert ("X", 10.0, True) in grafo.vizinhos("A")


def test_distancia_informada_tem_prioridade(grafo):
    assert ("C", 80.0, True) in grafo.vizinhos("A")


def test_conexao_bidirecional(grafo):
    assert ("A", 10.0, True) in grafo.vizinhos("X")


def test_filtro_de_acessibilidade(grafo):
    ids = [v[0] for v in grafo.vizinhos("X", somente_acessivel=True)]
    assert "Y" not in ids


def test_blocos_nao_incluem_passagens(grafo):
    assert [b.id for b in grafo.blocos()] == ["A", "B", "C", "Z"]


def test_ponto_inexistente(grafo):
    with pytest.raises(PontoNaoEncontrado):
        grafo.ponto("Q")


# ---------------------------------------------------------------------------
# TODO dos alunos: validar_mapa()
# ---------------------------------------------------------------------------

def _mapa(pontos, conexoes, largura=100, altura=100):
    return Mapa.model_validate({
        "imagem": {"arquivo": "t.png", "largura": largura, "altura": altura, "metros_por_pixel": 1},
        "pontos": [{"tipo": "bloco", "nome": p[0], "id": p[0], "x": p[1], "y": p[2]} for p in pontos],
        "conexoes": [{"de": c[0], "para": c[1]} for c in conexoes],
    })


def test_mapa_valido_nao_tem_erros():
    assert validar_mapa(_mapa([("A", 0, 0), ("B", 10, 0)], [("A", "B")])) == []


@pytest.mark.todo
def test_detecta_id_repetido():
    erros = validar_mapa(_mapa([("A", 0, 0), ("A", 10, 0)], []))
    assert len(erros) == 1


@pytest.mark.todo
def test_detecta_conexao_para_ponto_inexistente():
    erros = validar_mapa(_mapa([("A", 0, 0)], [("A", "Q")]))
    assert len(erros) == 1


@pytest.mark.todo
def test_detecta_conexao_para_si_mesmo():
    erros = validar_mapa(_mapa([("A", 0, 0)], [("A", "A")]))
    assert len(erros) == 1


@pytest.mark.todo
def test_detecta_ponto_fora_da_imagem():
    erros = validar_mapa(_mapa([("A", 150, 0)], [], largura=100))
    assert len(erros) == 1
