from fastapi import APIRouter, Depends, Response

from app.api.deps import get_grafo
from app.config import get_settings
from app.services.grafo import Grafo
from app.services.qrcode_service import gerar_png, url_do_bloco

router = APIRouter(prefix="/qrcodes", tags=["qrcodes"])


@router.get("/{bloco_id}.png", response_class=Response, summary="QR code de um bloco")
def qrcode_do_bloco(bloco_id: str, grafo: Grafo = Depends(get_grafo)):
    bloco = grafo.ponto(bloco_id.upper())
    url = url_do_bloco(get_settings().frontend_url, bloco.id)
    return Response(content=gerar_png(url), media_type="image/png")
