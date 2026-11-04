from fastapi import APIRouter, Depends

from app.api.deps import get_grafo
from app.schemas.bloco import BlocoOut
from app.schemas.mapa import Imagem
from app.services.grafo import Grafo

router = APIRouter(tags=["mapa"])


@router.get("/mapa", response_model=Imagem, summary="Metadados da ortofoto")
def metadados_mapa(grafo: Grafo = Depends(get_grafo)):
    """O front usa largura/altura para escalar as coordenadas da rota na tela."""
    return grafo.mapa.imagem


@router.get("/blocos", response_model=list[BlocoOut], summary="Lista de destinos")
def listar_blocos(grafo: Grafo = Depends(get_grafo)):
    return [p.model_dump() for p in grafo.blocos()]


@router.get("/blocos/{bloco_id}", response_model=BlocoOut)
def detalhar_bloco(bloco_id: str, grafo: Grafo = Depends(get_grafo)):
    return grafo.ponto(bloco_id.upper()).model_dump()
