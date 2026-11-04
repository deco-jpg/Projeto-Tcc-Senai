from pydantic import BaseModel, Field


class PontoRota(BaseModel):
    id: str
    nome: str
    x: float
    y: float


class RotaOut(BaseModel):
    origem: str
    destino: str
    distancia_m: float = Field(description="Soma das arestas percorridas, em metros")
    tempo_estimado_min: float = Field(description="Distância / velocidade média de caminhada")
    pontos: list[PontoRota] = Field(description="Sequência do trajeto, da origem ao destino")
    passos: list[str] = Field(
        default_factory=list,
        description="Instruções em texto ('Siga até...', 'Vire à direita...'). Desafio extra.",
    )
