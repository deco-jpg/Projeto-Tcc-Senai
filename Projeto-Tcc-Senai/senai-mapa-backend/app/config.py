"""Configurações lidas do ambiente (.env)."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # O QR code aponta para esta URL. Com o front servido pela própria API, é a URL da API.
    # Para testar no celular: use o IP da máquina na rede (ex.: http://192.168.0.10:8000).
    frontend_url: str = "http://localhost:8000"
    cors_origins: str = "http://localhost:5173,http://localhost:8000"
    mapa_path: Path = Path(__file__).parent / "data" / "mapa.json"
    # Front-end de referência servido em "/". Se a pasta não existir, a API sobe sem ele.
    frontend_dir: Path = Path(__file__).resolve().parents[2] / "frontend-rota"

    @property
    def cors_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
