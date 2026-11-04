"""Ponto de entrada da API.

Rodar:  uvicorn app.main:app --reload
Docs:   http://127.0.0.1:8000/docs
"""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app.api import blocos, qrcodes, rotas
from app.api.deps import get_grafo
from app.config import get_settings
from app.services.erros import PontoNaoEncontrado, RotaInexistente

settings = get_settings()
logger = logging.getLogger("uvicorn.error")  # aparece no mesmo terminal do uvicorn


@asynccontextmanager
async def lifespan(_: FastAPI):
    """Roda uma vez, quando o servidor sobe (antes de aceitar requisições).

    Lê e valida o mapa.json AGORA. Se ele tiver erro, o uvicorn nem sobe e a
    mensagem aparece no terminal, em vez de virar um erro 500 no celular de
    quem escaneou o QR code.
    """
    grafo = get_grafo()
    isolados = grafo.destinos_isolados()
    if isolados:
        logger.warning(
            "mapa.json: destinos sem caminho até o resto do campus: %s", ", ".join(isolados)
        )
    yield


app = FastAPI(
    title="SENAI Mapa API",
    description="Navegação entre blocos do campus a partir de QR codes.",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_list,
    allow_methods=["GET"],
    allow_headers=["*"],
)

app.include_router(blocos.router)
app.include_router(rotas.router)
app.include_router(qrcodes.router)


# --- Tradução das exceções de domínio para HTTP -----------------------------
# Os services não sabem que existe HTTP. Quem decide o status é esta camada.

@app.exception_handler(PontoNaoEncontrado)
def _ponto_nao_encontrado(_: Request, exc: PontoNaoEncontrado):
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(RotaInexistente)
def _rota_inexistente(_: Request, exc: RotaInexistente):
    return JSONResponse(status_code=422, content={"detail": str(exc)})


@app.exception_handler(NotImplementedError)
def _nao_implementado(_: Request, exc: NotImplementedError):
    return JSONResponse(status_code=501, content={"detail": f"TODO: {exc}"})


@app.get("/health", tags=["infra"])
def health() -> dict:
    return {"status": "ok"}


# --- Arquivos estáticos -------------------------------------------------------
# /static/ortofoto_reduzida.jpg  -> imagem de fundo do mapa
# /                              -> front-end de referência (pasta frontend-rota)
# Os mounts ficam POR ÚLTIMO: rotas da API declaradas acima têm prioridade.
app.mount("/static", StaticFiles(directory=settings.mapa_path.parent), name="static")

if settings.frontend_dir.is_dir():
    app.mount("/", StaticFiles(directory=settings.frontend_dir, html=True), name="frontend")
