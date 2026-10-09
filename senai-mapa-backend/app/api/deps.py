"""Dependências compartilhadas pelos routers (injeção via Depends)."""
from functools import lru_cache

from app.config import get_settings
from app.services.grafo import Grafo, carregar_mapa


@lru_cache
def get_grafo() -> Grafo:
    """O mapa é lido uma vez e fica em memória. Alterou o JSON? Reinicie o servidor."""
    return Grafo(carregar_mapa(get_settings().mapa_path))
