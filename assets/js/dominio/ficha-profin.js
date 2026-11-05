// Domínio: ficha financeira da escola no PROFIN, o lugar consolidado para entender o que acontece com o dinheiro da escola.
//  - saldo por recurso: recebido, executado, em análise, saldo e quanto já foi comprovado (aprovado pelo PROFIN);
//  - o que falta: prestação atrasada ou perto do prazo, declaração devolvida com os documentos recusados, rascunho sem enviar,
//    gasto sem comprovante, valor glosado e saldo parado;
//  - como a escola gasta: por natureza do gasto e por fornecedor (o que foi declarado e o que foi aprovado);
//  - linha do tempo: repasses, envios e retornos.
// Os números são os mesmos do painel (dominio/profin.js e dominio/prestacao.js). Funções puras, testadas em tools/testar-cadastros.mjs.
import { situacaoDaPrestacao, saldo, percentualExecutado, reais, DIAS_DE_ALERTA } from './profin.js';
import { APROVADAS, PENDENTES_DE_ANALISE, valorAprovado, valorGlosado } from './prestacao.js';
import { diasEntre } from './painel.js';

const r2 = (v) => Math.round(v * 100) / 100;
const br = (iso) => String(iso).slice(0, 10).split('-').reverse().join('/');
/** Abaixo deste percentual executado, com o prazo da prestação a 60 dias ou menos, o saldo é considerado parado. */
export const EXECUCAO_BAIXA = 50;
export const DIAS_SALDO_PARADO = 60;
/** Declaração esperando análise há mais que isso entra na lista do PROFIN. */
export const DIAS_ESPERA_LONGA = 15;

/** Totais da escola: recebido, executado, saldo, em análise e percentual executado. */
export function totaisDaEscola(repasses) {
  const recebido = r2(repasses.reduce((t, r) => t + r.recebido, 0));
  const executado = r2(repasses.reduce((t, r) => t + r.executado, 0));
  const emAnalise = r2(repasses.reduce((t, r) => t + (r.emAnalise || 0), 0));
  return { recebido, executado, saldo: r2(recebido - executado), emAnalise, percentual: recebido > 0 ? Math.round((executado / recebido) * 1000) / 10 : 0 };
}

/**
 * Comprovação de cada recurso: o que as declarações enviadas pelo portal já provaram.
 * @returns {Array<{categoria, recebido, executado, saldo, percentual, emAnalise, aprovado, glosado, devolvido, declaracoes: number, situacao}>}
 */
export function comprovacaoPorCategoria(repasses, declaracoes, hoje) {
  return repasses.map((r) => {
    const ds = declaracoes.filter((d) => d.escolaId === r.escolaId && d.categoria === r.categoria && d.situacao !== 'Rascunho');
    return {
      categoria: r.categoria, recebido: r.recebido, executado: r.executado, saldo: saldo(r), percentual: percentualExecutado(r), emAnalise: r.emAnalise || 0,
      aprovado: r2(ds.reduce((t, d) => t + valorAprovado(d), 0)), glosado: r2(ds.filter((d) => APROVADAS.includes(d.situacao)).reduce((t, d) => t + valorGlosado(d), 0)),
      devolvido: r2(ds.filter((d) => d.situacao === 'Devolvida').reduce((t, d) => t + d.total, 0)), declaracoes: ds.length, situacao: situacaoDaPrestacao(r, hoje), prazo: r.prestacao.prazo
    };
  });
}

/**
 * O que falta para a escola ficar em dia com o PROFIN, do mais grave ao menos grave.
 * gravidade: 'erro' (resolver já), 'atencao' (resolver logo) ou 'info' (acompanhar).
 * @param {{repasses: object[], declaracoes: object[], hoje: string}} d repasses já com as declarações aplicadas (profinComDeclaracoes)
 * @returns {Array<{gravidade: string, titulo: string, detalhe: string, categoria?: string, declaracaoId?: string, documentos?: string[]}>}
 */
export function pendenciasDaEscola({ repasses, declaracoes, hoje }) {
  const p = [];
  for (const r of repasses) {
    if (r.recebido <= 0) continue;
    const s = situacaoDaPrestacao(r, hoje);
    const semPrestacao = r.executado > 0 ? ` ${reais(r.executado)} já gastos estão sem prestação aceita.` : '';
    if (s.chave === 'vermelho') p.push({ gravidade: 'erro', categoria: r.categoria, titulo: `Prestação de ${r.categoria} atrasada há ${-s.dias} ${-s.dias === 1 ? 'dia' : 'dias'}`, detalhe: `O prazo era ${br(r.prestacao.prazo)}.${semPrestacao} O próximo repasse pode ser suspenso.` });
    else if (s.chave === 'amarelo') p.push({ gravidade: 'atencao', categoria: r.categoria, titulo: `Prestação de ${r.categoria} vence em ${s.dias} ${s.dias === 1 ? 'dia' : 'dias'}`, detalhe: `Prazo: ${br(r.prestacao.prazo)}.${semPrestacao} Declare os gastos com os comprovantes.` });
    const dias = diasEntre(hoje, r.prestacao.prazo);
    if (!r.prestacao.entregue && percentualExecutado(r) < EXECUCAO_BAIXA && dias >= 0 && dias <= DIAS_SALDO_PARADO) {
      p.push({ gravidade: 'atencao', categoria: r.categoria, titulo: `Saldo parado em ${r.categoria}: só ${percentualExecutado(r).toLocaleString('pt-BR')}% usado`, detalhe: `${reais(saldo(r))} sem uso a ${dias} ${dias === 1 ? 'dia' : 'dias'} do prazo da prestação. Planeje os gastos ou explique o motivo ao PROFIN.` });
    }
  }
  for (const d of declaracoes) {
    if (d.situacao === 'Devolvida') {
      const docs = (d.retorno?.glosas || []).map((g) => { const l = d.lancamentos[g.indice]; return l ? `${l.documento} (${l.fornecedor}): ${g.motivo}` : g.motivo; });
      p.push({ gravidade: 'erro', categoria: d.categoria, declaracaoId: d.id, titulo: `Declaração ${d.id} devolvida para correção`, detalhe: d.retorno?.parecer || 'O PROFIN pediu correções.', documentos: docs });
    }
    if (d.situacao === 'Rascunho') {
      const sem = d.lancamentos.filter((l) => !l.comprovante?.nome).length;
      p.push({ gravidade: 'atencao', categoria: d.categoria, declaracaoId: d.id, titulo: `Rascunho de ${d.categoria} ainda não enviado`, detalhe: sem ? `${sem} ${sem === 1 ? 'gasto está' : 'gastos estão'} sem comprovante anexado.` : 'Os gastos estão prontos: falta enviar ao PROFIN.' });
    }
    if (APROVADAS.includes(d.situacao) && valorGlosado(d) > 0) {
      const docs = (d.retorno?.glosas || []).map((g) => { const l = d.lancamentos[g.indice]; return l ? `${l.documento} (${l.fornecedor}): ${g.motivo}` : g.motivo; });
      p.push({ gravidade: 'info', categoria: d.categoria, declaracaoId: d.id, titulo: `${reais(valorGlosado(d))} glosados na declaração ${d.id}`, detalhe: 'Valor não aceito pelo PROFIN: não conta como gasto do recurso e precisa voltar para a conta da escola.', documentos: docs });
    }
    if (PENDENTES_DE_ANALISE.includes(d.situacao) && d.enviadaEm && diasEntre(d.enviadaEm.slice(0, 10), hoje) > DIAS_ESPERA_LONGA) {
      p.push({ gravidade: 'info', categoria: d.categoria, declaracaoId: d.id, titulo: `Declaração ${d.id} espera análise há ${diasEntre(d.enviadaEm.slice(0, 10), hoje)} dias`, detalhe: 'Enviada pela escola e ainda sem retorno do PROFIN.' });
    }
  }
  const peso = { erro: 0, atencao: 1, info: 2 };
  return p.sort((a, b) => peso[a.gravidade] - peso[b.gravidade]);
}

/**
 * Como a escola gasta: soma dos gastos declarados por natureza e por fornecedor (declarações enviadas, sem rascunho).
 * Os itens glosados ficam fora do "aprovado".
 * @returns {{porNatureza: Array<{natureza, categoria, declarado, aprovado, itens}>, porFornecedor: Array<{fornecedor, declarado, itens}>, total: number, ultimos: object[]}}
 */
export function gastosDaEscola(declaracoes) {
  const enviadas = declaracoes.filter((d) => d.situacao !== 'Rascunho');
  const naturezas = new Map(), fornecedores = new Map();
  const ultimos = [];
  for (const d of enviadas) {
    const glosados = new Set((d.retorno?.glosas || []).map((g) => g.indice));
    d.lancamentos.forEach((l, i) => {
      const valor = Number(l.valor) || 0;
      const aprovado = APROVADAS.includes(d.situacao) && !glosados.has(i) ? valor : 0;
      const n = naturezas.get(l.natureza) || { natureza: l.natureza, categoria: d.categoria, declarado: 0, aprovado: 0, itens: 0 };
      n.declarado = r2(n.declarado + valor); n.aprovado = r2(n.aprovado + aprovado); n.itens += 1; naturezas.set(l.natureza, n);
      const chave = String(l.fornecedor).trim();
      const f = fornecedores.get(chave) || { fornecedor: chave, declarado: 0, itens: 0 };
      f.declarado = r2(f.declarado + valor); f.itens += 1; fornecedores.set(chave, f);
      ultimos.push({ ...l, valor, categoria: d.categoria, declaracaoId: d.id, situacao: d.situacao, glosado: glosados.has(i) });
    });
  }
  const total = r2([...naturezas.values()].reduce((t, n) => t + n.declarado, 0));
  return {
    porNatureza: [...naturezas.values()].sort((a, b) => b.declarado - a.declarado),
    porFornecedor: [...fornecedores.values()].sort((a, b) => b.declarado - a.declarado),
    total, ultimos: ultimos.sort((a, b) => String(b.data).localeCompare(String(a.data)))
  };
}

/** Linha do tempo financeira da escola (mais recente primeiro): repasses lançados, envios de declaração e retornos do PROFIN. */
export function linhaDoTempoFinanceira({ declaracoes, lancados = [] }) {
  const itens = [];
  for (const l of lancados) {
    itens.push({ quando: l.data, texto: `Repasse de ${reais(l.valor)} em ${l.categoria}`, tipo: 'repasse' });
    if (l.estornadoEm) itens.push({ quando: l.estornadoEm, texto: `Estorno do repasse de ${reais(l.valor)} em ${l.categoria}: ${l.estornoMotivo}`, tipo: 'estorno' });
  }
  for (const d of declaracoes.filter((x) => x.situacao !== 'Rascunho')) {
    if (d.enviadaEm) itens.push({ quando: d.enviadaEm.slice(0, 10), texto: `Declaração ${d.id} enviada: ${d.categoria}, ${reais(d.total)}`, tipo: 'envio' });
    if (d.retorno?.quando) itens.push({ quando: d.retorno.quando.slice(0, 10), texto: `Retorno do PROFIN para ${d.id}: ${d.situacao}${d.retorno.por ? ` (${d.retorno.por})` : ''}`, tipo: d.situacao === 'Devolvida' ? 'devolvida' : 'retorno' });
  }
  return itens.sort((a, b) => String(b.quando).localeCompare(String(a.quando)));
}

/** Resumo de uma linha para o painel: quantas pendências graves e de atenção a escola tem. */
export const resumoDePendencias = (pendencias) => ({ erro: pendencias.filter((x) => x.gravidade === 'erro').length, atencao: pendencias.filter((x) => x.gravidade === 'atencao').length, info: pendencias.filter((x) => x.gravidade === 'info').length });
export { DIAS_DE_ALERTA };
