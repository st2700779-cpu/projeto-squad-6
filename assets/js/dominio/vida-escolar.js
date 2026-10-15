// Regras do dia a dia da escola: registro de aula (professor) e justificativa de falta (responsável → secretaria).
// Funções puras: recebem a data de hoje por parâmetro, para testar sem depender do relógio.
import { diasEntreDatas } from './hoje.js';

export const AULAS_POR_DIA_MAX = 6;
export const CONTEUDO_MIN = 10;
export const PRAZO_PARA_JUSTIFICAR_DIAS = 30;
export const AFASTAMENTO_MAX_DIAS = 15;
export const MOTIVOS_DE_FALTA = [
  ['saude', 'Saúde: doença ou consulta (atestado ou declaração)'],
  ['luto', 'Falecimento de familiar'],
  ['transporte', 'Transporte ou clima (chuva forte, greve)'],
  ['judicial', 'Convocação judicial ou serviço obrigatório'],
  ['religioso', 'Motivo religioso'],
  ['outro', 'Outro motivo (explique abaixo)']
];
export const nomeDoMotivo = (chave) => MOTIVOS_DE_FALTA.find(([k]) => k === chave)?.[1] ?? chave;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (v) => ISO.test(v || '') && !Number.isNaN(Date.parse(v + 'T00:00:00Z')) && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

// ───── Registro de aula ─────

/**
 * @param {{turma?: string, data?: string, aulas?: string|number, conteudo?: string, tarefa?: string}} f turma no formato "turmaId|componente"
 * @param {{hoje: string, minhasTurmas: string[], existentes: Array<{id: string, turmaId: string, componente: string, data: string}>, editandoId?: string}} ctx
 */
export function validarRegistroDeAula(f, { hoje, minhasTurmas, existentes, editandoId = '' }) {
  const e = {};
  const [turmaId, componente] = String(f.turma || '').split('|');
  if (!turmaId || !minhasTurmas.includes(turmaId)) e.turma = 'Escolha uma das suas turmas.';
  if (!dataValida(f.data)) e.data = 'Informe a data da aula.';
  else if (f.data > hoje) e.data = 'A data da aula não pode ser no futuro.';
  else if (diasEntreDatas(f.data, hoje) > 180) e.data = 'Confira a data: a aula é de mais de 6 meses atrás.';
  const n = Number(f.aulas);
  if (!Number.isInteger(n) || n < 1 || n > AULAS_POR_DIA_MAX) e.aulas = `Informe de 1 a ${AULAS_POR_DIA_MAX} aulas.`;
  const conteudo = String(f.conteudo ?? '').trim();
  if (conteudo.length < CONTEUDO_MIN) e.conteudo = `Descreva o conteúdo trabalhado (pelo menos ${CONTEUDO_MIN} letras).`;
  else if (conteudo.length > 600) e.conteudo = 'Resuma o conteúdo em até 600 letras.';
  if (String(f.tarefa ?? '').trim().length > 300) e.tarefa = 'A tarefa de casa pode ter até 300 letras.';
  if (!e.turma && !e.data && existentes.some((r) => r.id !== editandoId && r.turmaId === turmaId && r.componente === componente && r.data === f.data)) {
    e.data = 'Já existe registro desta turma e deste componente nesta data. Use "Editar" na lista.';
  }
  return { ok: !Object.keys(e).length, erros: e };
}

export function montarRegistroDeAula(f, { id, professorId, turmaNome, hoje, agora }) {
  const [turmaId, componente] = String(f.turma).split('|');
  return {
    id, professorId, turmaId, turma: turmaNome, componente, data: f.data, aulas: Number(f.aulas),
    conteudo: String(f.conteudo).trim(), tarefa: String(f.tarefa ?? '').trim(), registradoEm: agora || hoje
  };
}

/** Datas em que houve chamada na turma mas o professor ainda não registrou a aula (mais recentes primeiro). */
export function datasSemRegistro(chamadas, registros, turmaId, componente, limite = 10) {
  const feitas = new Set(registros.filter((r) => r.turmaId === turmaId && r.componente === componente).map((r) => r.data));
  return Object.keys(chamadas?.[turmaId] || {}).filter((d) => !feitas.has(d)).sort().reverse().slice(0, limite);
}

// ───── Justificativa de falta ─────

/** Quantidade de dias do calendário no período (inclui os dois extremos). */
export const diasDoPeriodo = (de, ate) => diasEntreDatas(de, ate || de) + 1;

/**
 * @param {{estudanteId?: string, de?: string, ate?: string, motivo?: string, descricao?: string}} f
 * @param {{hoje: string, estudantesDoResponsavel: string[], existentes: Array<{estudanteId: string, de: string, ate: string, situacao: string}>, anexo?: {nome: string, tamanho: number}|null}} ctx
 */
export function validarJustificativa(f, { hoje, estudantesDoResponsavel, existentes, anexo = null }) {
  const e = {};
  if (!f.estudanteId || !estudantesDoResponsavel.includes(f.estudanteId)) e.estudanteId = 'Escolha o estudante.';
  const ate = f.ate || f.de;
  if (!dataValida(f.de)) e.de = 'Informe a data da falta.';
  else if (f.de > hoje) e.de = 'A data da falta não pode ser no futuro.';
  else if (diasEntreDatas(f.de, hoje) > PRAZO_PARA_JUSTIFICAR_DIAS) e.de = `O prazo para justificar é de ${PRAZO_PARA_JUSTIFICAR_DIAS} dias. Procure a secretaria da escola.`;
  if (f.ate) {
    if (!dataValida(f.ate)) e.ate = 'Data final inválida.';
    else if (!e.de && f.ate < f.de) e.ate = 'A data final não pode ser antes da inicial.';
    else if (f.ate > hoje) e.ate = 'A data final não pode ser no futuro.';
    else if (!e.de && diasDoPeriodo(f.de, f.ate) > AFASTAMENTO_MAX_DIAS) e.ate = `O período pode ter até ${AFASTAMENTO_MAX_DIAS} dias. Para mais, procure a secretaria.`;
  }
  if (!MOTIVOS_DE_FALTA.some(([k]) => k === f.motivo)) e.motivo = 'Escolha o motivo.';
  const desc = String(f.descricao ?? '').trim();
  if (f.motivo === 'outro' && desc.length < 10) e.descricao = 'Explique o motivo (pelo menos 10 letras).';
  else if (desc.length > 500) e.descricao = 'Resuma em até 500 letras.';
  if (f.motivo === 'saude' && diasDoPeriodo(f.de, ate) > 3 && !anexo && dataValida(f.de) && !e.ate) e.anexo = 'Afastamentos de saúde com mais de 3 dias precisam de atestado ou declaração anexada.';
  if (!e.estudanteId && !e.de && !e.ate && existentes.some((j) => j.estudanteId === f.estudanteId && j.situacao !== 'Recusada' && !(ate < j.de || f.de > j.ate))) {
    e.de = 'Já existe uma justificativa para este estudante que cobre estas datas.';
  }
  return { ok: !Object.keys(e).length, erros: e };
}

export function montarJustificativa(f, { protocolo, estudante, hoje, anexo = null, agora }) {
  return {
    protocolo, estudanteId: estudante.id, estudante: estudante.nome, turma: estudante.turma, turmaId: estudante.turmaId, escolaId: estudante.escolaId,
    responsavel: estudante.responsavel, de: f.de, ate: f.ate || f.de, motivo: f.motivo, descricao: String(f.descricao ?? '').trim(),
    anexo: anexo ? { nome: anexo.nome, tamanho: anexo.tamanho } : null, enviadaEm: agora || hoje, situacao: 'Aguardando análise', parecer: '', decididaEm: null, decididaPor: null
  };
}

/** Decisão da secretaria. Recusar exige um motivo que a família consiga ler; só se decide o que está aguardando. */
export function validarDecisao(j, { decisao, parecer }) {
  const e = {};
  if (j.situacao !== 'Aguardando análise') e.geral = 'Esta justificativa já foi decidida.';
  if (!['Aceita', 'Recusada'].includes(decisao)) e.geral = 'Escolha aceitar ou recusar.';
  if (decisao === 'Recusada' && String(parecer ?? '').trim().length < 5) e.parecer = 'Explique à família por que a justificativa foi recusada (pelo menos 5 letras).';
  return { ok: !Object.keys(e).length, erros: e };
}
export function aplicarDecisao(j, { decisao, parecer, por, hoje }) {
  return { ...j, situacao: decisao, parecer: String(parecer ?? '').trim(), decididaEm: hoje, decididaPor: por };
}

/** Pendentes primeiro (mais antigas na frente), depois as decididas (mais recentes na frente). */
export function ordenarJustificativas(lista) {
  const pend = lista.filter((j) => j.situacao === 'Aguardando análise').sort((a, b) => a.enviadaEm.localeCompare(b.enviadaEm));
  const fim = lista.filter((j) => j.situacao !== 'Aguardando análise').sort((a, b) => String(b.decididaEm).localeCompare(String(a.decididaEm)));
  return [...pend, ...fim];
}
