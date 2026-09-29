// Impacto do vencimento de um ato autorizativo: em qual faixa de prioridade ele está e quantas turmas e estudantes
// dependem dele. Turmas e matriculados vêm dos dados do protótipo (turmas da secretaria e data/turmas-rede.json).
import { etapaDaSerie } from './matricula.js';

/** Faixas de prioridade, da mais urgente para a menos. Sempre mostradas com texto, nunca só com cor. */
export const FAIXAS_ATO = [
  { chave: 'vencido', rotulo: 'Vencido', tipo: 'erro' },
  { chave: 'ate30', rotulo: 'Vence em até 30 dias', tipo: 'erro' },
  { chave: 'ate90', rotulo: 'Vence em até 90 dias', tipo: 'atencao' },
  { chave: 'depois', rotulo: 'Mais de 90 dias', tipo: 'ok' }
];
/** @param {number} dias Dias até o vencimento (negativo se já venceu). */
export const faixaDoAto = (dias) => FAIXAS_ATO[dias < 0 ? 0 : dias <= 30 ? 1 : dias <= 90 ? 2 : 3];

/** Turmas aprovadas da escola na etapa do ato e soma dos matriculados nelas. */
export function impactoDoAto(ato, turmas) {
  const afetadas = turmas.filter((t) => t.escolaId === ato.escolaId && t.situacao === 'Aprovada' && etapaDaSerie(t.serie) === ato.etapa);
  return { turmas: afetadas.length, alunos: afetadas.reduce((soma, t) => soma + (t.matriculados || 0), 0) };
}
