/**
 * Camada de acesso à API. Toda chamada HTTP do front passa por aqui.
 *
 * API_BASE vazio = mesma origem (front servido pela própria API em "/").
 * Se o front rodar separado (Vite, React...), troque para "http://IP:8000".
 */
export const API_BASE = window.API_BASE ?? "";

/** Erro com mensagem já pronta para mostrar ao usuário. */
export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

const MENSAGENS = {
  404: "Esse local não existe no mapa.",
  422: "Não existe caminho entre esses dois pontos.",
  501: "Essa função ainda não foi implementada no back-end.",
};

async function get(caminho) {
  let resp;
  try {
    resp = await fetch(API_BASE + caminho);
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor. Verifique a rede.");
  }
  if (!resp.ok) {
    throw new ErroApi(resp.status, MENSAGENS[resp.status] ?? `Erro ${resp.status} no servidor.`);
  }
  return resp.json();
}

/** { arquivo, largura, altura, metros_por_pixel } */
export const buscarMapa = () => get("/mapa");

/** [{ id, tipo: "bloco" | "local", nome, x, y, descricao }] */
export const buscarDestinos = () => get("/blocos");

/** { origem, destino, distancia_m, tempo_estimado_min, pontos: [{id,nome,x,y}], passos } */
export const buscarRota = (origem, destino, acessivel = false) => {
  const qs = new URLSearchParams({ origem, destino, acessivel });
  return get(`/rotas?${qs}`);
};

/** URL da imagem de fundo servida pela API. */
export const urlImagem = (arquivo) => `${API_BASE}/static/${arquivo}`;
