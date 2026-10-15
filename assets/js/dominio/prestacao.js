// Domínio: declaração dos gastos da escola e retorno da análise do PROFIN.
// Fluxo: a direção declara os gastos de uma categoria de recurso → PROFIN analisa (item a item) → retorno:
// aprovada, aprovada com ressalvas (itens glosados) ou devolvida para correção → a escola corrige e reenvia.
import { diasEntre } from './painel.js';
import { dataValida } from './cadastros.js';
import { saldo } from './profin.js';

export const SITUACOES = ['Rascunho', 'Enviada', 'Em análise', 'Aprovada', 'Aprovada com ressalvas', 'Devolvida'];
export const PENDENTES_DE_ANALISE = ['Enviada', 'Em análise'];
export const APROVADAS = ['Aprovada', 'Aprovada com ressalvas'];
export const TIPOS_DE_RETORNO = { aprovada: 'Aprovada', ressalvas: 'Aprovada com ressalvas', devolvida: 'Devolvida' };
export const TAMANHO_MAXIMO_COMPROVANTE = 5 * 1024 * 1024;
export const EXTENSOES = ['pdf', 'jpg', 'jpeg', 'png'];

export const NATUREZAS = {
  Custeio: ['Material de consumo', 'Serviço de terceiros', 'Pequenos reparos e manutenção', 'Água, energia e telefonia'],
  Capital: ['Equipamento e material permanente', 'Mobiliário', 'Obra ou reforma'],
  Merenda: ['Gêneros alimentícios', 'Utensílios de cozinha', 'Gás de cozinha'],
  'Emenda Parlamentar': ['Conforme o objeto da emenda', 'Material de consumo', 'Equipamento e material permanente', 'Serviço de terceiros']
};

const centavos = (v) => Math.round(Number(v) * 100);
export const totalDosLancamentos = (ls) => ls.reduce((t, l) => t + centavos(l.valor), 0) / 100;
export const valorGlosado = (d) => (d.retorno?.glosas || []).reduce((t, g) => t + centavos(d.lancamentos[g.indice]?.valor || 0), 0) / 100;
/** Valor que entra como gasto executado: o declarado menos o que foi glosado. */
export const valorAprovado = (d) => (APROVADAS.includes(d.situacao) ? Math.round((d.total - valorGlosado(d)) * 100) / 100 : 0);

const extensaoDe = (nome) => String(nome ?? '').split('.').pop().toLowerCase();
export function validarLancamento(l, { hoje }) {
  const e = {};
  const ano = hoje.slice(0, 4);
  if (!dataValida(l.data)) e.data = 'Informe a data do gasto.';
  else if (l.data > hoje) e.data = 'A data não pode ser depois de hoje.';
  else if (!l.data.startsWith(ano)) e.data = `Só entram gastos de ${ano}.`;
  if (String(l.descricao ?? '').trim().length < 5) e.descricao = 'Descreva o gasto, com pelo menos 5 letras.';
  if (String(l.fornecedor ?? '').trim().length < 3) e.fornecedor = 'Informe o fornecedor.';
  if (!String(l.documento ?? '').trim()) e.documento = 'Informe o número da nota fiscal ou recibo.';
  const v = Number(l.valor);
  if (!(v > 0) || Math.abs(v * 100 - Math.round(v * 100)) > 1e-6 || v > 10000000) e.valor = 'Informe um valor maior que zero, com até 2 casas.';
  if (!l.natureza) e.natureza = 'Escolha a natureza do gasto.';
  if (!l.comprovante?.nome) e.comprovante = 'Anexe o comprovante (PDF, JPG ou PNG).';
  else if (!EXTENSOES.includes(extensaoDe(l.comprovante.nome))) e.comprovante = 'O comprovante tem de ser PDF, JPG ou PNG.';
  else if (l.comprovante.tamanho > TAMANHO_MAXIMO_COMPROVANTE) e.comprovante = 'O comprovante passa de 5 MB.';
  return { ok: !Object.keys(e).length, erros: e };
}

/**
 * Valida a declaração inteira antes do envio.
 * @param {{categoria: string, competencia: string, lancamentos: object[]}} d
 * @param {{repasse: object, outras: object[], hoje: string, idAtual?: string}} ctx outras = declarações da mesma escola e categoria
 */
export function validarDeclaracao(d, { repasse, outras, hoje, idAtual }) {
  const geral = [];
  const porLinha = d.lancamentos.map((l) => validarLancamento(l, { hoje }).erros);
  if (!repasse || repasse.recebido <= 0) geral.push('Esta categoria não recebeu repasse neste ano: não há o que declarar.');
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(d.competencia || '')) geral.push('Escolha o mês de referência.');
  else if (d.competencia > hoje.slice(0, 7)) geral.push('O mês de referência não pode ser depois de hoje.');
  if (!d.lancamentos.length) geral.push('Inclua pelo menos um gasto.');
  const total = totalDosLancamentos(d.lancamentos);
  if (repasse && repasse.recebido > 0) {
    // O que já foi declarado e está em análise ou aprovado também consome o saldo.
    const consumido = outras.filter((o) => o.id !== idAtual && (PENDENTES_DE_ANALISE.includes(o.situacao) || APROVADAS.includes(o.situacao))).reduce((t, o) => t + (APROVADAS.includes(o.situacao) ? valorAprovado(o) : o.total), 0);
    const disponivel = Math.round((saldo(repasse) - consumido) * 100) / 100;
    if (total > disponivel + 0.001) geral.push(`O total declarado passa do saldo disponível da categoria (${disponivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}).`);
  }
  // Nota repetida: mesmo fornecedor e mesmo número de documento na declaração ou em outra já enviada.
  const chave = (l) => `${String(l.fornecedor).trim().toLowerCase()}|${String(l.documento).trim().toLowerCase()}`;
  const vistas = new Set(outras.filter((o) => o.id !== idAtual && o.situacao !== 'Devolvida' && o.situacao !== 'Rascunho').flatMap((o) => o.lancamentos.map(chave)));
  d.lancamentos.forEach((l, i) => {
    if (!l.fornecedor || !l.documento) return;
    if (vistas.has(chave(l))) porLinha[i] = { ...porLinha[i], documento: 'Esta nota já foi declarada.' };
    vistas.add(chave(l));
  });
  const ok = !geral.length && porLinha.every((x) => !Object.keys(x).length);
  return { ok, geral, porLinha, total };
}

/** Valida o retorno do PROFIN. glosas: [{indice, motivo}]. */
export function validarRetorno(r, d) {
  const e = {};
  if (!TIPOS_DE_RETORNO[r.tipo]) e.tipo = 'Escolha o resultado da análise.';
  if (!String(r.responsavel ?? '').trim()) e.responsavel = 'Escolha quem fez a análise.';
  if (String(r.parecer ?? '').trim().length < 15) e.parecer = 'Escreva o parecer, com pelo menos 15 letras.';
  const glosas = r.glosas || [];
  if (glosas.some((g) => String(g.motivo ?? '').trim().length < 5 || !d.lancamentos[g.indice])) e.glosas = 'Cada item glosado precisa de um motivo, com pelo menos 5 letras.';
  if (r.tipo === 'aprovada' && glosas.length) e.tipo = 'Há itens glosados: use "Aprovada com ressalvas" ou "Devolver para correção".';
  if (r.tipo === 'ressalvas' && !glosas.length) e.tipo = '"Aprovada com ressalvas" pede pelo menos um item glosado.';
  if (r.tipo === 'ressalvas' && glosas.length === d.lancamentos.length) e.tipo = 'Todos os itens foram glosados: devolva a declaração para correção.';
  if (r.tipo === 'devolvida' && !glosas.length && String(r.pendencia ?? '').trim().length < 10) e.pendencia = 'Diga o que a escola precisa corrigir (glose um item ou escreva a pendência).';
  return { ok: !Object.keys(e).length, erros: e };
}

/** Texto, tipo de etiqueta e ícone da situação da declaração (nunca só cor). */
export function situacaoDaDeclaracao(d) {
  switch (d.situacao) {
    case 'Aprovada': return { tipo: 'ok', icone: 'ok', texto: 'Aprovada' };
    case 'Aprovada com ressalvas': return { tipo: 'atencao', icone: 'alerta', texto: 'Aprovada com ressalvas' };
    case 'Devolvida': return { tipo: 'erro', icone: 'fechar', texto: 'Devolvida para correção' };
    case 'Em análise': return { tipo: 'info', icone: 'info', texto: 'Em análise no PROFIN' };
    case 'Enviada': return { tipo: 'info', icone: 'info', texto: 'Enviada, aguardando análise' };
    default: return { tipo: 'neutra', icone: '', texto: 'Rascunho' };
  }
}

/**
 * Soma as declarações aos repasses do painel (dados de data/profin.json).
 * - Aprovada (com ou sem ressalvas): o valor aprovado entra no executado e a prestação conta como entregue.
 * - Enviada ou em análise: a prestação conta como entregue, e o valor aparece em "emAnalise".
 * - Devolvida: a prestação volta a contar como NÃO entregue até a escola corrigir e reenviar.
 */
export function aplicarDeclaracoes(repasses, declaracoes) {
  return repasses.map((r) => {
    const ds = declaracoes.filter((d) => d.escolaId === r.escolaId && d.categoria === r.categoria && d.situacao !== 'Rascunho');
    if (!ds.length) return { ...r, declaracoes: [], emAnalise: 0, devolvida: false };
    const aprovado = ds.reduce((t, d) => t + valorAprovado(d), 0);
    const emAnalise = ds.filter((d) => PENDENTES_DE_ANALISE.includes(d.situacao)).reduce((t, d) => t + d.total, 0);
    const devolvida = ds.some((d) => d.situacao === 'Devolvida');
    const entregue = devolvida ? false : (r.prestacao.entregue || ds.some((d) => PENDENTES_DE_ANALISE.includes(d.situacao) || APROVADAS.includes(d.situacao)));
    return { ...r, executado: Math.round((r.executado + aprovado) * 100) / 100, prestacao: { ...r.prestacao, entregue }, declaracoes: ds, emAnalise, devolvida };
  });
}

/** Dias que a declaração está esperando análise (para ordenar a fila do PROFIN). */
export const diasEmEspera = (d, hoje) => (d.enviadaEm ? Math.max(0, diasEntre(d.enviadaEm.slice(0, 10), hoje)) : 0);
