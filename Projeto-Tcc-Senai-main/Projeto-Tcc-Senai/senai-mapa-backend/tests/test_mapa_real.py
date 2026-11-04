"""Conferência do mapa.json DE VERDADE (não do mini-campus do conftest).

Rode `pytest` sempre que editar o mapa.json: se algum teste daqui ficar
vermelho, a mensagem diz qual ponto ou par de destinos tem problema.
"""
from itertools import permutations

import pytest
from fastapi.testclient import TestClient

import app.main as main
from app.config import get_settings
from app.services.erros import MapaInvalido, RotaInexistente
from app.services.grafo import Grafo, carregar_mapa, validar_mapa
from app.services.roteamento import menor_caminho


@pytest.fixture(scope="module")
def mapa_real():
    return carregar_mapa(get_settings().mapa_path)


def test_mapa_real_e_valido(mapa_real):
    assert validar_mapa(mapa_real) == []


def test_mapa_real_sem_destinos_isolados(mapa_real):
    assert Grafo(mapa_real).destinos_isolados() == []


def test_todos_os_destinos_tem_rota(mapa_real):
    grafo = Grafo(mapa_real)
    destinos = [p.id for p in grafo.blocos()]
    sem_rota = []
    for origem, destino in permutations(destinos, 2):
        try:
            menor_caminho(grafo, origem, destino)
        except RotaInexistente:
            sem_rota.append(f"{origem}->{destino}")
    assert sem_rota == []


def test_servidor_carrega_o_mapa_ao_subir():
    # "with" dispara o lifespan, como o uvicorn faz ao iniciar
    with TestClient(main.app) as client:
        assert client.get("/health").status_code == 200


def test_servidor_nao_sobe_com_mapa_invalido(monkeypatch):
    def mapa_quebrado():
        raise MapaInvalido(["Conexão 'A' -> 'Q' usa ponto inexistente: 'Q'"])

    monkeypatch.setattr(main, "get_grafo", mapa_quebrado)
    with pytest.raises(MapaInvalido):
        with TestClient(main.app):
            pass
