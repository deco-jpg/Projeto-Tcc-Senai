"""Modelos do mapa: pontos (nós do grafo) e conexões (arestas).

Sistema de coordenadas: pixels da ortofoto REDUZIDA (ver scripts/reduzir_ortofoto.py),
origem (0, 0) no canto superior esquerdo, x para a direita, y para baixo.
É o mesmo sistema que o front usa para desenhar a rota por cima da imagem.
"""
from typing import Literal

from pydantic import BaseModel, Field


class Imagem(BaseModel):
    arquivo: str = Field(description="Nome do arquivo da ortofoto reduzida")
    largura: int = Field(gt=0, description="Largura em pixels")
    altura: int = Field(gt=0, description="Altura em pixels")
    metros_por_pixel: float = Field(gt=0, description="Escala da imagem reduzida")


class Ponto(BaseModel):
    id: str = Field(description="Identificador único em MAIÚSCULAS: 'A', 'L', 'REC', 'BIB'...")
    tipo: Literal["bloco", "local", "passagem"] = Field(
        description=(
            "'bloco' e 'local' (Recepção, Biblioteca, Cantina...) aparecem como destino; "
            "'passagem' é esquina/corredor/escada"
        )
    )
    nome: str
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    descricao: str | None = None


class Conexao(BaseModel):
    de: str
    para: str
    distancia_m: float | None = Field(
        default=None,
        gt=0,
        description="Se vazio, é calculada pela distância em pixels x metros_por_pixel",
    )
    acessivel: bool = Field(default=True, description="False se tem escada ou degrau")
    bidirecional: bool = True


class Mapa(BaseModel):
    imagem: Imagem
    pontos: list[Ponto]
    conexoes: list[Conexao]
