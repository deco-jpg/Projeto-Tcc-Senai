# Contrato da API (para o time do front)

Base: `http://127.0.0.1:8000` · Documentação viva: `/docs`

## Fluxo da tela

1. O QR abre o front em `FRONTEND_URL/?origem=A`. Ler `origem` da query string.
2. `GET /mapa` e `GET /blocos` ao carregar.
3. Usuário escolhe o destino → `GET /rotas?origem=A&destino=L`.
4. Desenhar `pontos` como polyline sobre a imagem.

## Escalar coordenadas para a tela

As coordenadas estão em pixels da imagem **original do mapa** (`largura` × `altura` de `/mapa`). Se a imagem aparece na tela com outro tamanho:

```js
const escala = imgElement.clientWidth / mapa.largura;
const xTela = ponto.x * escala;
const yTela = ponto.y * escala;
```

Mais simples: usar um `<svg viewBox="0 0 {largura} {altura}">` com a imagem de fundo e a `<polyline>` por cima. O SVG escala sozinho.

## Endpoints

### `GET /mapa`
```json
{ "arquivo": "ortofoto_reduzida.png", "largura": 2000, "altura": 1500, "metros_por_pixel": 0.1 }
```

### `GET /blocos`
```json
[ { "id": "A", "nome": "Bloco A", "x": 200, "y": 300, "descricao": "Secretaria" } ]
```

### `GET /rotas?origem=C&destino=L&acessivel=false`
```json
{
  "origem": "C", "destino": "L",
  "distancia_m": 90.3, "tempo_estimado_min": 1.2,
  "pontos": [
    { "id": "C",  "nome": "Bloco C", "x": 900,  "y": 250 },
    { "id": "P4", "nome": "Escada do estacionamento", "x": 1300, "y": 300 },
    { "id": "L",  "nome": "Bloco L", "x": 1700, "y": 600 }
  ],
  "passos": []
}
```

| Status | Quando |
|---|---|
| 200 | rota encontrada |
| 404 | origem ou destino não existe |
| 422 | não há caminho (ou parâmetro faltando) |
| 501 | back-end ainda sem Dijkstra implementado |

### `GET /qrcodes/{id}.png`
Imagem PNG do QR do bloco.
