# SENAI Mapa - Back-end

API que calcula a rota a pé entre dois blocos do campus.
A pessoa escaneia o QR code colado no bloco onde está, escolhe o destino no app e vê o trajeto desenhado sobre a ortofoto.

Fluxo:

1. QR do Bloco A abre o front com `?origem=A`
2. Usuário escolhe o destino (ex.: "L")
3. Front chama `GET /rotas?origem=A&destino=L`
4. API devolve `{ pontos: [{x,y}, ...], distancia_m, tempo_estimado_min }`
5. Front desenha a linha sobre a ortofoto

## Stack

Python 3.10 ou mais novo, FastAPI, Pydantic v2 e pytest.

## Como rodar

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

No Windows, se o `python` abrir a Microsoft Store, use `py -m venv .venv`.

Abra **http://127.0.0.1:8000/docs**: é a documentação interativa, dá para testar todos os endpoints por ali.

## Estrutura

```
app/
  main.py                 cria a API, CORS e traduz exceções em status HTTP
  config.py               lê o .env
  api/                    camada HTTP: recebe a requisição, chama o service, devolve JSON
    deps.py               carrega o grafo uma vez e injeta nos endpoints
    blocos.py             GET /mapa, GET /blocos, GET /blocos/{id}
    rotas.py              GET /rotas
    qrcodes.py            GET /qrcodes/{id}.png
  schemas/                formato dos dados (entrada, saída e mapa.json)
  services/               regra de negócio: não sabe que existe HTTP
    grafo.py              validar_mapa() e mapa.json -> grafo (lista de adjacência)
    roteamento.py         menor caminho (Dijkstra) e gerar_passos() (desafio)
    qrcode_service.py     gera o PNG do QR
    erros.py              exceções de domínio
  data/
    mapa.json             pontos e conexões do campus (posições aproximadas, falta conferir em campo)
scripts/
  reduzir_ortofoto.py     reduz a ortofoto de 100+ MB para uso no app
  marcador.html           clica na ortofoto e gera o mapa.json
  gerar_qrcodes.py        gera os cartazes de QR para imprimir
tests/                    a especificação do projeto em forma de teste
docs/
  mapeamento.md           como transformar a ortofoto em grafo
  contrato-api.md         o que o front recebe de cada endpoint
```

## O que já funciona e o que é com vocês (se virem)

Rode `pytest`: hoje são **40 testes, todos verdes**. Os de `tests/test_mapa_real.py` conferem o `mapa.json` de verdade; rode sempre depois de editar o mapa.

O servidor valida o `mapa.json` ao subir: se tiver erro, o `uvicorn` não inicia e mostra o motivo no terminal; se algum destino estiver sem caminho até o resto do campus, aparece um `WARNING`.

| Tarefa | Arquivo | Situação |
|---|---|---|
| 1. Validar o mapa | `services/grafo.py`, `validar_mapa()` | feito |
| 2. Menor caminho (Dijkstra) | `services/roteamento.py`, `menor_caminho()` | feito |
| 3. Endpoint de rota | `api/rotas.py` | feito |
| 4. Tela de rota | `../frontend-rota/` | referência pronta; adaptar ao Figma |
| 5. Mapear o campus real | `app/data/mapa.json` | parcial (18 destinos); completar e conferir em campo, ver `docs/mapeamento.md` |

### Desafios extras

- **Instruções em texto**: `gerar_passos()` em `roteamento.py` ("vire à direita no pátio"). Tem um roteiro passo a passo na docstring.
- **A\***: trocar Dijkstra por A* usando a distância em linha reta como heurística.
- **Andares**: hoje o mapa é 2D. Como representar escada entre térreo e 1º andar?

## Regras do projeto

- `services/` nunca importa nada de `fastapi`. Quem fala HTTP é só a pasta `api/`.
- Toda mudança no `mapa.json` exige reiniciar o servidor (ele é lido uma vez).
- A ortofoto original **não vai para o Git** (mais de 100 MB). Versionar só a reduzida, em JPG (`ortofoto_reduzida.jpg`, ~1,6 MB).
- IDs em maiúsculas; passagens nomeadas como `Trecho (detalhe)` (ver `docs/mapeamento.md`).
