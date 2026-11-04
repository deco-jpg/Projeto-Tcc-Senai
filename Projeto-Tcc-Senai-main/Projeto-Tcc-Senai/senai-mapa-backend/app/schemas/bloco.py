from pydantic import BaseModel


class BlocoOut(BaseModel):
    id: str
    tipo: str
    nome: str
    x: float
    y: float
    descricao: str | None = None
