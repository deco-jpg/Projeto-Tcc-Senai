# Tela de rota (front de referência)

Implementação completa da parte "mostrar a rota do ponto A ao ponto B".
HTML + CSS + JavaScript puro, sem build. Serve de **referência**: o visual final é o do Figma de vocês (parabéns, ficou legal).

## Rodar

A própria API serve esta pasta em `/`:

```bash
cd senai-mapa-backend
uvicorn app.main:app --reload --host 0.0.0.0
```

- Computador: http://localhost:8000/?origem=A
- Celular (mesma rede Wi-Fi): http://IP-DO-COMPUTADOR:8000/?origem=A
- Rota direta: http://localhost:8000/?origem=REC&destino=N

`--host 0.0.0.0` é o que permite o celular acessar.

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `js/api.js` | Todas as chamadas HTTP e as mensagens de erro (404, 422, 501) |
| `js/mapa.js` | Parte principal: SVG, zoom/arraste, pinos e animação da rota |
| `js/app.js` | Estado da tela: lê `?origem`, lista destinos, pede a rota, monta os passos |
| `css/estilo.css` | Visual simples desta referência (no projeto de vocês vale o do Figma) |

## Como a rota aparece na tela (o conceito)

**1. O SVG tem o tamanho da foto.**

```js
svg.setAttribute("viewBox", `0 0 ${mapa.largura} ${mapa.altura}`); // 0 0 2000 4001
```

Agora 1 unidade do SVG = 1 pixel da ortofoto. As coordenadas que a API devolve entram direto, sem conta nenhuma:

```js
// rota.pontos = [{x:394,y:1840}, {x:394,y:1945}, ...]
const d = rota.pontos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
path.setAttribute("d", d); // "M394 1840 L394 1945 L460 1945 ..."
```

**2. Zoom e arraste só mudam o `viewBox`.**
`viewBox="x y largura altura"` é a janela da foto que aparece. Diminuir a largura aproxima, mudar x/y arrasta. Nada é redesenhado.

**3. Enquadrar a rota.** Pega o menor retângulo que contém todos os pontos, soma uma margem e anima o `viewBox` até ele (`Mapa.enquadrar`).

**4. Animação "desenhando".** Com `pathLength="1"`, o traço inteiro mede 1. Basta animar `stroke-dashoffset` de 1 para 0:

```css
.rota-linha { stroke-dasharray: 1; stroke-dashoffset: 1; transition: stroke-dashoffset 1.4s; }
.rota-linha.visivel { stroke-dashoffset: 0; }
```

**5. Espessura constante.** `vector-effect="non-scaling-stroke"` mantém a linha com 7 px na tela em qualquer zoom. Os pinos usam `scale(unidadesPorPixel)` pelo mesmo motivo.

**6. Ponto caminhando.** `path.getPointAtLength(total * t)` devolve o ponto da rota em `t` (0 a 1). Um `requestAnimationFrame` move a bolinha.

## Levando para o projeto do Figma

Os nomes, cores e layout mudam; a sequência não:

```
ler ?origem  ->  GET /mapa + GET /blocos  ->  desenhar foto e destinos
escolher destino  ->  GET /rotas  ->  path com os pontos  ->  enquadrar  ->  listar passos
```

### Em React (esqueleto)

```jsx
function MapaRota({ mapa, rota }) {
  const d = rota?.pontos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  return (
    <svg viewBox={`0 0 ${mapa.largura} ${mapa.altura}`} style={{ width: "100%", height: "100%" }}>
      <image href={`/static/${mapa.arquivo}`} width={mapa.largura} height={mapa.altura} />
      {d && <path d={d} fill="none" stroke="#1a73e8" strokeWidth={7}
                  strokeLinecap="round" strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke" />}
    </svg>
  );
}
```

Para zoom/arraste no React, guardem o viewBox num `useState` e reaproveitem os métodos `#ativarGestos`, `#zoomEm` e `#limitar` de `mapa.js`, ou usem a biblioteca `react-zoom-pan-pinch` envolvendo o `<svg>`.

Se o front rodar separado (Vite na porta 5173), configurem `window.API_BASE = "http://IP:8000"` (ou equivalente) e confirmem que a origem está em `CORS_ORIGINS` no `.env` da API.

## Desafios para vocês

- **Passos com direção**: implementar `gerar_passos()` no back-end ("vire à direita"). O front já usa `rota.passos` automaticamente quando a lista vem preenchida.
- **Seguir o GPS**: `navigator.geolocation.watchPosition` + conversão de lat/long para pixel (é preciso georreferenciar 2 cantos da ortofoto).
- **Bússola**: girar o mapa com `DeviceOrientationEvent`.
- **Offline**: Service Worker guardando a imagem e o `mapa.json`.
