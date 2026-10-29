// Movimentação de matrícula (transferência e cancelamento): lê e grava tudo o que a mudança toca de uma vez:
// a movimentação, o pedido na escola de destino e o número de matriculados da turma. As vagas não são gravadas: são
// recalculadas a partir das turmas e dos pedidos (a turma de origem perde um aluno e o pedido no destino segura a vaga).
import { carregar, conjunto, salvar, registrarAcao, novoProtocolo, matriculas, turmasEscola, diario, turmasDaRede, dataDeReferencia } from './dados.js';
import { dataBR } from './ui.js';
import { montarMovimentacao, pedidoDeTransferencia, podeDesfazer } from './dominio/movimentacao.js';

/** Estudantes da escola: cadastros completos e quem só aparece no diário das turmas. */
export async function estudantesDaEscola(escolaId) {
  const [estudantes, dia, turmas] = await Promise.all([carregar('estudantes'), diario(), turmasDaRede()]);
  const completos = estudantes.filter((e) => e.escolaId === escolaId).map((e) => ({ id: e.id, nome: e.nome, serie: e.serie, turma: e.turma, turmaId: e.turmaId ?? null, responsavel: e.responsavel, completo: true }));
  const ids = new Set(completos.map((e) => e.id));
  const doDiario = turmas.filter((t) => t.escolaId === escolaId).flatMap((t) => (dia[t.id] || []).filter((a) => !ids.has(a.id)).map((a) => ({ id: a.id, nome: a.nome, serie: t.serie, turma: t.nome, turmaId: t.id, responsavel: '', completo: false })));
  return [...completos, ...doDiario].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}
async function proximoId(movs) {
  return `MOV-2026-${String(1 + Math.max(0, ...movs.map((m) => Number(/(\d+)$/.exec(m.id)?.[1] || 0)))).padStart(4, '0')}`;
}
/** A turma perde (ou recupera) um matriculado, quando ela é gerenciada por esta escola. */
async function ajustarTurma(turmaId, delta) {
  if (!turmaId) return;
  const turmas = await turmasEscola();
  const t = turmas.find((x) => x.id === turmaId);
  if (t) { t.matriculados = Math.max(0, (t.matriculados || 0) + delta); await salvar('turmas', turmas); }
}

export async function movimentar(tipo, f, { estudante, escolaOrigemId, por }) {
  const [movs, escolas, hoje] = await Promise.all([conjunto('movimentacoes'), carregar('escolas'), dataDeReferencia()]);
  const id = await proximoId(movs);
  const protocoloDestino = tipo === 'Transferência' ? await novoProtocolo('MAT') : null;
  const mov = montarMovimentacao(tipo, f, { id, estudante, escolaOrigemId, escolas, protocoloDestino, hoje, por });
  await salvar('movimentacoes', [mov, ...movs]); // primeiro a movimentação: se algo falhar depois, ela pode ser desfeita
  if (tipo === 'Transferência') {
    const pedidos = await matriculas();
    await salvar('matriculas', [pedidoDeTransferencia(mov, { estudante, protocolo: protocoloDestino, dataBR: dataBR(hoje) }), ...pedidos]);
  }
  await ajustarTurma(mov.turmaId, -1);
  await registrarAcao(por, tipo === 'Transferência' ? `Transferiu para ${mov.destinoNome}` : 'Cancelou a matrícula', `${mov.estudante} · ${mov.id}`);
  return mov;
}

export async function desfazer(movId, { por }) {
  const [movs, pedidos, hoje] = await Promise.all([conjunto('movimentacoes'), matriculas(), dataDeReferencia()]);
  const mov = movs.find((m) => m.id === movId);
  if (!mov) throw new Error('NAO_ENCONTRADA');
  const pedido = mov.protocoloDestino ? pedidos.find((p) => p.protocolo === mov.protocoloDestino) : null;
  const pode = podeDesfazer(mov, pedido);
  if (!pode.ok) throw Object.assign(new Error('BLOQUEADO'), { motivo: pode.motivo });
  await salvar('movimentacoes', movs.map((m) => (m === mov ? { ...m, desfeitaEm: hoje, desfeitaPor: por } : m)));
  if (pedido?.situacao === 'Aguardando confirmação') { Object.assign(pedido, { situacao: 'Recusada', motivo: 'Transferência cancelada pela escola de origem.' }); await salvar('matriculas', pedidos); }
  await ajustarTurma(mov.turmaId, 1);
  await registrarAcao(por, mov.tipo === 'Transferência' ? 'Desfez a transferência' : 'Reativou a matrícula', `${mov.estudante} · ${mov.id}`);
}
