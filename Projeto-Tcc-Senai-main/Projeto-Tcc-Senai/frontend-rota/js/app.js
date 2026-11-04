/**
 * Fluxo da tela:
 *
 *   1. QR code abre  .../?origem=A        -> lê a origem da URL
 *   2. Carrega GET /mapa e GET /blocos   -> desenha a foto e os destinos
 *   3. Usuário escolhe o destino         -> GET /rotas?origem=A&destino=L
 *   4. Desenha a rota, enquadra e lista os passos
 *
 * A URL é atualizada (?origem=A&destino=L) para a rota poder ser compartilhada
 * e para o botão "voltar" do celular funcionar.
 */
import { buscarDestinos, buscarMapa, buscarRota, urlImagem } from "./api.js";
import { Mapa } from "./mapa.js";

const $ = (id) => document.getElementById(id);

const estado = {
  mapa: null, // instância de Mapa
  imagem: null, // GET /mapa
  destinos: [], // GET /blocos
  origem: null, // id
  destino: null, // id
  rota: null, // GET /rotas
};

// ------------------------------------------------------------------ início

async function iniciar() {
  const params = new URLSearchParams(location.search);
  try {
    [estado.imagem, estado.destinos] = await Promise.all([buscarMapa(), buscarDestinos()]);
  } catch (e) {
    return mostrarErro(e.message);
  }

  estado.mapa = new Mapa($("mapa"), estado.imagem, urlImagem(estado.imagem.arquivo));
  estado.mapa.desenharDestinos(estado.destinos);
  estado.mapa.aoTocarDestino = (id) => {
    if (!estado.origem) return definirOrigem(id);
    if (id !== estado.origem) escolherDestino(id);
  };

  renderizarLista($("lista-destinos"), "", (id) => escolherDestino(id));
  $("acessivel").checked = params.get("acessivel") === "true";

  const origem = params.get("origem")?.toUpperCase();
  if (origem && acharDestino(origem)) {
    definirOrigem(origem, { silencioso: true });
    const destino = params.get("destino")?.toUpperCase();
    if (destino && acharDestino(destino)) escolherDestino(destino);
    else requestAnimationFrame(() => focarOrigem());
  } else {
    requestAnimationFrame(() => estado.mapa.verTudo());
    abrirDialogoOrigem();
  }
}

// ---------------------------------------------------------------- origem

function definirOrigem(id, { silencioso = false } = {}) {
  estado.origem = id;
  const o = acharDestino(id);
  $("nome-origem").textContent = o.nome;
  estado.mapa.marcarOrigem(o);
  renderizarLista($("lista-destinos"), $("busca").value, (d) => escolherDestino(d));
  atualizarUrl();
  if (estado.destino && estado.destino !== id) return escolherDestino(estado.destino);
  if (!silencioso) focarOrigem();
}

function focarOrigem() {
  const o = acharDestino(estado.origem);
  if (!o) return;
  // mostra a origem com uma vizinhança de ~60 m ao redor
  const r = 60 / estado.imagem.metros_por_pixel;
  estado.mapa.enquadrar(
    [{ x: o.x - r, y: o.y - r }, { x: o.x + r, y: o.y + r }],
    folgas(),
  );
}

function abrirDialogoOrigem() {
  renderizarLista($("lista-origens"), "", (id) => {
    $("dlg-origem").close();
    definirOrigem(id);
  }, { ignorarOrigem: false });
  $("dlg-origem").showModal();
}

// ------------------------------------------------------------------ rota

async function escolherDestino(id) {
  if (!estado.origem) return abrirDialogoOrigem();
  estado.destino = id;
  atualizarUrl();
  esconderErro();
  $("carregando").hidden = false;

  try {
    estado.rota = await buscarRota(estado.origem, id, $("acessivel").checked);
  } catch (e) {
    $("carregando").hidden = true;
    estado.mapa.limparRota();
    return mostrarErro(e.message);
  }
  $("carregando").hidden = true;

  mostrarTelaRota();
  estado.mapa.desenharRota(estado.rota.pontos);
  // espera o painel mudar de altura antes de enquadrar
  requestAnimationFrame(() => estado.mapa.enquadrar(estado.rota.pontos, folgas()));
}

function mostrarTelaRota() {
  const r = estado.rota;
  $("tela-escolha").hidden = true;
  $("tela-rota").hidden = false;
  $("btn-rota").hidden = false;
  $("rota-destino").textContent = acharDestino(r.destino).nome;
  $("rota-tempo").textContent = Math.max(1, Math.round(r.tempo_estimado_min));
  $("rota-dist").textContent = Math.round(r.distancia_m);
  $("selo-acessivel").hidden = !$("acessivel").checked;

  const passos = r.passos?.length ? r.passos.map((t) => ({ texto: t })) : passosAPartirDosPontos(r);
  const ol = $("passos");
  ol.innerHTML = "";
  passos.forEach((p, i) => {
    const li = document.createElement("li");
    if (i === 0) li.className = "inicio";
    if (i === passos.length - 1) li.className = "fim";
    li.innerHTML = `<span>${escapar(p.texto)}</span>${p.metros ? `<small>${p.metros} m</small>` : ""}`;
    ol.appendChild(li);
  });
}

/**
 * Enquanto o back-end não preenche "passos" (desafio gerar_passos), montamos
 * uma lista simples a partir dos nomes das passagens.
 * Convenção do mapa.json: passagens se chamam "Trecho (detalhe)".
 * "Via principal (Bloco A)" e "Via principal (Recepção)" viram um passo só:
 * "Siga por Via principal", com a soma das distâncias.
 */
function passosAPartirDosPontos(rota) {
  const mpp = estado.imagem.metros_por_pixel;
  const pts = rota.pontos;
  const base = (nome) => nome.replace(/\s*\(.*\)\s*$/, "");
  const passos = [{ texto: `Saia de ${pts[0].nome}` }];

  for (let i = 1; i < pts.length - 1; i++) {
    const seg = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y) * mpp;
    const nome = base(pts[i].nome);
    const anterior = passos[passos.length - 1];
    if (anterior.via === nome) anterior.m += seg;
    else passos.push({ via: nome, m: seg });
  }
  const ultimoSeg = pts.length > 1
    ? Math.hypot(pts.at(-1).x - pts.at(-2).x, pts.at(-1).y - pts.at(-2).y) * mpp : 0;
  if (passos.length > 1) passos[passos.length - 1].m += ultimoSeg;

  return [
    passos[0],
    ...passos.slice(1).map((p) => ({ texto: `Siga por ${p.via}`, metros: Math.round(p.m) })),
    { texto: `Chegada: ${pts.at(-1).nome}` },
  ];
}

function voltarParaEscolha() {
  estado.destino = null;
  estado.rota = null;
  estado.mapa.limparRota();
  $("tela-rota").hidden = true;
  $("tela-escolha").hidden = false;
  $("btn-rota").hidden = true;
  atualizarUrl();
  requestAnimationFrame(() => focarOrigem());
}

// ----------------------------------------------------------------- lista

function renderizarLista(container, filtro, aoEscolher, { ignorarOrigem = true } = {}) {
  const termo = normalizar(filtro);
  const itens = estado.destinos.filter(
    (d) => (!ignorarOrigem || d.id !== estado.origem) &&
      (!termo || normalizar(`${d.nome} ${d.id}`).includes(termo)),
  );
  container.innerHTML = "";
  if (!itens.length) {
    container.innerHTML = `<p class="vazio">Nada encontrado.</p>`;
    return;
  }
  for (const grupo of [["bloco", "Blocos"], ["local", "Locais"]]) {
    const doGrupo = itens.filter((d) => d.tipo === grupo[0]);
    if (!doGrupo.length) continue;
    const h = document.createElement("h3");
    h.textContent = grupo[1];
    container.appendChild(h);
    const wrap = document.createElement("div");
    wrap.className = `itens ${grupo[0]}`;
    for (const d of doGrupo) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "item";
      b.innerHTML = d.tipo === "bloco"
        ? `<span class="letra">${escapar(d.id)}</span><span>${escapar(d.nome)}</span>`
        : `<span>${escapar(d.nome)}</span>`;
      b.title = d.nome;
      b.addEventListener("click", () => aoEscolher(d.id));
      wrap.appendChild(b);
    }
    container.appendChild(wrap);
  }
}

// ------------------------------------------------------------ utilidades

const acharDestino = (id) => estado.destinos.find((d) => d.id === id);
const normalizar = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const escapar = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Pixels de tela cobertos pelo cabeçalho e pelo painel (no celular). */
function folgas() {
  const desktop = matchMedia("(min-width: 900px)").matches;
  return {
    topo: $("topo").offsetHeight + 16,
    base: desktop ? 0 : $("painel").offsetHeight,
  };
}

function atualizarUrl() {
  const p = new URLSearchParams();
  if (estado.origem) p.set("origem", estado.origem);
  if (estado.destino) p.set("destino", estado.destino);
  if ($("acessivel").checked) p.set("acessivel", "true");
  history.replaceState(null, "", `${location.pathname}?${p}`);
}

function mostrarErro(msg) {
  $("erro").textContent = msg;
  $("erro").hidden = false;
}
function esconderErro() {
  $("erro").hidden = true;
}

// --------------------------------------------------------------- eventos

$("busca").addEventListener("input", (e) =>
  renderizarLista($("lista-destinos"), e.target.value, (id) => escolherDestino(id)));
$("acessivel").addEventListener("change", () => {
  atualizarUrl();
  if (estado.destino) escolherDestino(estado.destino);
});
$("btn-trocar").addEventListener("click", voltarParaEscolha);
$("btn-origem").addEventListener("click", abrirDialogoOrigem);
$("btn-tudo").addEventListener("click", () => estado.mapa?.verTudo());
$("btn-rota").addEventListener("click", () =>
  estado.rota && estado.mapa.enquadrar(estado.rota.pontos, folgas()));

// Os botões do mapa ficam sempre logo acima do painel (que muda de altura).
new ResizeObserver(() =>
  document.documentElement.style.setProperty("--altura-painel", `${$("painel").offsetHeight}px`),
).observe($("painel"));

iniciar();
