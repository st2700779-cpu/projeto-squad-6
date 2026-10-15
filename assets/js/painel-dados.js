// Carrega e junta os dados que os painéis do aluno e do responsável usam (desempenho, horário, agenda, quiz).
import { isoDoAviso } from './dominio/avisos.js';
import { carregar, conjunto, diarioParaLeitura, letivo, dataDeReferencia, turmasDaRede } from './dados.js';
import { obter, definir } from './estado.js';
import { dataBR } from './ui.js';
import { desempenhoDaTurma, mediaGeral, SERIES, desempenho, margemDeFaltas, semaforoFrequencia, horarioDaTurma, montarAgenda, diaDaSemana, aulasDoDia, notaNecessaria } from './regras.js';

const feitos = (id) => (obter('agenda-feitos', {})[id] || []);
/** Marca ou desmarca um item da agenda como feito (só no navegador). */
export function marcarFeito(estudanteId, itemId, feito) {
  const todos = obter('agenda-feitos', {});
  const lista = new Set(todos[estudanteId] || []);
  if (feito) lista.add(itemId); else lista.delete(itemId);
  definir('agenda-feitos', { ...todos, [estudanteId]: [...lista] });
}
/** Tentativas de quiz do estudante, da mais recente para a mais antiga. */
export const tentativasDoQuiz = (estudanteId) => (obter('quiz-historico', {})[estudanteId] || []);
export function registrarTentativa(estudanteId, tentativa) {
  const todos = obter('quiz-historico', {});
  definir('quiz-historico', { ...todos, [estudanteId]: [tentativa, ...(todos[estudanteId] || [])].slice(0, 30) });
}

/**
 * Tudo o que o painel de um estudante precisa de uma vez.
 * @returns {Promise<{d: object, lv: object, hoje: string, margem: object, semFreq: object, grade: object|null, aulasHoje: Array, agenda: {aFazer: Array, feitos: Array}}>}
 */
export async function painelDoEstudante(est) {
  const [dia, lv, horarios, agenda, hoje] = await Promise.all([diarioParaLeitura(), letivo(), conjunto('horarios'), carregar('agenda'), dataDeReferencia()]);
  const d = desempenho(est, dia, lv.aulasDadas);
  const grade = horarioDaTurma(horarios, est);
  return {
    d, lv, hoje, grade,
    margem: margemDeFaltas(d.faltas, lv.aulasDadas),
    semFreq: semaforoFrequencia(d.presenca),
    aulasHoje: aulasDoDia(grade, diaDaSemana(hoje)),
    agenda: montarAgenda({ serie: est.serie, agenda, hoje, feitos: feitos(est.id) })
  };
}
export { notaNecessaria };


/**
 * Avisos que um perfil vê: os da escola (data/avisos.json, com `para`) e os comunicados enviados por professores e direção.
 * Comunicado: publico 'turma' (alunos e responsáveis), 'responsaveis' (só responsáveis da turma) ou 'escola' (toda a escola).
 * @returns {Promise<Array<{titulo: string, texto: string, data: string, origem: string, reuniao: boolean}>>} Mais recentes primeiro; `data` em dd/mm/aaaa.
 */
export async function avisosVisiveis({ perfil, est }) {
  const [avisos, comunicados] = await Promise.all([carregar('avisos'), conjunto('comunicados')]);
  const publicos = perfil === 'responsavel' ? ['todos', 'responsaveis'] : perfil === 'professor' ? ['todos', 'professores'] : ['todos'];
  const base = avisos.filter((a) => !a.para || publicos.includes(a.para)).map((a) => ({ titulo: a.titulo, texto: a.texto, iso: isoDoAviso(a), origem: 'Escola', reuniao: /^reuni[ãa]o/i.test(a.titulo) }));
  const doEstudante = (c) => c.escolaId === est?.escolaId && (c.publico === 'escola' || (c.turma === est?.turma && (c.publico === 'turma' || (c.publico === 'responsaveis' && perfil === 'responsavel'))));
  const enviados = comunicados.filter(doEstudante).map((c) => ({ titulo: c.assunto, texto: c.texto, iso: c.data, origem: c.de, reuniao: false }));
  return [...enviados, ...base].sort((a, b) => b.iso.localeCompare(a.iso)).map((a) => ({ ...a, data: dataBR(a.iso) }));
}

/**
 * Desempenho de cada turma aprovada da escola (do diário quando existe; senão, dos dados-base) e os totais da escola.
 * @returns {Promise<{lista: Array<{turma: object, alunos: number, frequencia: number|null, abaixo75: number, emRisco: number, componentes: object, media: number|null, doDiario: boolean}>, totais: {alunos: number, frequencia: number|null, abaixo75: number, emRisco: number}, lv: object, hoje: string}>}
 */
export async function desempenhoDaEscola(escolaId) {
  const [turmas, dia, sementes, lv] = await Promise.all([turmasDaRede(), diarioParaLeitura({ soAtivos: true }), carregar('desempenho'), letivo()]);
  const lista = turmas
    .filter((t) => t.escolaId === escolaId && t.situacao === 'Aprovada' && (dia[t.id]?.length || sementes[t.id]))
    .map((t) => { const d = desempenhoDaTurma(t, dia[t.id], sementes[t.id], lv.aulasDadas); return { turma: t, ...d, media: mediaGeral(d.componentes) }; })
    .sort((a, b) => SERIES.indexOf(a.turma.serie) - SERIES.indexOf(b.turma.serie) || a.turma.nome.localeCompare(b.turma.nome, 'pt-BR'));
  const alunos = lista.reduce((n, x) => n + x.alunos, 0);
  const comFreq = lista.filter((x) => x.frequencia !== null);
  const pesoFreq = comFreq.reduce((n, x) => n + x.alunos, 0);
  return {
    lista, lv, hoje: lv.dataReferencia,
    totais: {
      alunos,
      frequencia: pesoFreq ? Math.round((comFreq.reduce((n, x) => n + x.frequencia * x.alunos, 0) / pesoFreq) * 10) / 10 : null,
      abaixo75: lista.reduce((n, x) => n + x.abaixo75, 0),
      emRisco: lista.reduce((n, x) => n + x.emRisco, 0)
    }
  };
}
