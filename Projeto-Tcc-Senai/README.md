# Projeto TCC SENAI - Rotas do Campus

A pessoa escaneia o QR code colado no bloco onde está, escolhe o destino e vê no celular a rota a pé desenhada sobre a foto aérea do campus.

```
senai-mapa-backend/   API em Python (FastAPI): grafo do campus, Dijkstra, QR codes
frontend-rota/        Tela de rota de referência (HTML/JS), servida pela API em "/"
```

## Rodar tudo

```bash
cd senai-mapa-backend
python -m venv .venv
# Windows: .venv\Scripts\activate    Linux/Mac: source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --host 0.0.0.0
```

| Endereço | O quê |
|---|---|
| http://localhost:8000/?origem=A | App (como se tivesse escaneado o QR do Bloco A) |
| http://localhost:8000/docs | Documentação interativa da API |
| http://localhost:8000/qrcodes/A.png | QR code do Bloco A |

Testes: `cd senai-mapa-backend && pytest`

## Documentação

- `senai-mapa-backend/README.md`: estrutura do back-end e tarefas
- `senai-mapa-backend/docs/contrato-api.md`: o que cada endpoint devolve
- `senai-mapa-backend/docs/mapeamento.md`: como completar o mapa do campus
- `frontend-rota/README.md`: como a rota é desenhada e como levar para o front do Figma
