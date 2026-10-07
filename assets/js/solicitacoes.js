// Solicitações à secretaria (declaração, histórico, atestado, correção de cadastro): quem pede e a fila da secretaria usam o mesmo conjunto.
import { conjunto, salvar, registrarAcao, dataDeReferencia } from './dados.js';

export const TIPOS_DE_SOLICITACAO = ['Declaração de matrícula', 'Declaração de frequência', 'Histórico escolar', 'Atestado de escolaridade', 'Correção de dado cadastral'];
export const ETAPAS = ['Pendente', 'Em andamento', 'Pronta', 'Entregue'];
const PRAZO_EM_DIAS = 5;

const somarDias = (iso, n) => { const d = new Date(`${iso}T12:00:00`); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
export const proximaEtapa = (situacao) => ETAPAS[ETAPAS.indexOf(situacao) + 1] || null;

/** Pedidos de um estudante, do mais novo para o mais antigo. */
export const solicitacoesDoEstudante = async (estudanteId) => (await conjunto('solicitacoes')).filter((s) => s.estudanteId === estudanteId).sort((a, b) => b.id.localeCompare(a.id));

/**
 * Registra um pedido na fila da secretaria da escola do estudante.
 * @returns {Promise<object>} O pedido criado.
 */
export async function criarSolicitacao({ tipo, estudante, solicitante, observacao = '' }) {
  const lista = await conjunto('solicitacoes');
  const hoje = await dataDeReferencia();
  const n = Math.max(0, ...lista.map((s) => Number(s.id.slice(-4)))) + 1;
  const pedido = { id: `SOL-2026-${String(n).padStart(4, '0')}`, tipo, estudanteId: estudante.id, estudante: estudante.nome, solicitante, escolaId: estudante.escolaId, criadaEm: hoje, prazo: somarDias(hoje, PRAZO_EM_DIAS), situacao: 'Pendente', ...(observacao ? { observacao } : {}) };
  lista.unshift(pedido);
  await salvar('solicitacoes', lista);
  await registrarAcao(solicitante, `Pediu ${tipo.toLowerCase()}`, pedido.id);
  return pedido;
}
