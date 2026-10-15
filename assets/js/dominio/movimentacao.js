// Movimentação de matrícula iniciada pela escola: transferência para outra escola da rede e cancelamento.
// Transferência: o estudante sai da escola de origem na hora, libera a vaga e gera um pedido (tipo "Transferência") na escola de destino,
// que confirma ou recusa. Se o destino ainda não confirmou, a origem pode desfazer. Cancelamento: libera a vaga e pode ser desfeito.
import { motivoBloqueio } from './matricula.js';
import { diasEntreDatas } from './hoje.js';

export const MOTIVOS_DE_CANCELAMENTO = [
  ['desistencia', 'Desistência do estudante ou da família'],
  ['abandono', 'Abandono: sem frequência e sem contato'],
  ['mudanca', 'Mudança de cidade ou de estado'],
  ['outra-rede', 'Matrícula em outra rede (particular, municipal ou de outro estado)'],
  ['engano', 'Matrícula feita por engano'],
  ['obito', 'Óbito'],
  ['outro', 'Outro motivo (explique)']
];
export const nomeDoMotivoDeCancelamento = (chave) => MOTIVOS_DE_CANCELAMENTO.find(([k]) => k === chave)?.[1] ?? chave;
export const PRAZO_RETROATIVO_DIAS = 30;
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const dataValida = (v) => ISO.test(v || '') && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;

/** Situação do estudante na escola, pela movimentação mais recente que não foi desfeita. */
export function situacaoDoEstudante(estudanteId, movs) {
  const ultima = (movs || []).filter((m) => m.estudanteId === estudanteId && !m.desfeitaEm).sort((a, b) => String(a.criadaEm).localeCompare(String(b.criadaEm)) || a.id.localeCompare(b.id)).at(-1);
  if (!ultima) return { chave: 'ativo', texto: 'Ativo', mov: null };
  return ultima.tipo === 'Transferência'
    ? { chave: 'transferido', texto: `Transferido para ${ultima.destinoNome}`, mov: ultima }
    : { chave: 'cancelado', texto: 'Matrícula cancelada', mov: ultima };
}
/** Estudantes que não estão mais ativos (transferidos ou com matrícula cancelada). */
export const estudantesInativos = (movs) => new Set((movs || []).filter((m) => !m.desfeitaEm).map((m) => m.estudanteId).filter((id) => situacaoDoEstudante(id, movs).chave !== 'ativo'));

function validarData(f, hoje, e) {
  if (!dataValida(f.data)) e.data = 'Informe a data.';
  else if (f.data > hoje) e.data = 'A data não pode ser no futuro.';
  else if (diasEntreDatas(f.data, hoje) > PRAZO_RETROATIVO_DIAS) e.data = `A data não pode ter mais de ${PRAZO_RETROATIVO_DIAS} dias. Procure a equipe da SEED.`;
}
const estaAtivo = (estudante, situacao) => Boolean(estudante) && situacao?.chave === 'ativo';

/**
 * @param {{destinoId?: string, data?: string, motivo?: string}} f
 * @param {{estudante: {serie: string}|null, situacao: {chave: string}, escolaOrigemId: string, escolas: Array<{id: string}>, atos: object[], vagas: object, hoje: string}} ctx
 */
export function validarTransferencia(f, { estudante, situacao, escolaOrigemId, escolas, atos, vagas, hoje }) {
  const e = {};
  if (!estudante) e.estudanteId = 'Escolha o estudante.';
  else if (!estaAtivo(estudante, situacao)) e.estudanteId = 'Este estudante já foi transferido ou teve a matrícula cancelada.';
  if (!f.destinoId || !escolas.some((x) => x.id === f.destinoId)) e.destinoId = 'Escolha a escola de destino.';
  else if (f.destinoId === escolaOrigemId) e.destinoId = 'A escola de destino tem de ser outra.';
  else if (estudante) { const b = motivoBloqueio({ atos, vagas, escolaId: f.destinoId, serie: estudante.serie }); if (b) e.destinoId = `${b} Escolha outra escola ou espere abrir vaga.`; }
  validarData(f, hoje, e);
  const m = String(f.motivo ?? '').trim();
  if (m.length < 5) e.motivo = 'Explique o motivo da transferência (pelo menos 5 letras).'; else if (m.length > 300) e.motivo = 'Resuma o motivo em até 300 letras.';
  return { ok: !Object.keys(e).length, erros: e };
}
export function validarCancelamento(f, { estudante, situacao, hoje }) {
  const e = {};
  if (!estudante) e.estudanteId = 'Escolha o estudante.';
  else if (!estaAtivo(estudante, situacao)) e.estudanteId = 'Este estudante já foi transferido ou teve a matrícula cancelada.';
  if (!MOTIVOS_DE_CANCELAMENTO.some(([k]) => k === f.motivoChave)) e.motivoChave = 'Escolha o motivo do cancelamento.';
  const d = String(f.descricao ?? '').trim();
  if (f.motivoChave === 'outro' && d.length < 10) e.descricao = 'Explique o motivo (pelo menos 10 letras).'; else if (d.length > 300) e.descricao = 'Resuma em até 300 letras.';
  validarData(f, hoje, e);
  return { ok: !Object.keys(e).length, erros: e };
}

export function montarMovimentacao(tipo, f, { id, estudante, escolaOrigemId, escolas, protocoloDestino = null, hoje, por }) {
  const base = { id, tipo, estudanteId: estudante.id, estudante: estudante.nome, serie: estudante.serie, turma: estudante.turma, turmaId: estudante.turmaId ?? null, escolaOrigemId, data: f.data, criadaEm: hoje, por, desfeitaEm: null, desfeitaPor: null };
  if (tipo === 'Transferência') return { ...base, motivo: String(f.motivo).trim(), destinoId: f.destinoId, destinoNome: escolas.find((x) => x.id === f.destinoId).nome, protocoloDestino };
  return { ...base, motivoChave: f.motivoChave, motivo: nomeDoMotivoDeCancelamento(f.motivoChave), descricao: String(f.descricao ?? '').trim() };
}
/** Pedido que aparece na secretaria da escola de destino (mesma lista de matrículas que a família usa). */
export const pedidoDeTransferencia = (mov, { estudante, protocolo, dataBR }) => ({
  protocolo, estudante: mov.estudante, estudanteId: mov.estudanteId, responsavel: estudante.responsavel || 'Não informado', serie: mov.serie, tipo: 'Transferência', escolaId: mov.destinoId,
  situacao: 'Aguardando confirmação', data: dataBR, origem: 'rede', origemEscolaId: mov.escolaOrigemId, movimentacao: mov.id
});

/** A origem só desfaz a transferência enquanto o destino não confirmou. Cancelamento sempre pode ser desfeito. */
export function podeDesfazer(mov, pedidoDoDestino) {
  if (mov.desfeitaEm) return { ok: false, motivo: 'Esta movimentação já foi desfeita.' };
  if (mov.tipo === 'Transferência' && pedidoDoDestino?.situacao === 'Confirmada') return { ok: false, motivo: 'A escola de destino já confirmou a matrícula. Só ela pode reverter.' };
  return { ok: true, motivo: '' };
}
/**
 * Mudança nas vagas. Ao movimentar, a origem libera 1 vaga na série e (na transferência) o destino reserva 1.
 * Ao desfazer, volta o contrário; se o destino já tinha recusado, a vaga dele já foi devolvida e não se mexe de novo.
 * @returns {Array<{escolaId: string, serie: string, delta: number}>}
 */
export function ajusteDeVagas(mov, acao, situacaoDoPedido = null) {
  const origem = { escolaId: mov.escolaOrigemId, serie: mov.serie };
  if (acao === 'movimentar') return [{ ...origem, delta: 1 }, ...(mov.tipo === 'Transferência' ? [{ escolaId: mov.destinoId, serie: mov.serie, delta: -1 }] : [])];
  return [{ ...origem, delta: -1 }, ...(mov.tipo === 'Transferência' && situacaoDoPedido === 'Aguardando confirmação' ? [{ escolaId: mov.destinoId, serie: mov.serie, delta: 1 }] : [])];
}
/** Aplica os ajustes sem deixar a vaga negativa. */
export function aplicarAjusteDeVagas(vagas, ajustes) {
  const novo = JSON.parse(JSON.stringify(vagas || {}));
  for (const { escolaId, serie, delta } of ajustes) { if (novo[escolaId]?.[serie] !== undefined) novo[escolaId][serie] = Math.max(0, novo[escolaId][serie] + delta); }
  return novo;
}
