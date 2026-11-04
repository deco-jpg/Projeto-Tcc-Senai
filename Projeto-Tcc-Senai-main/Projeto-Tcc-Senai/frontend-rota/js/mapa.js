/**
 * Desenho do mapa e da rota com SVG.
 *
 * Ideia principal:
 * O <svg> recebe viewBox="0 0 LARGURA ALTURA", exatamente o tamanho em pixels da
 * ortofoto. Assim, as coordenadas que vêm da API (x, y em pixels da imagem) podem
 * ser usadas DIRETAMENTE, sem nenhuma conta de escala: o navegador estica o SVG
 * para caber na tela e leva imagem + rota juntas.
 *
 *   API: { x: 394, y: 1840 }   ->   <circle cx="394" cy="1840">
 *
 * Zoom e arraste = mudar o viewBox:
 * viewBox="x y w h" é a "janela" da imagem que aparece na tela.
 *   - diminuir w/h  -> aproxima (zoom in)
 *   - mudar x/y     -> arrasta
 * Nada é redesenhado; só a janela muda.
 *
 * Camadas (de baixo para cima):
 *   <image>         ortofoto
 *   #camada-rota    linha da rota
 *   #camada-pinos   destinos, origem, destino e o "caminhante" animado
 */

const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}, pai = null) {
  const e = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (pai) pai.appendChild(e);
  return e;
}

export class Mapa {
  /**
   * @param {SVGSVGElement} svg
   * @param {{largura:number, altura:number}} imagem  metadados de GET /mapa
   * @param {string} urlImagem
   */
  constructor(svg, imagem, urlImagem) {
    this.svg = svg;
    this.W = imagem.largura;
    this.H = imagem.altura;
    this.vb = { x: 0, y: 0, w: this.W, h: this.H };
    this.pinos = []; // grupos que mantêm tamanho fixo na tela
    this.animacao = null;
    this.aoTocarDestino = null; // callback(idDoDestino)

    svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
    svg.innerHTML = "";
    el("image", { href: urlImagem, x: 0, y: 0, width: this.W, height: this.H }, svg);
    this.camadaRota = el("g", { id: "camada-rota" }, svg);
    this.camadaPinos = el("g", { id: "camada-pinos" }, svg);
    this.camadaDestaque = el("g", { id: "camada-destaque" }, svg);

    this.#ativarGestos();
    new ResizeObserver(() => this.#aplicarViewBox()).observe(svg);
    this.#aplicarViewBox();
  }

  // ---------------------------------------------------------------- viewBox

  /** Quantas unidades do SVG cabem em 1 pixel da tela (muda com o zoom). */
  get unidadesPorPixel() {
    const r = this.svg.getBoundingClientRect();
    if (!r.width || !r.height) return 1;
    // "meet": vale a maior das duas razões
    return Math.max(this.vb.w / r.width, this.vb.h / r.height);
  }

  #aplicarViewBox() {
    const { x, y, w, h } = this.vb;
    this.svg.setAttribute("viewBox", `${x} ${y} ${w} ${h}`);
    // Pinos com tamanho constante na tela: escala inversa ao zoom.
    const k = this.unidadesPorPixel;
    for (const p of this.pinos) {
      p.g.setAttribute("transform", `translate(${p.x} ${p.y}) scale(${k})`);
    }
  }

  #limitar(vb) {
    const minW = 120; // zoom máximo (~10 m de largura na tela)
    const maxW = this.W * 1.5; // zoom mínimo
    const proporcao = vb.h / vb.w;
    let w = Math.min(Math.max(vb.w, minW), maxW);
    let h = w * proporcao;
    let x = Math.min(Math.max(vb.x, -w * 0.5), this.W - w * 0.5);
    let y = Math.min(Math.max(vb.y, -h * 0.5), this.H - h * 0.5);
    return { x, y, w, h };
  }

  /** Anima o viewBox até o retângulo alvo. */
  #animarPara(alvo, ms = 600) {
    cancelAnimationFrame(this._rafCamera);
    const de = { ...this.vb };
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3);
    const passo = (agora) => {
      const t = Math.min((agora - t0) / ms, 1);
      const e = ease(t);
      for (const k of ["x", "y", "w", "h"]) this.vb[k] = de[k] + (alvo[k] - de[k]) * e;
      this.#aplicarViewBox();
      if (t < 1) this._rafCamera = requestAnimationFrame(passo);
    };
    this._rafCamera = requestAnimationFrame(passo);
  }

  /**
   * Enquadra um conjunto de pontos na área visível.
   * @param {{x:number,y:number}[]} pontos
   * @param {{topo?:number, base?:number}} folga  pixels de tela cobertos por painéis
   */
  enquadrar(pontos, folga = {}) {
    const r = this.svg.getBoundingClientRect();
    const topo = folga.topo ?? 0;
    const base = folga.base ?? 0;
    const xs = pontos.map((p) => p.x);
    const ys = pontos.map((p) => p.y);
    const minX = Math.min(...xs), maxX = Math.max(...xs);
    const minY = Math.min(...ys), maxY = Math.max(...ys);

    // Margens em PIXELS DE TELA: lateral cobre os botões do mapa (44px + 16px),
    // vertical cobre o pino de chegada (~40px acima do ponto).
    const margemX = 64, margemY = 48;
    const telaW = Math.max(r.width - 2 * margemX, 80);
    const telaH = Math.max(r.height - topo - base - 2 * margemY, 80);
    const escala = Math.max((maxX - minX) / telaW, (maxY - minY) / telaH, 0.4);
    const w = r.width * escala;
    const h = r.height * escala;
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    // desloca o centro para compensar painéis de tamanhos diferentes
    const deslocY = ((base - topo) / 2) * escala;
    this.#animarPara(this.#limitar({ x: cx - w / 2, y: cy - h / 2 + deslocY, w, h }));
  }

  verTudo() {
    const r = this.svg.getBoundingClientRect();
    const escala = Math.max(this.W / r.width, this.H / r.height);
    const w = r.width * escala, h = r.height * escala;
    this.#animarPara({ x: (this.W - w) / 2, y: (this.H - h) / 2, w, h });
  }

  // --------------------------------------------------------------- gestos

  /** Arrastar (1 dedo / mouse), pinça (2 dedos) e roda do mouse. */
  #ativarGestos() {
    const svg = this.svg;
    const toques = new Map();
    let ultimo = null; // estado do gesto anterior

    const paraSvg = (cx, cy) => {
      // converte coordenada da tela -> coordenada do SVG (pixels da imagem)
      const pt = svg.createSVGPoint();
      pt.x = cx; pt.y = cy;
      return pt.matrixTransform(svg.getScreenCTM().inverse());
    };

    const estadoAtual = () => {
      const pts = [...toques.values()];
      if (pts.length === 1) return { cx: pts[0].x, cy: pts[0].y, dist: null };
      const [a, b] = pts;
      return {
        cx: (a.x + b.x) / 2,
        cy: (a.y + b.y) / 2,
        dist: Math.hypot(a.x - b.x, a.y - b.y),
      };
    };

    svg.addEventListener("pointerdown", (e) => {
      svg.setPointerCapture(e.pointerId);
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      ultimo = estadoAtual();
      cancelAnimationFrame(this._rafCamera);
      this._moveu = false;
    });

    svg.addEventListener("pointermove", (e) => {
      if (!toques.has(e.pointerId)) return;
      toques.set(e.pointerId, { x: e.clientX, y: e.clientY });
      const agora = estadoAtual();
      const k = this.unidadesPorPixel;

      // arrastar: move a janela no sentido contrário ao dedo
      const dx = (agora.cx - ultimo.cx) * k;
      const dy = (agora.cy - ultimo.cy) * k;
      if (Math.abs(dx) + Math.abs(dy) > 0.5) this._moveu = true;
      let vb = { ...this.vb, x: this.vb.x - dx, y: this.vb.y - dy };

      // pinça: escala em torno do ponto médio dos dedos
      if (agora.dist && ultimo.dist) {
        const fator = ultimo.dist / agora.dist;
        vb = this.#zoomEm(vb, paraSvg(agora.cx, agora.cy), fator);
      }
      this.vb = this.#limitar(vb);
      this.#aplicarViewBox();
      ultimo = agora;
    });

    const soltar = (e) => {
      toques.delete(e.pointerId);
      ultimo = toques.size ? estadoAtual() : null;
      // Toque sem arrastar = clique. (Com setPointerCapture o evento "click"
      // chega no <svg>, não no pino; por isso descobrimos o pino pela posição.)
      if (e.type === "pointerup" && !this._moveu && !toques.size) {
        const alvo = document.elementFromPoint(e.clientX, e.clientY)?.closest(".destino");
        if (alvo && this.aoTocarDestino) this.aoTocarDestino(alvo.dataset.id);
      }
    };
    svg.addEventListener("pointerup", soltar);
    svg.addEventListener("pointercancel", soltar);

    svg.addEventListener(
      "wheel",
      (e) => {
        e.preventDefault();
        const fator = Math.exp(e.deltaY * 0.0015);
        this.vb = this.#limitar(this.#zoomEm(this.vb, paraSvg(e.clientX, e.clientY), fator));
        this.#aplicarViewBox();
      },
      { passive: false },
    );
  }

  /** Zoom mantendo o ponto `p` (coordenada SVG) parado sob o dedo/cursor. */
  #zoomEm(vb, p, fator) {
    return {
      x: p.x - (p.x - vb.x) * fator,
      y: p.y - (p.y - vb.y) * fator,
      w: vb.w * fator,
      h: vb.h * fator,
    };
  }

  // ---------------------------------------------------------------- pinos

  /** Cria um grupo posicionado em (x,y) cujo conteúdo é desenhado em pixels de tela. */
  #pino(x, y, camada) {
    const g = el("g", { class: "pino" }, camada);
    const p = { g, x, y };
    this.pinos.push(p);
    g.setAttribute("transform", `translate(${x} ${y}) scale(${this.unidadesPorPixel})`);
    return g;
  }

  #removerPinos(camada) {
    this.pinos = this.pinos.filter((p) => p.g.parentNode !== camada);
    camada.innerHTML = "";
  }

  /** Desenha todos os destinos (blocos com a letra; locais com o nome). */
  desenharDestinos(destinos) {
    this.#removerPinos(this.camadaPinos);
    for (const d of destinos) {
      const g = this.#pino(d.x, d.y, this.camadaPinos);
      g.classList.add("destino", d.tipo);
      g.dataset.id = d.id;
      if (d.tipo === "bloco") {
        el("circle", { r: 13 }, g);
        const t = el("text", { y: 4.5 }, g);
        t.textContent = d.id;
      } else {
        el("circle", { r: 6 }, g);
        const t = el("text", { x: 10, y: 4, class: "rotulo" }, g);
        t.textContent = d.nome;
      }
    }
  }

  /** Marca "você está aqui". */
  marcarOrigem(ponto) {
    this.#removerPinos(this.camadaDestaque);
    if (!ponto) return;
    const g = this.#pino(ponto.x, ponto.y, this.camadaDestaque);
    g.classList.add("origem");
    el("circle", { r: 22, class: "pulso" }, g);
    el("circle", { r: 10, class: "miolo" }, g);
  }

  // ----------------------------------------------------------------- rota

  /**
   * Desenha a rota: a linha "se escreve" da origem ao destino e depois
   * um ponto fica percorrendo o trajeto em loop.
   * @param {{x:number,y:number}[]} pontos  sequência de GET /rotas
   */
  desenharRota(pontos) {
    this.limparRota();
    const d = pontos.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");

    // vector-effect: espessura fixa na tela, independente do zoom
    const comum = { d, fill: "none", "vector-effect": "non-scaling-stroke",
                    "stroke-linecap": "round", "stroke-linejoin": "round" };
    el("path", { ...comum, class: "rota-borda" }, this.camadaRota);
    const linha = el("path", { ...comum, class: "rota-linha", pathLength: 1 }, this.camadaRota);

    // Animação "desenhando": dasharray = tamanho total, offset vai de 1 a 0
    linha.style.strokeDasharray = "1";
    linha.style.strokeDashoffset = "1";
    linha.getBoundingClientRect(); // força o navegador a aplicar o estado inicial
    linha.style.transition = "stroke-dashoffset 1.4s ease-in-out";
    linha.style.strokeDashoffset = "0";

    // Pino de destino (último ponto)
    const fim = pontos[pontos.length - 1];
    const gFim = this.#pino(fim.x, fim.y, this.camadaDestaque);
    gFim.classList.add("chegada");
    el("path", { d: "M0 0 C-4 -10 -14 -16 -14 -26 A14 14 0 1 1 14 -26 C14 -16 4 -10 0 0Z" }, gFim);
    el("circle", { cy: -26, r: 5.5, class: "furo" }, gFim);

    // "Caminhante": ponto que percorre a rota (usa o comprimento real do path)
    const medidor = el("path", { d, fill: "none", stroke: "none" }, this.camadaRota);
    const total = medidor.getTotalLength();
    const gCam = this.#pino(pontos[0].x, pontos[0].y, this.camadaDestaque);
    gCam.classList.add("caminhante");
    el("circle", { r: 7 }, gCam);
    const pino = this.pinos[this.pinos.length - 1];

    const duracao = Math.min(Math.max(total * 4, 2500), 7000); // ms
    const t0 = performance.now() + 1400; // começa depois do traço
    const passo = (agora) => {
      const t = ((agora - t0) % (duracao + 800)) / duracao;
      if (agora >= t0 && t <= 1) {
        const p = medidor.getPointAtLength(total * t);
        pino.x = p.x; pino.y = p.y;
        gCam.style.opacity = 1;
      } else {
        gCam.style.opacity = 0;
      }
      gCam.setAttribute("transform", `translate(${pino.x} ${pino.y}) scale(${this.unidadesPorPixel})`);
      this.animacao = requestAnimationFrame(passo);
    };
    this.animacao = requestAnimationFrame(passo);
  }

  limparRota() {
    cancelAnimationFrame(this.animacao);
    this.camadaRota.innerHTML = "";
    // mantém a origem; remove chegada e caminhante
    for (const p of [...this.pinos]) {
      if (p.g.classList.contains("chegada") || p.g.classList.contains("caminhante")) {
        p.g.remove();
        this.pinos.splice(this.pinos.indexOf(p), 1);
      }
    }
  }
}
