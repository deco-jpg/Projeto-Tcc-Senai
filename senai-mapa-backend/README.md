# SENAI Mapa · Back-end

API que calcula a rota a pé entre dois blocos do campus.
A pessoa escaneia o QR code colado no bloco onde está, escolhe o destino no app e vê o trajeto desenhado sobre a ortofoto.

```
QR no Bloco A ──► front abre com ?origem=A ──► usuário escolhe "L"
                                               │
                     GET /rotas?origem=A&destino=L
                                               │
             ◄── { pontos: [{x,y}, ...], distancia_m, tempo_estimado_min }
     front desenha a linha sobre a ortofoto
```

## Stack

Python 3.11+ · FastAPI · Pydantic v2 · pytest

## Como rodar

```bash
python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

Abra **http://127.0.0.1:8000/docs**: é a documentação interativa, dá para testar todos os endpoints por ali.

## Estrutura

```
app/
├── main.py                 cria a API, CORS e traduz exceções em status HTTP
├── config.py               lê o .env
├── api/                    CAMADA HTTP: recebe a requisição, chama o service, devolve JSON
│   ├── deps.py             carrega o grafo uma vez e injeta nos endpoints
│   ├── blocos.py           GET /mapa, GET /blocos, GET /blocos/{id}
│   ├── rotas.py            GET /rotas
│   └── qrcodes.py          GET /qrcodes/{id}.png
├── schemas/                formato dos dados (entrada, saída e mapa.json)
├── services/               REGRA DE NEGÓCIO: não sabe que existe HTTP
│   ├── grafo.py            mapa.json -> grafo (lista de adjacência)      ← TODO
│   ├── roteamento.py       menor caminho (Dijkstra)                      ← TODO
│   ├── qrcode_service.py   gera o PNG do QR
│   └── erros.py            exceções de domínio
└── data/
    └── mapa.json           pontos e conexões do campus (coordenadas FICTÍCIAS)
scripts/
├── reduzir_ortofoto.py     reduz a ortofoto de 100+ MB para uso no app
├── marcador.html           clica na ortofoto e gera o mapa.json
└── gerar_qrcodes.py        gera os cartazes de QR para imprimir
tests/                      a especificação do projeto em forma de teste
docs/
├── mapeamento.md           como transformar a ortofoto em grafo
└── contrato-api.md         o que o front recebe de cada endpoint
```

## O que já funciona e o que é com vocês

Rode `pytest`. No estado inicial: **14 testes passam e 15 falham**. Os que falham são o trabalho de vocês.

| Tarefa | Arquivo | Testes |
|---|---|---|
| 1. Validar o mapa | `services/grafo.py` → `validar_mapa()` | `pytest tests/test_grafo.py` |
| 2. Menor caminho (Dijkstra) | `services/roteamento.py` → `menor_caminho()` | `pytest tests/test_roteamento.py` |
| 3. Endpoint de rota funcionando | sai de graça quando a tarefa 2 termina | `pytest tests/test_api.py` |
| 4. Mapear o campus real | `app/data/mapa.json` | ver `docs/mapeamento.md` |

Enquanto a tarefa 2 não estiver pronta, `GET /rotas` responde **501 Not Implemented**. O front consegue integrar todo o resto (lista de blocos, QR, imagem) desde já.

Para ver só o que já deve estar verde: `pytest -m "not todo"`.

### Desafios extras

- **Instruções em texto**: `gerar_passos()` em `roteamento.py` ("vire à direita no pátio").
- **A\***: trocar Dijkstra por A* usando a distância em linha reta como heurística.
- **Validação de bloco isolado**: item 5 de `validar_mapa()`.
- **Andares**: hoje o mapa é 2D. Como representar escada entre térreo e 1º andar?

## Regras do projeto

- `services/` nunca importa nada de `fastapi`. Quem fala HTTP é só a pasta `api/`.
- Toda mudança no `mapa.json` exige reiniciar o servidor (ele é lido uma vez).
- A ortofoto original **não vai para o Git** (mais de 100 MB). Versionar só a reduzida.
