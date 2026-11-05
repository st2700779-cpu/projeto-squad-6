// Domínio: anotações do PROFIN sobre cada escola (data/profin-notas.json, conjunto alterável "profin-notas").
// Formato guardado: { "e1|Custeio": [ { quando, por, texto, ...campos novos } ], "e1|Geral": [...] } — o mais recente primeiro.
// Dois tipos de anotação, como no modelo de painel do PROFIN:
//  - contexto da escola: o que os documentos não mostram (troca de gestor, obra atrasada, verba reservada);
//  - pendência: algo que a escola precisa regularizar (ata com data errada, item diferente da nota fiscal), com o documento
//    (NF) e a situação aberta ou resolvida.
// Cada anotação pode ser compartilhada com a gestão da escola (aparece em Direção › Financeiro) ou ficar interna.
// As anotações antigas não têm esses campos: valem como contexto compartilhado (é como já apareciam), sem mudar o arquivo.
// Funções puras, testadas em tools/testar-cadastros.mjs.

export const TIPOS_DE_NOTA = { contexto: 'Contexto da escola', pendencia: 'Pendência' };
export const GERAL = 'Geral';

/** Anotação com todos os campos preenchidos (as antigas viram contexto compartilhado). */
export function normalizarNota(n) {
  const tipo = n.tipo === 'pendencia' ? 'pendencia' : 'contexto';
  return { ...n, tipo, nf: n.nf || '', compartilhada: n.compartilhada !== false, aberta: tipo === 'pendencia' ? n.aberta !== false : false };
}

/**
 * Anotações de uma escola (ou de todas, sem escolaId), uma lista só, da mais recente para a mais antiga.
 * Cada item leva a chave ("e1|Custeio") e o índice no arquivo, para marcar como resolvida depois.
 * @param {{soCompartilhadas?: boolean}} opcoes soCompartilhadas: o que a gestão da escola pode ver
 */
export function notasDaEscola(notas, escolaId = null, { soCompartilhadas = false } = {}) {
  return Object.entries(notas || {})
    .filter(([chave]) => !escolaId || chave.startsWith(`${escolaId}|`))
    .flatMap(([chave, lista]) => (lista || []).map((n, indice) => ({ ...normalizarNota(n), chave, indice, escolaId: chave.split('|')[0], categoria: chave.split('|').slice(1).join('|') })))
    .filter((n) => !soCompartilhadas || n.compartilhada)
    .sort((a, b) => String(b.quando).localeCompare(String(a.quando)) || a.indice - b.indice);
}
export const pendenciasAbertas = (lista) => lista.filter((n) => n.tipo === 'pendencia' && n.aberta);
export const contextos = (lista) => lista.filter((n) => n.tipo === 'contexto');

/** Nova anotação: texto de 10 a 400 letras, tipo e categoria da lista; documento (NF) opcional, até 40 letras. */
export function validarNota(f, { categorias }) {
  const e = {};
  const texto = String(f.texto ?? '').trim();
  if (texto.length < 10) e.texto = 'Escreva a anotação, com pelo menos 10 letras, para que ela seja útil.';
  else if (texto.length > 400) e.texto = 'A anotação tem no máximo 400 letras.';
  if (!TIPOS_DE_NOTA[f.tipo]) e.tipo = 'Escolha o tipo: pendência ou contexto da escola.';
  if (![GERAL, ...categorias].includes(f.categoria)) e.categoria = 'Escolha a categoria do recurso.';
  if (String(f.nf ?? '').trim().length > 40) e.nf = 'O documento tem no máximo 40 letras. Exemplo: NF 101.';
  return { ok: Object.keys(e).length === 0, erros: e };
}
/** Acrescenta a anotação no começo da lista da chave "escola|categoria". Devolve um objeto novo (o original não muda). */
export function acrescentarNota(notas, f, { escolaId, por, hoje }) {
  const chave = `${escolaId}|${f.categoria}`;
  const nova = { quando: hoje, por, texto: String(f.texto).trim(), tipo: f.tipo, compartilhada: Boolean(f.compartilhada) };
  if (f.tipo === 'pendencia') { nova.aberta = true; if (String(f.nf ?? '').trim()) nova.nf = String(f.nf).trim(); }
  return { ...notas, [chave]: [nova, ...(notas[chave] || [])] };
}
/** Marca a pendência como resolvida (ou reabre), com quem e quando. Contexto não muda. */
export function alternarResolvida(notas, chave, indice, { por, hoje }) {
  const lista = notas[chave] || [];
  const n = lista[indice];
  if (!n || normalizarNota(n).tipo !== 'pendencia') return notas;
  const aberta = normalizarNota(n).aberta;
  const { resolvidaEm, resolvidaPor, ...semResolucao } = n; // eslint-disable-line no-unused-vars
  const nova = aberta ? { ...n, aberta: false, resolvidaEm: hoje, resolvidaPor: por } : { ...semResolucao, aberta: true, reabertaEm: hoje, reabertaPor: por };
  return { ...notas, [chave]: lista.map((x, i) => (i === indice ? nova : x)) };
}
