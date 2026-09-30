// Domínio: notas, frequência e situação do estudante. Todas as regras de aprovação ficam aqui.
//
// Regras (Lei de Diretrizes e Bases: frequência mínima de 75% das aulas dadas):
//  - Média do estudante na matéria = média das notas dos bimestres já lançados, com 1 casa decimal.
//  - Frequência (%) = 100 − faltas ÷ aulas dadas × 100.
//  - Frequência abaixo de 75%          → Reprovado por frequência.
//  - Média de 6,0 ou mais              → Aprovado.
//  - Média de 4,0 a 5,9                → Em recuperação.
//  - Média abaixo de 4,0               → Reprovado.
//  - Sem nenhuma nota lançada          → Sem notas (situação ainda não definida).

export const MEDIA_APROVACAO = 6;
export const MEDIA_RECUPERACAO = 4;
export const PRESENCA_MINIMA = 75;

const lancada = (n) => n !== null && n !== undefined && n !== '' && !Number.isNaN(Number(n));

/**
 * Média das notas dos bimestres já lançados, com 1 casa decimal.
 * @param {...(number|null)} notas Notas dos bimestres; vazias (null) são ignoradas.
 * @returns {number|null} Null quando nenhuma nota foi lançada.
 */
export function media(...notas) {
  const valores = notas.filter(lancada).map(Number);
  if (!valores.length) return null;
  return Math.round((valores.reduce((s, n) => s + n, 0) / valores.length) * 10) / 10;
}

/**
 * Frequência em porcentagem.
 * @param {number} faltas
 * @param {number} aulasDadas Aulas dadas até hoje no ano letivo.
 * @returns {number} De 0 a 100.
 */
export const presenca = (faltas, aulasDadas) => (aulasDadas > 0 ? Math.min(100, Math.max(0, 100 - (faltas / aulasDadas) * 100)) : 100);

/**
 * Situação do estudante numa matéria, aplicando as regras do topo deste arquivo.
 * @param {number|null} mediaMateria
 * @param {number} [frequencia] Frequência geral em %.
 * @returns {{chave: 'aprovado'|'recuperacao'|'reprovado'|'sem-notas', texto: string, tipo: 'ok'|'atencao'|'erro'|'neutra', motivo: string}}
 */
export function situacao(mediaMateria, frequencia = 100) {
  if (frequencia < PRESENCA_MINIMA) return { chave: 'reprovado', texto: 'Reprovado por frequência', tipo: 'erro', motivo: `Frequência abaixo de ${PRESENCA_MINIMA}%` };
  if (mediaMateria === null) return { chave: 'sem-notas', texto: 'Sem notas', tipo: 'neutra', motivo: 'Nenhuma nota lançada' };
  if (mediaMateria >= MEDIA_APROVACAO) return { chave: 'aprovado', texto: 'Aprovado', tipo: 'ok', motivo: `Média ${MEDIA_APROVACAO} ou mais` };
  if (mediaMateria >= MEDIA_RECUPERACAO) return { chave: 'recuperacao', texto: 'Em recuperação', tipo: 'atencao', motivo: `Média entre ${MEDIA_RECUPERACAO} e ${MEDIA_APROVACAO}` };
  return { chave: 'reprovado', texto: 'Reprovado', tipo: 'erro', motivo: `Média abaixo de ${MEDIA_RECUPERACAO}` };
}

/**
 * Notas, faltas e situação de um estudante. Se a turma tem diário do professor, Matemática e faltas vêm dele.
 * @param {object} est Estudante de estudantes.json.
 * @param {object} diario Diário por turma: { [turmaId]: [{id, n1, n2, faltas}] }.
 * @param {number} aulasDadas Aulas dadas no ano (data/letivo.json).
 * @returns {{linhas: Array, faltas: number, presenca: number, matematicaDoDiario: boolean}}
 */
export function desempenho(est, diario, aulasDadas) {
  const doDiario = est.turmaId && diario?.[est.turmaId]?.find((a) => a.id === est.id);
  const notas = { ...est.notas };
  if (doDiario) notas['Matemática'] = [doDiario.n1, doDiario.n2];
  const faltas = doDiario ? doDiario.faltas : (est.faltas ?? 0);
  const freq = presenca(faltas, aulasDadas);
  const linhas = Object.entries(notas).map(([materia, [n1, n2]]) => {
    const m = media(n1, n2);
    return { materia, n1, n2, media: m, situacao: situacao(m, freq) };
  });
  linhas.sort((a, b) => (a.materia === 'Matemática' ? -1 : b.materia === 'Matemática' ? 1 : 0));
  return { linhas, faltas, presenca: freq, matematicaDoDiario: Boolean(doDiario) };
}
