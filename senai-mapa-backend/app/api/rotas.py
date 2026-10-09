from fastapi import APIRouter, Depends, Query

from app.api.deps import get_grafo
from app.schemas.rota import RotaOut
from app.services.grafo import Grafo
from app.services.roteamento import montar_rota

router = APIRouter(tags=["rotas"])


@router.get("/rotas", response_model=RotaOut, summary="Rota entre dois blocos")
def calcular_rota(
    origem: str = Query(..., examples=["A"], description="Bloco onde está o QR code"),
    destino: str = Query(..., examples=["L"]),
    acessivel: bool = Query(False, description="Evitar escadas e degraus"),
    grafo: Grafo = Depends(get_grafo),
):
    return montar_rota(grafo, origem.upper(), destino.upper(), acessivel)
