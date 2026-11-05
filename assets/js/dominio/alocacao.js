// Domínio: professor × disciplina × turma, e a grade de horário. Uma regra só para a alocação (Secretaria › Alocação) e
// para o horário (Coordenação › Horários): o professor de uma disciplina numa turma é um só. Quem troca o professor numa
// tela troca também na outra (alocação e todas as aulas daquela disciplina na grade da turma).
// Funções puras, sem tela, testadas em tools/testar-cadastros.mjs.
import { DIAS, NOME_DO_DIA, horaDaAula, aulasPorDia, conflitosDeHorario } from './horario.js';

/** Áreas do conhecimento (BNCC), para separar professores e disciplinas: professores de Matemática, de Linguagens... */
export const AREAS = [
  { area: 'Linguagens', componentes: ['Língua Portuguesa', 'Inglês', 'Arte', 'Educação Física'] },
  { area: 'Matemática', componentes: ['Matemática'] },
  { area: 'Ciências da Natureza', componentes: ['Ciências', 'Física', 'Química', 'Biologia'] },
  { area: 'Ciências Humanas', componentes: ['História', 'Geografia', 'Filosofia', 'Sociologia'] }
];
export const OUTRAS = 'Outras disciplinas';
/** Aula da grade que não é de componente da matriz (sobra de horário, sobretudo no integral). */
export const ESTUDO_ORIENTADO = 'Estudo orientado';
export const areaDoComponente = (c) => AREAS.find((a) => a.componentes.includes(c))?.area || OUTRAS;
export const nomesDasAreas = () => [...AREAS.map((a) => a.area), OUTRAS];
/** Componentes agrupados por área, na ordem das áreas: [{ area, componentes[] }] (só as áreas com componente). */
export const agruparPorArea = (componentes) => nomesDasAreas().map((area) => ({ area, componentes: componentes.filter((c) => areaDoComponente(c) === area) })).filter((g) => g.componentes.length);

/** Professor da disciplina na turma (pela alocação), ou null. */
export const professorDaDisciplina = (alocacoes, turmaId, componente) => alocacoes.find((a) => a.turmaId === turmaId && a.componente === componente)?.professorId ?? null;

/**
 * Troca (ou tira, com professorId null) o professor da disciplina na turma: na alocação e em todas as aulas dessa disciplina
 * na grade da turma. Devolve listas novas; as originais não mudam.
 */
export function aplicarAlocacao({ alocacoes, horarios = [], turmaId, componente, professorId }) {
  const outras = alocacoes.filter((a) => !(a.turmaId === turmaId && a.componente === componente));
  const novas = professorId ? [...outras, { turmaId, componente, professorId }] : outras;
  const grades = horarios.map((h) => (h.turmaId !== turmaId ? h : {
    ...h, aulas: Object.fromEntries(Object.entries(h.aulas).map(([dia, aulas]) => [dia, aulas.map((a) => (a.componente === componente ? { ...a, professorId: professorId || null } : a))]))
  }));
  return { alocacoes: novas, horarios: grades };
}

/** Aulas da disciplina na grade da turma: [{ dia, indice, inicio }]. */
export function aulasDaDisciplinaNaGrade(grade, componente) {
  if (!grade) return [];
  return DIAS.flatMap((dia) => (grade.aulas[dia] || []).map((a, i) => ({ a, i })).filter(({ a }) => a.componente === componente).map(({ i }) => ({ dia, indice: i, inicio: horaDaAula(grade.turno, i).inicio })));
}
/**
 * O professor pode dar todas as aulas da disciplina na turma sem bater com outra turma? (compara dia e hora com as outras grades)
 * @returns {string[]} uma mensagem por aula com conflito ("Segunda-feira às 07:30: já tem aula na 2ª série A.")
 */
export function conflitosDaAlocacao(horarios, { turmaId, componente, professorId }) {
  if (!professorId) return [];
  const grade = horarios.find((h) => h.turmaId === turmaId);
  return aulasDaDisciplinaNaGrade(grade, componente).flatMap(({ dia, indice, inicio }) => {
    const c = conflitosDeHorario(horarios, { turmaId, dia, indice, professorId });
    return c.length ? [`${NOME_DO_DIA[dia]} às ${inicio}: ${c[0].replace('O professor já tem', 'já tem').replace(' neste mesmo horário', '')}`] : [];
  });
}

/**
 * Grade nova da turma, montada a partir da matriz: as aulas de cada disciplina espalhadas pelos dias da semana, com o professor
 * da alocação. Se a matriz tem menos aulas que a grade (no integral, por exemplo), as que sobram ficam como Estudo orientado.
 * @param {{id: string, nome: string, turno: string, sala?: string, escolaId: string}} turma
 * @param {Array<{componente: string, aulas: number}>} matriz matriz da série (ver matrizDaSerie)
 */
export function montarGrade(turma, matriz, alocacoes = []) {
  const n = aulasPorDia(turma.turno);
  const dias = Object.fromEntries(DIAS.map((d) => [d, []]));
  const ordem = [...matriz].sort((a, b) => b.aulas - a.aulas || a.componente.localeCompare(b.componente, 'pt-BR'));
  let inicio = 0;
  for (const { componente, aulas } of ordem) {
    for (let k = 0; k < aulas; k += 1) {
      // Começa num dia diferente para cada disciplina e procura o próximo dia com espaço: as aulas ficam espalhadas pela semana.
      const livre = [0, 1, 2, 3, 4].map((x) => DIAS[(inicio + k + x) % 5]).find((d) => dias[d].length < n);
      if (!livre) break;
      dias[livre].push({ componente, professorId: professorDaDisciplina(alocacoes, turma.id, componente) });
    }
    inicio += 1;
  }
  for (const d of DIAS) while (dias[d].length < n) dias[d].push({ componente: ESTUDO_ORIENTADO, professorId: null });
  return { id: `h-${turma.id}`, turmaId: turma.id, escolaId: turma.escolaId, turma: turma.nome, turno: turma.turno, sala: turma.sala || '', aulas: dias };
}

/** Quantas aulas de cada disciplina a grade tem: { [componente]: n }. */
export function contarAulas(grade) {
  const c = {};
  for (const d of DIAS) (grade?.aulas?.[d] || []).forEach((a) => { if (a.componente) c[a.componente] = (c[a.componente] || 0) + 1; });
  return c;
}
