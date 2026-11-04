"""Exceções de domínio. A camada de API traduz cada uma para um status HTTP."""


class PontoNaoEncontrado(Exception):
    def __init__(self, ponto_id: str):
        super().__init__(f"Ponto '{ponto_id}' não existe no mapa")
        self.ponto_id = ponto_id


class RotaInexistente(Exception):
    def __init__(self, origem: str, destino: str):
        super().__init__(f"Não há caminho entre '{origem}' e '{destino}'")
        self.origem = origem
        self.destino = destino


class MapaInvalido(Exception):
    def __init__(self, erros: list[str]):
        super().__init__("Mapa inválido:\n- " + "\n- ".join(erros))
        self.erros = erros
