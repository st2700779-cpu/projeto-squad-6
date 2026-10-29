// Domínio: horário de aulas. A grade vem de data/horarios.json: uma entrada por turma, com as aulas de cada dia da semana.
// Os horários de cada aula dependem do turno (PERIODOS); a grade só guarda a matéria e o professor.

export const DIAS = ['seg', 'ter', 'qua', 'qui', 'sex'];
export const NOME_DO_DIA = { seg: 'Segunda-feira', ter: 'Terça-feira', qua: 'Quarta-feira', qui: 'Quinta-feira', sex: 'Sexta-feira', sab: 'Sábado', dom: 'Domingo' };
export const DIA_CURTO = { seg: 'Seg', ter: 'Ter', qua: 'Qua', qui: 'Qui', sex: 'Sex' };

/** Início de cada aula (50 min), com intervalo depois da segunda aula. */
export const PERIODOS = {
  'Manhã': ['07:30', '08:20', '09:30', '10:20', '11:10'],
  'Tarde': ['13:30', '14:20', '15:30', '16:20', '17:10'],
  'Noite': ['18:30', '19:20', '20:20', '21:10', '22:00']
};
const somar = (hora, minutos) => { const [h, m] = hora.split(':').map(Number); const t = h * 60 + m + minutos; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`; };
/** { inicio: '07:30', fim: '08:20' } da aula `i` (0 a 4) do turno. */
export const horaDaAula = (turno, i) => { const inicio = (PERIODOS[turno] || PERIODOS['Manhã'])[i]; return { inicio, fim: somar(inicio, 50) }; };

/** Dia da semana ('seg'…'dom') de uma data ISO. */
export const diaDaSemana = (iso) => ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab'][new Date(`${iso}T12:00:00`).getDay()];

/** Grade da turma do estudante (por escola e nome da turma). */
export const horarioDaTurma = (horarios, { escolaId, turma }) => horarios.find((h) => h.escolaId === escolaId && h.turma === turma) || null;

/** Aulas de um dia, já com o horário: [{inicio, fim, componente, professorId}]. */
export const aulasDoDia = (grade, dia) => (grade?.aulas?.[dia] || []).map((a, i) => ({ ...horaDaAula(grade.turno, i), ...a, indice: i }));

/** Todas as aulas da semana de um professor, em ordem de dia e hora: [{dia, turma, turmaId, turno, sala, ...aula}]. */
export function aulasDoProfessor(horarios, professorId) {
  const lista = [];
  for (const g of horarios) for (const dia of DIAS) aulasDoDia(g, dia).forEach((a) => { if (a.professorId === professorId) lista.push({ ...a, dia, turma: g.turma, turmaId: g.turmaId, turno: g.turno, sala: g.sala }); });
  return lista.sort((x, y) => DIAS.indexOf(x.dia) - DIAS.indexOf(y.dia) || x.inicio.localeCompare(y.inicio));
}

/** Próximo dia com aula a partir de uma data (hoje incluído). Devolve { dia, data } ou null (sem aulas na grade). */
export function proximoDiaDeAula(grade, iso) {
  const d = new Date(`${iso}T12:00:00`);
  for (let i = 0; i < 8; i++) {
    const dia = diaDaSemana(d.toISOString().slice(0, 10));
    if (DIAS.includes(dia) && (grade?.aulas?.[dia] || []).length) return { dia, data: d.toISOString().slice(0, 10), adiante: i };
    d.setDate(d.getDate() + 1);
  }
  return null;
}

/**
 * Conflitos ao trocar uma aula: o professor já está em outra turma do mesmo turno, dia e horário.
 * @returns {string[]} Mensagens (vazio se não há conflito).
 */
export function conflitosDeHorario(horarios, { turmaId, dia, indice, professorId }) {
  if (!professorId) return [];
  const g = horarios.find((x) => x.turmaId === turmaId);
  return horarios
    .filter((h) => h.turmaId !== turmaId && h.turno === g.turno && h.aulas[dia]?.[indice]?.professorId === professorId)
    .map((h) => `O professor já tem aula na ${h.turma} neste mesmo horário.`);
}
