// Domínio: turmas, alocação de professores e diário. A turma da escola (turmas.json) é a única
// referência de turma: "Minhas turmas" do professor nasce da alocação feita pela escola, e o diário
// recebe os estudantes que a secretaria enturma.
import { colunaDaMatriz } from './matricula.js';

/** Ano letivo em curso (exibição). */
export const ANO_LETIVO = 2026;

/**
 * Código da turma para identificação em telas e listas: ano, série, letra e turno.
 * Ex.: "1ª série A", Ensino Médio, manhã → "2026-1EM-A-M".
 * @param {{nome: string, serie: string, turno: string}} turma
 */
export function codigoDaTurma(turma) {
  const numero = /\d/.exec(turma.serie)?.[0] ?? '';
  const serie = `${numero}${turma.serie.includes('EM') ? 'EM' : 'EF'}`;
  const letra = turma.nome.trim().split(' ').pop().toUpperCase();
  return `${ANO_LETIVO}-${serie}-${letra}-${(turma.turno || '?')[0].toUpperCase()}`;
}

/** Aulas por semana de um componente na série (matriz curricular do Ensino Médio). 0 se não constar. */
export const aulasDoComponente = (matriz, componente, serie) => matriz.find((c) => c[0] === componente)?.[colunaDaMatriz(serie)] || 0;

/**
 * Aulas semanais que o professor já tem alocadas nas turmas da escola.
 * @param {string} professorId
 * @param {{alocacoes: Array, turmas: Array, matriz: Array}} ctx
 */
export function aulasAlocadas(professorId, { alocacoes, turmas, matriz }) {
  return alocacoes.filter((a) => a.professorId === professorId)
    .reduce((s, a) => s + aulasDoComponente(matriz, a.componente, turmas.find((t) => t.id === a.turmaId)?.serie || ''), 0);
}

/**
 * Turmas aprovadas em que o professor está alocado (base de "Minhas turmas" e do diário).
 * @returns {Array<{turma: object, componente: string, aulasSemana: number}>}
 */
export function turmasDoProfessor(professorId, { alocacoes, turmas, matriz }) {
  return alocacoes.filter((a) => a.professorId === professorId).flatMap((a) => {
    const turma = turmas.find((t) => t.id === a.turmaId && t.situacao === 'Aprovada');
    return turma ? [{ turma, componente: a.componente, aulasSemana: aulasDoComponente(matriz, a.componente, turma.serie) }] : [];
  });
}

/**
 * Regra de habilitação: o professor só leciona componente compatível com o concurso e a formação,
 * e sem passar da carga horária semanal.
 * @returns {string|null} Motivo do bloqueio, ou null se a alocação é permitida.
 */
export function bloqueioAlocacao({ professor, componente, aulas, aulasJaAlocadas }) {
  if (!professor.habilitacao.includes(componente)) {
    return `${professor.nome} é habilitado(a) em ${professor.habilitacao.join(' e ')}. Pela regra de habilitação, só pode lecionar componentes compatíveis com o concurso (${professor.concurso}) e a formação (${professor.formacao}).`;
  }
  const total = professor.aulasEmOutrasTurmas + aulasJaAlocadas + aulas;
  if (total > professor.cargaHorariaSemanal) {
    return `${professor.nome} passaria de ${professor.cargaHorariaSemanal} aulas semanais (ficaria com ${total}).`;
  }
  return null;
}

/** Estudantes com matrícula confirmada que a secretaria colocou na turma. */
export const enturmadosNaTurma = (turmaId, { pedidos, enturmacao }) =>
  pedidos.filter((p) => p.situacao === 'Confirmada' && enturmacao[p.protocolo] === turmaId);

/**
 * Garante que todo estudante enturmado tenha linha no diário da turma (notas em branco, zero faltas).
 * @returns {boolean} True se acrescentou alguém (o diário precisa ser salvo).
 */
export function sincronizarDiario(dados, turmaId, ctx) {
  dados[turmaId] ||= [];
  let mudou = false;
  for (const p of enturmadosNaTurma(turmaId, ctx)) {
    const id = p.estudanteId || p.protocolo;
    if (!dados[turmaId].some((a) => a.id === id)) {
      dados[turmaId].push({ id, nome: p.estudante, n1: null, n2: null, faltas: 0 });
      mudou = true;
    }
  }
  return mudou;
}
