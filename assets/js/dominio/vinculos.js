// Domínio: tipos de vínculo de quem trabalha na rede (professores, equipe do PROFIN e demais servidores).
// A lista vem de data/vinculos.json e é mantida pela SEED em Rede › Cadastros. VINCULOS (só os nomes dos ativos) é trocada no
// lugar por aplicarVinculos(), como os níveis em dominio/niveis.js. Funções puras, testadas em tools/testar-cadastros.mjs.
import { normalizar } from './texto.js';

/** Tipos de vínculo padrão (o mesmo conteúdo de data/vinculos.json). Em Sergipe o contrato temporário é feito por PSS. */
export const VINCULOS_PADRAO = [
  { id: 'v1', nome: 'Efetivo', descricao: 'Servidor concursado do quadro permanente.', ativo: true },
  { id: 'v2', nome: 'Contratado temporário (PSS)', descricao: 'Contrato por tempo determinado, selecionado em processo seletivo simplificado.', ativo: true },
  { id: 'v3', nome: 'Comissionado', descricao: 'Cargo em comissão, de livre nomeação.', ativo: true },
  { id: 'v4', nome: 'Cedido de outro órgão', descricao: 'Servidor de outro órgão ou município que trabalha na rede.', ativo: true },
  { id: 'v5', nome: 'Estagiário', descricao: 'Estudante em estágio supervisionado.', ativo: true },
  { id: 'v6', nome: 'Terceirizado', descricao: 'Trabalhador de empresa contratada.', ativo: true }
];
/** Nomes dos vínculos ativos, na ordem do cadastro (o que os formulários oferecem). */
export const VINCULOS = [];

/** Nomes antigos que continuam valendo nos cadastros salvos: "Contratado (REDA)" é o nome da Bahia; em Sergipe é PSS. */
const RENOMEADOS = { 'Contratado (REDA)': 'Contratado temporário (PSS)' };
/** Nome atual do vínculo (troca os nomes antigos; os demais ficam como estão). */
export const nomeAtualDoVinculo = (nome) => RENOMEADOS[nome] || nome || '';

export function aplicarVinculos(lista) {
  const validos = Array.isArray(lista) && lista.length && lista.every((v) => v && v.nome) ? lista : VINCULOS_PADRAO;
  VINCULOS.splice(0, VINCULOS.length, ...validos.filter((v) => v.ativo !== false).map((v) => v.nome));
  return VINCULOS;
}
aplicarVinculos(VINCULOS_PADRAO);

const resultado = (erros) => ({ ok: Object.keys(erros).length === 0, erros });
const igual = (a, b) => normalizar(a).replace(/\s+/g, ' ').trim() === normalizar(b).replace(/\s+/g, ' ').trim();

/** Cadastro e edição de tipo de vínculo (id: o que está sendo editado). */
export function validarVinculo(f, { vinculos, id = null }) {
  const e = {};
  const nome = String(f.nome ?? '').trim();
  if (nome.length < 4) e.nome = 'Escreva o nome do vínculo, com pelo menos 4 letras. Exemplo: Contratado temporário (PSS).';
  else if (nome.length > 50) e.nome = 'O nome tem no máximo 50 letras.';
  else if (vinculos.some((v) => v.id !== id && igual(v.nome, nome))) e.nome = 'Já existe um vínculo com esse nome.';
  if (String(f.descricao ?? '').trim().length > 160) e.descricao = 'A descrição tem no máximo 160 letras.';
  return resultado(e);
}
export function montarVinculo(f, { vinculos }) {
  const n = 1 + Math.max(0, ...vinculos.map((v) => Number(/^v(\d+)$/.exec(v.id)?.[1] || 0)));
  return { id: `v${n}`, nome: f.nome.trim(), descricao: String(f.descricao ?? '').trim(), ativo: true };
}

/** Quantas pessoas têm o vínculo (professores e equipe do PROFIN). */
export function usoDoVinculo(nome, { professores = [], equipe = [] }) {
  const p = professores.filter((x) => nomeAtualDoVinculo(x.vinculo) === nome).length;
  const m = equipe.filter((x) => nomeAtualDoVinculo(x.vinculo) === nome).length;
  return { professores: p, equipe: m, total: p + m };
}
/** Vínculo em uso não muda de nome nem é apagado (pode ser desativado: some dos formulários, quem já tem continua com ele). */
export function podeApagarVinculo(v, uso) {
  if (!uso.total) return { ok: true, motivo: '' };
  return { ok: false, motivo: `${uso.total} ${uso.total === 1 ? 'pessoa tem' : 'pessoas têm'} o vínculo ${v.nome}. Desative em vez de apagar: some dos formulários e quem já tem continua com ele.` };
}
/** Sempre fica pelo menos um vínculo ativo (os formulários precisam de uma opção). */
export const podeDesativarVinculo = (vinculos, id) => (vinculos.filter((v) => v.ativo !== false && v.id !== id).length ? { ok: true, motivo: '' } : { ok: false, motivo: 'Deixe pelo menos um tipo de vínculo ativo.' });
