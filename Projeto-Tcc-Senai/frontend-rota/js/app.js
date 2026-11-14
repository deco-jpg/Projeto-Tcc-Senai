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
 *
 * Melhorias de usabilidade (10 heurísticas de Nielsen) estão marcadas com "H1" ... "H10".
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
  empurrou: false, // true se a tela de rota criou uma entrada no histórico (H3)
  pedido: 0, // número do último pedido de rota (descarta respostas antigas)
  emAndamento: null,
  recolhido: false,// chave do pedido em andamento (evita toques repetidos)
};

const CHAVE_RECENTES = "senaiway_recentes";

// ------------------------------------------------------------------ início

async function iniciar() {
  esconderErro();
  const params = new URLSearchParams(location.search);
  try {
    [estado.imagem, estado.destinos] = await Promise.all([buscarMapa(), buscarDestinos()]);
  } catch (e) {
    // H9: erro com uma ação para resolver
    return mostrarErro(e.message, { texto: "Tentar de novo", fazer: iniciar });
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
    if (destino && acharDestino(destino)) escolherDestino(destino, { substituir: true });
    else requestAnimationFrame(() => focarOrigem());
  } else {
    requestAnimationFrame(() => estado.mapa.verTudo());
    // H5: se o QR Code não foi reconhecido, explicamos em vez de só abrir a lista
    abrirDialogoOrigem(origem ? "Não reconhecemos o QR Code lido. Escolha onde você está." : "");
  }
}

// ---------------------------------------------------------------- origem

function definirOrigem(id, { silencioso = false } = {}) {
  estado.origem = id;
  const o = acharDestino(id);
  $("nome-origem").textContent = o.nome;
  estado.mapa.marcarOrigem(o);
  renderizarLista($("lista-destinos"), $("busca").value, (d) => escolherDestino(d));
  mostrarRecentes();
  atualizarUrl();
  if (estado.destino && estado.destino !== id) return escolherDestino(estado.destino, { substituir: true });
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

function abrirDialogoOrigem(aviso = "") {
  renderizarLista($("lista-origens"), "", (id) => {
    $("dlg-origem").close();
    definirOrigem(id);
  }, { ignorarOrigem: false });
  const el = $("aviso-origem");
  el.textContent = aviso;
  el.hidden = !aviso;
  $("dlg-origem").showModal();
}

// ------------------------------------------------------------------ rota

async function escolherDestino(id, { substituir = false } = {}) {
  if (!estado.origem) return abrirDialogoOrigem();

  // H1/H5: toque repetido no mesmo pedido é ignorado (evita pedido em duplicidade)
  const chave = `${estado.origem}>${id}>${$("acessivel").checked}`;
  if (estado.emAndamento === chave) return;
  estado.emAndamento = chave;
  const meuPedido = ++estado.pedido;

  esconderErro();
  definirOcupado(true);

  let rota;
  try {
    rota = await buscarRota(estado.origem, id, $("acessivel").checked);
  } catch (e) {
    if (meuPedido !== estado.pedido) return; // já existe um pedido mais novo
    estado.emAndamento = null;
    definirOcupado(false);
    estado.mapa.limparRota();
    return tratarErroDeRota(e, id);
  }
  if (meuPedido !== estado.pedido) return;
  estado.emAndamento = null;
  definirOcupado(false);

  // H3: a primeira rota cria uma entrada no histórico; assim o botão "voltar" do celular
  // volta para a escolha de destino em vez de sair do app.
  const entrando = !estado.destino && !substituir;
  estado.rota = rota;
  estado.destino = id;
  atualizarUrl(entrando ? "push" : "replace");
  if (entrando) estado.empurrou = true;

  guardarRecente(id);
  mostrarTelaRota();
  estado.mapa.desenharRota(estado.rota.pontos);
  // espera o painel mudar de altura antes de enquadrar
  requestAnimationFrame(() => estado.mapa.enquadrar(estado.rota.pontos, folgas()));
}

/** H9: explica o problema em linguagem simples e oferece uma saída. */
function tratarErroDeRota(e, destinoId) {
  const acessivel = $("acessivel").checked;
  const origem = acharDestino(estado.origem)?.nome;
  const destino = acharDestino(destinoId)?.nome;
  if (e.status === 422 && acessivel) {
    return mostrarErro(`Não há caminho sem escadas de ${origem} até ${destino}.`, {
      texto: "Ver rota comum",
      fazer: () => {
        $("acessivel").checked = false;
        escolherDestino(destinoId);
      },
    });
  }
  if (e.status === 422) {
    return mostrarErro(`Não existe caminho entre ${origem} e ${destino}. Escolha outro destino.`);
  }
  const podeRepetir = e.status === 0 || e.status >= 500;
  mostrarErro(e.message, podeRepetir ? { texto: "Tentar de novo", fazer: () => escolherDestino(destinoId) } : null);
}

function definirOcupado(ocupado) {
  $("carregando").hidden = !ocupado;
  $("painel").classList.toggle("ocupado", ocupado);
  $("painel").setAttribute("aria-busy", String(ocupado));
}

function mostrarTelaRota() {
  const r = estado.rota;
  $("tela-escolha").hidden = true;
  $("tela-rota").hidden = false;
  $("btn-rota").hidden = false;
  $("aviso").hidden = true;
  $("rota-destino").textContent = acharDestino(r.destino).nome;
  $("rota-tempo").textContent = Math.max(1, Math.round(r.tempo_estimado_min));
  $("rota-dist").textContent = Math.round(r.distancia_m);
    $("btn-alca").disabled = false;
  $("resumo-curto").innerHTML =
    `<strong>${$("rota-tempo").textContent} min a pé · ${$("rota-dist").textContent} m</strong><span>Ver passos ▴</span>`;
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
  estado.pedido++; // descarta qualquer cálculo ainda em andamento
  estado.emAndamento = null;
  estado.destino = null;
  estado.rota = null;
  estado.empurrou = false;
  definirRecolhido(false);
  $("btn-alca").disabled = true;
  estado.mapa.limparRota();
  definirOcupado(false);
  esconderErro();
  $("tela-rota").hidden = true;
  $("tela-escolha").hidden = false;
  $("btn-rota").hidden = true;
  mostrarRecentes();
  atualizarUrl();
  requestAnimationFrame(() => focarOrigem());
}

/** H3: "Trocar destino" usa o histórico, igual ao botão voltar do celular. */
function trocarDestino() {
  if (estado.empurrou) {
    estado.empurrou = false;
    history.back(); // o evento "popstate" (abaixo) chama voltarParaEscolha()
  } else {
    voltarParaEscolha();
  }
}
// ------------------------------------------------- painel recolhível (celular)

const ehCelular = () => !matchMedia("(min-width: 900px)").matches;

/** Abaixa (true) ou levanta (false) o painel da rota, para ver mais do mapa. */
function definirRecolhido(recolher) {
  if (recolher && (!ehCelular() || $("tela-rota").hidden)) return;
  estado.recolhido = recolher;
  $("painel").classList.toggle("recolhido", recolher);
  const alca = $("btn-alca");
  alca.setAttribute("aria-expanded", String(!recolher));
  alca.setAttribute("aria-label", recolher ? "Mostrar detalhes da rota" : "Recolher detalhes da rota");
  // o painel mudou de altura: enquadra a rota de novo usando a área livre do mapa
  if (estado.rota) requestAnimationFrame(() => estado.mapa.enquadrar(estado.rota.pontos, folgas()));
}

// ---------------------------------------------------------------- recentes (H6)

function lerRecentes() {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_RECENTES)) ?? [];
  } catch {
    return [];
  }
}

function guardarRecente(id) {
  try {
    const lista = [id, ...lerRecentes().filter((x) => x !== id)].slice(0, 3);
    localStorage.setItem(CHAVE_RECENTES, JSON.stringify(lista));
  } catch {
    /* sem armazenamento: o recurso simplesmente não aparece */
  }
}

function mostrarRecentes() {
  const ids = lerRecentes().filter((id) => acharDestino(id) && id !== estado.origem);
  const digitando = $("busca").value.trim() !== "";
  $("recentes").hidden = !ids.length || digitando;
  const caixa = $("lista-recentes");
  caixa.innerHTML = "";
  for (const id of ids) caixa.appendChild(criarItem(acharDestino(id), (d) => escolherDestino(d)));
}

// ----------------------------------------------------------------- lista

function criarItem(d, aoEscolher) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "item";
  b.innerHTML = d.tipo === "bloco"
    ? `<span class="letra">${escapar(d.id)}</span><span>${escapar(d.nome)}</span>`
    : `<span>${escapar(d.nome)}</span>`;
  b.title = d.nome;
  b.addEventListener("click", () => {
    // H1: o item escolhido fica destacado enquanto a rota é calculada
    document.querySelectorAll(".item.ativo").forEach((x) => x.classList.remove("ativo"));
    b.classList.add("ativo");
    aoEscolher(d.id);
  });
  return b;
}

function renderizarLista(container, filtro, aoEscolher, { ignorarOrigem = true } = {}) {
  const termo = normalizar(filtro);
  const itens = estado.destinos.filter(
    (d) => (!ignorarOrigem || d.id !== estado.origem) &&
      (!termo || normalizar(`${d.nome} ${d.id}`).includes(termo)),
  );
  container.innerHTML = "";
  if (!itens.length) {
    // H9: diz o que fazer, não só "nada encontrado"
    container.innerHTML = `<p class="vazio">Nenhum destino com esse nome. Confira a escrita ou apague a busca.</p>`;
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
    for (const d of doGrupo) wrap.appendChild(criarItem(d, aoEscolher));
    container.appendChild(wrap);
  }
}

// ------------------------------------------------------------ utilidades

const acharDestino = (id) => estado.destinos.find((d) => d.id === id);
const normalizar = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
const escapar = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Pixels de tela cobertos pelo cabeçalho e pelo painel (no celular). */
function folgas() {
  const desktop = matchMedia("(min-width: 900px)").matches;
  return {
    topo: $("topo").offsetHeight + 16,
    base: desktop ? 0 : $("painel").offsetHeight,
  };
}

/** modo "push" cria uma entrada nova no histórico; "replace" só atualiza a atual. */
function atualizarUrl(modo = "replace") {
  const p = new URLSearchParams();
  if (estado.origem) p.set("origem", estado.origem);
  if (estado.destino) p.set("destino", estado.destino);
  if ($("acessivel").checked) p.set("acessivel", "true");
  const url = `${location.pathname}?${p}`;
  if (modo === "push") history.pushState(null, "", url);
  else history.replaceState(null, "", url);
}

function mostrarErro(msg, acao = null) {
  $("erro-texto").textContent = msg;
  const botao = $("erro-acao");
  botao.hidden = !acao;
  botao.textContent = acao?.texto ?? "";
  botao.onclick = acao ? acao.fazer : null;
  $("erro").hidden = false;
}
function esconderErro() {
  $("erro").hidden = true;
}

let temporizadorAviso;
/** Mensagem curta de confirmação (H1). */
function avisar(texto) {
  const el = $("aviso");
  el.textContent = texto;
  el.hidden = false;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (el.hidden = true), 4000);
}

/** H7: envia a rota (a URL já leva origem, destino e acessibilidade). */
async function compartilhar() {
  const titulo = `Rota até ${acharDestino(estado.destino).nome}`;
  if (navigator.share) {
    try {
      await navigator.share({ title: titulo, url: location.href });
      return;
    } catch (e) {
      if (e.name === "AbortError") return; // a pessoa fechou a janela de compartilhar
    }
  }
  try {
    await navigator.clipboard.writeText(location.href);
    avisar("Link copiado. É só colar numa conversa.");
  } catch {
    avisar("Não foi possível copiar. Copie o endereço do navegador.");
  }
}

// --------------------------------------------------------------- eventos

$("busca").addEventListener("input", (e) => {
  renderizarLista($("lista-destinos"), e.target.value, (id) => escolherDestino(id));
  mostrarRecentes();
});
// H7: Enter (ou "Ir" no teclado do celular) abre o primeiro resultado
$("busca").addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return;
  const primeiro = $("lista-destinos").querySelector(".item");
  if (primeiro) {
    e.preventDefault();
    primeiro.click();
  }
});
$("acessivel").addEventListener("change", () => {
  atualizarUrl();
  if (estado.destino) escolherDestino(estado.destino, { substituir: true });
});
$("btn-trocar").addEventListener("click", trocarDestino);
$("btn-origem").addEventListener("click", () => abrirDialogoOrigem());
$("btn-ajuda").addEventListener("click", () => $("dlg-ajuda").showModal());
$("btn-compartilhar").addEventListener("click", compartilhar);
$("btn-tudo").addEventListener("click", () => estado.mapa?.verTudo());
$("btn-rota").addEventListener("click", () =>
  estado.rota && estado.mapa.enquadrar(estado.rota.pontos, folgas()));

// Alça do painel: arrastar para baixo recolhe, para cima expande, um toque alterna.
let inicioY = null;
$("btn-alca").addEventListener("pointerdown", (e) => {
  inicioY = e.clientY;
  $("btn-alca").setPointerCapture(e.pointerId);
});
$("btn-alca").addEventListener("pointerup", (e) => {
  if (inicioY === null) return;
  const dy = e.clientY - inicioY;
  inicioY = null;
  if (dy > 30) definirRecolhido(true);
  else if (dy < -30) definirRecolhido(false);
  else definirRecolhido(!estado.recolhido);
});
$("btn-alca").addEventListener("pointercancel", () => (inicioY = null));
// teclado (Enter/Espaço): o clique não vem de um toque, então alterna aqui
$("btn-alca").addEventListener("click", (e) => {
  if (e.detail === 0) definirRecolhido(!estado.recolhido);
});
$("resumo-curto").addEventListener("click", () => definirRecolhido(false));

// H3: botão "voltar" / "avançar" do celular acompanha a tela
window.addEventListener("popstate", () => {
  if (!estado.mapa) return;
  const p = new URLSearchParams(location.search);
  $("acessivel").checked = p.get("acessivel") === "true";
  const destino = p.get("destino")?.toUpperCase();
  if (destino && acharDestino(destino)) escolherDestino(destino, { substituir: true });
  else voltarParaEscolha();
});

// Os botões do mapa ficam sempre logo acima do painel (que muda de altura).
new ResizeObserver(() =>
  document.documentElement.style.setProperty("--altura-painel", `${$("painel").offsetHeight}px`),
).observe($("painel"));

iniciar();