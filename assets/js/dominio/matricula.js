// Domínio: séries, atos autorizativos e vagas (regras de matrícula da rede).
import { hojeISO, diasEntreDatas } from './hoje.js';
import { SERIES, nivelDaSerie, ETAPAS } from './niveis.js';

/** Séries da matrícula on-line, em ordem (vêm dos níveis cadastrados em Rede › Cadastros; ver dominio/niveis.js). */
export { SERIES };

/** A partir de 120 dias do vencimento, o ato entra em alerta e a rede já pode pedir a renovação. */
export const DIAS_RENOVACAO = 120;

/**
 * Etapa de ensino de uma série.
 * @param {string} serie Ex.: "1ª série EM".
 * @returns {string} "Ensino Médio" ou "Ensino Fundamental — Anos Finais".
 */
export const etapaDaSerie = (serie) => nivelDaSerie(serie)?.etapa ?? (serie.includes(' EM') ? 'Ensino Médio' : /^[1-5]º ano$/.test(serie) ? 'Ensino Fundamental — Anos Iniciais' : 'Ensino Fundamental — Anos Finais');

/** "1ª série EM" → "1ª série do Ensino Médio"; "6º ano" → "6º ano do Ensino Fundamental". */
export const serieCompleta = (serie) => {
  const n = nivelDaSerie(serie);
  if (n && !['n-ai', 'n-af', 'n-em'].includes(n.id)) return serie.includes(n.curto) || /^(EJA|Técnico)/.test(serie) ? serie : `${serie} (${n.curto})`;
  return / EM$/.test(serie) ? serie.replace(' EM', ' do Ensino Médio') : /º ano$/.test(serie) ? `${serie} do Ensino Fundamental` : serie;
};

/** "Colégio Estadual Professor Osvaldo Tavares Rezende" → "C. E. Professor Osvaldo Tavares Rezende" (telas estreitas). */
export const nomeCurto = (nome) => nome.replace(/^Colégio Estadual /, 'C. E. ').replace(/^Escola Estadual /, 'E. E. ');

/**
 * Série seguinte, para a rematrícula: a próxima do mesmo nível; no fim do nível, a primeira do nível que vem depois
 * (campo continuaEm, como Anos Iniciais → Anos Finais → Ensino Médio). Null no fim do último nível.
 */
export function proximaSerie(serie) {
  const n = nivelDaSerie(serie);
  if (n) {
    const i = n.series.indexOf(serie);
    if (i < n.series.length - 1) return n.series[i + 1];
    const depois = ETAPAS.find((x) => x.id === n.continuaEm);
    return depois?.series[0] || null;
  }
  const m = /^(\d)º ano$/.exec(serie);
  return m ? (Number(m[1]) < 5 ? `${Number(m[1]) + 1}º ano` : SERIES[0] || null) : null;
}

/** Coluna da matriz do Ensino Médio para a série ("2ª série EM" → 2). Null fora do EM. */
export const colunaDaMatriz = (serie) => { const m = /^(\d)ª série/.exec(serie); return m ? Number(m[1]) : null; };

/**
 * Situação de um ato autorizativo em relação a hoje (dias contados no calendário: no dia da validade ainda vale, com 0 dia).
 * @param {{validade: string}} ato Validade em AAAA-MM-DD.
 * @param {string|Date} [hoje] Data AAAA-MM-DD (ou Date); sem ela, a data de referência da demonstração.
 * @returns {{vigente: boolean, texto: string, tipo: 'erro'|'atencao'|'ok', dias: number}}
 */
export function situacaoAto(ato, hoje = hojeISO()) {
  const dia = hoje instanceof Date ? hoje.toISOString().slice(0, 10) : hoje;
  const dias = diasEntreDatas(dia, ato.validade);
  if (dias < 0) return { vigente: false, texto: 'Vencido', tipo: 'erro', dias };
  if (dias <= DIAS_RENOVACAO) return { vigente: true, texto: dias === 0 ? 'Vence hoje' : `Vence em ${dias} ${dias === 1 ? 'dia' : 'dias'}`, tipo: 'atencao', dias };
  return { vigente: true, texto: 'Vigente', tipo: 'ok', dias };
}

/**
 * Ato da escola para a etapa da série, ou null (RN-01 e RN-04: só oferta a série quem tem ato vigente).
 * O ato pode dizer quais séries da etapa a escola tem (campo `series`); sem o campo, a escola tem todas as séries da etapa.
 */
export function atoDaEtapa(atos, escolaId, serie) {
  const ato = atos.find((a) => a.escolaId === escolaId && a.etapa === etapaDaSerie(serie)) || null;
  return ato && Array.isArray(ato.series) && !ato.series.includes(serie) ? null : ato;
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
