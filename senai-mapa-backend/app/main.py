"""Ponto de entrada da API.

Rodar:  uvicorn app.main:app --reload
Docs:   http://127.0.0.1:8000/docs
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import blocos, qrcodes, rotas
from app.config import get_settings
from app.services.erros import PontoNaoEncontrado, RotaInexistente

settings = get_settings()

app = FastAPI(
    title="SENAI Mapa API",
    description="Navegação entre blocos do campus a partir de QR codes.",
    version="0.1.0",
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
