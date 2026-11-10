/**
 * Camada de acesso à API. Toda chamada HTTP do front passa por aqui.
 *
 * API_BASE vazio = mesma origem (front servido pela própria API em "/").
 * Se o front rodar separado (Vite, React...), troque para "http://IP:8000".
 */
export const API_BASE = "https://projeto-tcc-senai-f73v.vercel.app";

/** Erro com mensagem já pronta para mostrar ao usuário. */
export class ErroApi extends Error {
  constructor(status, mensagem) {
    super(mensagem);
    this.status = status;
  }
}

// Heurísticas 2 e 9: mensagens em linguagem simples, dizendo o que fazer.
const MENSAGENS = {
  404: "Não encontramos esse local no mapa. Escolha outro destino.",
  422: "Não existe caminho entre esses dois pontos.",
};
const MENSAGEM_SERVIDOR = "O sistema teve um problema agora. Tente de novo em instantes.";
const MENSAGEM_OUTRO = "Não foi possível concluir a ação. Tente de novo.";

async function get(caminho) {
  let resp;
  try {
    resp = await fetch(API_BASE + caminho);
  } catch {
    throw new ErroApi(0, "Sem conexão com o servidor. Verifique sua internet e tente de novo.");
  }
  if (!resp.ok) {
    const mensagem = MENSAGENS[resp.status] ?? (resp.status >= 500 ? MENSAGEM_SERVIDOR : MENSAGEM_OUTRO);
    throw new ErroApi(resp.status, mensagem);
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