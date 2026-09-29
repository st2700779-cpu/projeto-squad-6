// Domínio: séries, atos autorizativos e vagas (regras de matrícula da rede).

/** Séries atendidas pela rede, em ordem. */
export const SERIES = ['6º ano', '7º ano', '8º ano', '9º ano', '1ª série EM', '2ª série EM', '3ª série EM'];

/** A partir de 120 dias do vencimento, o ato entra em alerta e a rede já pode pedir a renovação. */
export const DIAS_RENOVACAO = 120;

/**
 * Etapa de ensino de uma série.
 * @param {string} serie Ex.: "1ª série EM".
 * @returns {string} "Ensino Médio" ou "Ensino Fundamental — Anos Finais".
 */
export const etapaDaSerie = (serie) => (serie.includes('EM') ? 'Ensino Médio' : 'Ensino Fundamental — Anos Finais');

/** "1ª série EM" → "1ª série do Ensino Médio"; "6º ano" → "6º ano do Ensino Fundamental". */
export const serieCompleta = (serie) => (serie.includes('EM') ? serie.replace(' EM', ' do Ensino Médio') : `${serie} do Ensino Fundamental`);

/** "Colégio Estadual Rio Sergipe" → "C. E. Rio Sergipe" (telas estreitas). */
export const nomeCurto = (nome) => nome.replace(/^Colégio Estadual /, 'C. E. ').replace(/^Escola Estadual /, 'E. E. ');

/** Série seguinte, para a rematrícula (null no fim do Ensino Médio). */
export const proximaSerie = (serie) => SERIES[SERIES.indexOf(serie) + 1] || null;

/** Coluna da matriz do Ensino Médio para a série ("2ª série EM" → 2). Null fora do EM. */
export const colunaDaMatriz = (serie) => { const m = /^(\d)ª série/.exec(serie); return m ? Number(m[1]) : null; };

/**
 * Situação de um ato autorizativo em relação a hoje.
 * @param {{validade: string}} ato Validade em AAAA-MM-DD.
 * @param {Date} [hoje]
 * @returns {{vigente: boolean, texto: string, tipo: 'erro'|'atencao'|'ok', dias: number}}
 */
export function situacaoAto(ato, hoje = new Date()) {
  const fim = new Date(ato.validade + 'T23:59:59');
  const dias = Math.ceil((fim - hoje) / 86400000);
  if (dias < 0) return { vigente: false, texto: 'Vencido', tipo: 'erro', dias };
  if (dias <= DIAS_RENOVACAO) return { vigente: true, texto: `Vence em ${dias} dias`, tipo: 'atencao', dias };
  return { vigente: true, texto: 'Vigente', tipo: 'ok', dias };
}

/** Ato da escola para a etapa da série, ou null (RN-01 e RN-04: só oferta a série quem tem ato vigente). */
export function atoDaEtapa(atos, escolaId, serie) {
  return atos.find((a) => a.escolaId === escolaId && a.etapa === etapaDaSerie(serie)) || null;
}

/**
 * Motivo pelo qual a escola não pode receber matrícula na série (sem ato, ato vencido ou sem vaga).
 * @returns {string|null} Texto para a família, ou null se a matrícula é possível.
 */
export function motivoBloqueio({ atos, vagas, escolaId, serie }) {
  const ato = atoDaEtapa(atos, escolaId, serie);
  if (!ato) return 'Esta escola não oferece esta série.';
  if (!situacaoAto(ato).vigente) return 'Sem autorização vigente para esta série.';
  if (!(vagas[escolaId]?.[serie] > 0)) return 'Sem vagas nesta série.';
  return null;
}
