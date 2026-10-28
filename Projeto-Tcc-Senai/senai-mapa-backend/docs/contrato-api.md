# Contrato da API (para o time do front)

Base: `http://127.0.0.1:8000`. Documentação interativa em `/docs`.

Um front de referência que já consome tudo isto está em `frontend-rota/` (na raiz do repositório) e é servido pela própria API em `/`.

## Fluxo da tela

1. O QR abre `FRONTEND_URL/?origem=A`. Ler `origem` da query string.
2. Ao carregar: `GET /mapa` e `GET /blocos`.
3. Usuário escolhe o destino: `GET /rotas?origem=A&destino=L`.
4. Desenhar `pontos` como linha sobre a imagem `/static/{arquivo}`.

## Coordenadas: use SVG com viewBox

As coordenadas `x, y` estão em **pixels da imagem** (`largura` x `altura` de `/mapa`), com origem no canto superior esquerdo e y para baixo.

Com `<svg viewBox="0 0 {largura} {altura}">`, a imagem de fundo e a rota usam essas coordenadas **diretamente**, e o navegador escala tudo junto. Não é preciso fazer conta de escala.

```html
<svg viewBox="0 0 2000 4001">
  <image href="/static/ortofoto_reduzida.jpg" width="2000" height="4001"/>
  <polyline points="394,1840 394,1945 460,1945 ..." fill="none" stroke="#1a73e8" stroke-width="7"
            vector-effect="non-scaling-stroke"/>
</svg>
```

Zoom e arraste = mudar o `viewBox`. Ver `frontend-rota/js/mapa.js`.

## Endpoints

### `GET /mapa`
```json
{ "arquivo": "ortofoto_reduzida.jpg", "largura": 2000, "altura": 4001, "metros_por_pixel": 0.08 }
```

### `GET /static/{arquivo}`
A imagem de fundo (JPG, ~1,6 MB).

### `GET /blocos`
Todos os **destinos** (blocos e locais), em ordem alfabética do nome. Passagens não aparecem.
```json
[
  { "id": "AUD", "tipo": "local", "nome": "Auditório", "x": 850, "y": 1505, "descricao": null },
  { "id": "A",   "tipo": "bloco", "nome": "Bloco A",   "x": 394, "y": 1840, "descricao": null }
]
```

### `GET /rotas?origem=A&destino=L&acessivel=false`
```json
{
  "origem": "A", "destino": "L",
  "distancia_m": 150.4, "tempo_estimado_min": 2.0,
  "pontos": [
    { "id": "A",  "nome": "Bloco A", "x": 394, "y": 1840 },
    { "id": "V1", "nome": "Via principal (Bloco A)", "x": 394, "y": 1945 },
    "...",
    { "id": "L",  "nome": "Bloco L", "x": 1580, "y": 2512 }
  ],
  "passos": []
}
```
`passos` fica vazio até alguém implementar `gerar_passos()` (desafio). Enquanto isso, o front monta os passos a partir dos nomes das passagens.

| Status | Quando |
|---|---|
| 200 | rota encontrada |
| 404 | origem ou destino não existe |
| 422 | não há caminho (ou parâmetro faltando) |
| 501 | função do back-end ainda não implementada (`NotImplementedError`) |

### `GET /qrcodes/{id}.png`
Imagem PNG do QR do destino. Aponta para `FRONTEND_URL/?origem={id}`.
