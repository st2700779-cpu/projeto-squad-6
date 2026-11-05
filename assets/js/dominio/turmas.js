// Domínio: turmas, alocação de professores e diário. A turma da escola (turmas.json) é a única
// referência de turma: "Minhas turmas" do professor nasce da alocação feita pela escola, e o diário
// recebe os estudantes que a secretaria enturma.
import { colunaDaMatriz } from './matricula.js';
import { nivelDaSerie } from './niveis.js';

/** Ano letivo em curso (exibição). */
export const ANO_LETIVO = 2026;

/**
 * Código da turma para identificação em telas e listas: ano, série, letra e turno.
 * Ex.: "1ª série A", Ensino Médio, manhã → "2026-1EM-A-M".
 * @param {{nome: string, serie: string, turno: string}} turma
 */
export function codigoDaTurma(turma) {
  const nivel = nivelDaSerie(turma.serie);
  // Fundamental e Médio: número da série + EF ou EM; demais níveis (EJA, técnico...): sigla do nível + posição da série.
  const serie = nivel && !['n-ai', 'n-af', 'n-em'].includes(nivel.id)
    ? `${nivel.id.replace(/^n-?/, '').toUpperCase()}${nivel.series.indexOf(turma.serie) + 1}`
    : `${/\d/.exec(turma.serie)?.[0] ?? ''}${/ EM$/.test(turma.serie) ? 'EM' : 'EF'}`;
  const partes = turma.nome.trim().split(/\s+/);
  const letra = (partes.filter((p) => /^[A-Za-z]$/.test(p)).pop() || partes.pop()).toUpperCase(); // "6º ano A — integral" → A
  return `${ANO_LETIVO}-${serie}-${letra}-${(turma.turno || '?')[0].toUpperCase()}`;
}

/**
 * Matriz da série: [{ componente, aulas }] com as aulas por semana de cada componente.
 * Ensino Médio: a versão da matriz do ano em que a turma entrou (a 3ª série de 2026 segue a versão 2023; 1ª e 2ª, a 2025).
 * Anos Finais: a matriz do Fundamental (data/matrizes.json, campo "fundamental"). Outras séries: lista vazia.
 * @param {{versoes: Array<{componentes: Array}>, fundamental?: {series: string[], componentes: Array}}} matrizes conteúdo de data/matrizes.json
 */
export function matrizDaSerie(matrizes, serie) {
  const col = colunaDaMatriz(serie);
  if (col) {
    const versao = col === 3 && matrizes.versoes[1] ? matrizes.versoes[1] : matrizes.versoes[0];
    return versao.componentes.map((c) => ({ componente: c[0], aulas: c[col] || 0 })).filter((c) => c.aulas > 0);
  }
  const f = matrizes.fundamental;
  const i = f?.series.indexOf(serie) ?? -1;
  return i < 0 ? [] : f.componentes.map((c) => ({ componente: c[0], aulas: c[i + 1] || 0 })).filter((c) => c.aulas > 0);
}
/**
 * Aulas por semana de um componente na série. 0 se não constar.
 * `matriz` pode ser o conteúdo inteiro de data/matrizes.json (vale para o Médio e os Anos Finais, ver matrizDaSerie)
 * ou só a lista de componentes de uma versão do Médio ([nome, 1ª, 2ª, 3ª]).
 */
export const aulasDoComponente = (matriz, componente, serie) => (Array.isArray(matriz)
  ? matriz.find((c) => c[0] === componente)?.[colunaDaMatriz(serie)] || 0
  : matrizDaSerie(matriz, serie).find((c) => c.componente === componente)?.aulas || 0);

/**
 * Aulas semanais que o professor já tem alocadas nas turmas da escola.
 * @param {string} professorId
 * @param {{alocacoes: Array, turmas: Array, matriz: Array|object}} ctx matriz: data/matrizes.json inteiro (ou uma lista de componentes do Médio)
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
