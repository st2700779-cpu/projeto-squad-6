// Dados do PROFIN já somados às declarações de gastos das escolas (aprovadas, em análise ou devolvidas).
// Escola recém-cadastrada ainda não tem repasse: ganha uma linha "sem repasse" por categoria, para os painéis não quebrarem.
import { carregar, conjunto } from './dados.js';
import { aplicarDeclaracoes } from './dominio/prestacao.js';

export function completarRepasses(repasses, escolas, categorias, prazoPadrao) {
  const extras = escolas.flatMap((e) => categorias
    .filter((c) => !repasses.some((r) => r.escolaId === e.id && r.categoria === c))
    .map((c) => ({ escolaId: e.id, categoria: c, recebido: 0, executado: 0, prestacao: { prazo: prazoPadrao, entregue: false } })));
  return [...repasses, ...extras];
}

/** @returns {Promise<{categorias: string[], descricoes: object, repasses: object[], repassesBase: object[], declaracoes: object[]}>} */
export async function profinComDeclaracoes() {
  const [dados, declaracoes, escolas, letivo] = await Promise.all([carregar('profin'), conjunto('declaracoes-gastos'), carregar('escolas'), carregar('letivo')]);
  const base = completarRepasses(dados.repasses, escolas, dados.categorias, `${letivo.dataReferencia.slice(0, 4)}-12-15`);
  return { ...dados, repassesBase: base, repasses: aplicarDeclaracoes(base, declaracoes), declaracoes };
}
