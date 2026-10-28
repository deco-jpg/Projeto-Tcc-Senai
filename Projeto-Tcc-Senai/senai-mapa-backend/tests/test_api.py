import pytest


def test_health(client):
    assert client.get("/health").json() == {"status": "ok"}


def test_metadados_do_mapa(client):
    r = client.get("/mapa").json()
    assert (r["largura"], r["altura"]) == (100, 100)


def test_lista_blocos(client):
    assert [b["id"] for b in client.get("/blocos").json()] == ["A", "B", "C", "Z"]


def test_bloco_aceita_minuscula(client):
    assert client.get("/blocos/a").json()["id"] == "A"


def test_bloco_inexistente_404(client):
    assert client.get("/blocos/Q").status_code == 404


def test_qrcode_png(client):
    r = client.get("/qrcodes/A.png")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/png"
    assert r.content[:8] == b"\x89PNG\r\n\x1a\n"


def test_qrcode_bloco_inexistente_404(client):
    assert client.get("/qrcodes/Q.png").status_code == 404


@pytest.mark.todo
def test_rota_ok(client):
    r = client.get("/rotas", params={"origem": "a", "destino": "c"})
    assert r.status_code == 200
    body = r.json()
    assert [p["id"] for p in body["pontos"]] == ["A", "X", "Y", "C"]
    assert body["distancia_m"] == 55.0
    assert body["tempo_estimado_min"] > 0


@pytest.mark.todo
def test_rota_acessivel(client):
    r = client.get("/rotas", params={"origem": "A", "destino": "C", "acessivel": True})
    assert [p["id"] for p in r.json()["pontos"]] == ["A", "C"]


@pytest.mark.todo
def test_rota_ponto_inexistente_404(client):
    assert client.get("/rotas", params={"origem": "A", "destino": "Q"}).status_code == 404


@pytest.mark.todo
def test_rota_sem_caminho_422(client):
    assert client.get("/rotas", params={"origem": "A", "destino": "Z"}).status_code == 422


def test_imagem_do_mapa_servida(client):
    r = client.get("/static/ortofoto_reduzida.jpg")
    assert r.status_code == 200
    assert r.headers["content-type"] == "image/jpeg"


def test_front_servido_na_raiz(client):
    r = client.get("/")
    assert r.status_code == 200
    assert "text/html" in r.headers["content-type"]


def test_destino_traz_tipo(client):
    assert {"id", "tipo", "nome", "x", "y"} <= client.get("/blocos").json()[0].keys()
