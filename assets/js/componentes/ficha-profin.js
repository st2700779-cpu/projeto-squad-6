// Ficha financeira da escola: o lugar consolidado do PROFIN. A mesma ficha aparece para a equipe do PROFIN (todas as escolas,
// PROFIN › Ficha da escola) e para a direção (só a própria escola, Direção › Financeiro). Mostra o saldo por recurso, o que falta
// (prestação, documentos recusados, rascunhos e as pendências anotadas pelo PROFIN), como a escola gasta, o contexto da escola
// e a linha do tempo. A direção vê só as anotações que o PROFIN compartilhou; a equipe vê todas, inclusive as internas.
// As contas ficam em dominio/ficha-profin.js e dominio/notas-profin.js; esta peça só monta a tela.
import { esc, etiqueta, icone, dataBR, numeroBR, plural, vazio } from '../ui.js';
import { carregar, conjunto, dataDeReferencia } from '../dados.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { desempenhoDaEscola } from '../painel-dados.js';
import { adimplenciaDaEscola, reais, situacaoAto } from '../regras.js';
import { totaisDaEscola, comprovacaoPorCategoria, pendenciasDaEscola, gastosDaEscola, linhaDoTempoFinanceira } from '../dominio/ficha-profin.js';
import { notasDaEscola, pendenciasAbertas, contextos } from '../dominio/notas-profin.js';
import { semaforo, graficoDeBarras } from './indicadores.js';
import { notaHtml } from './notas-profin.js';
import { etiquetaDaDeclaracao, mesAno, tabelaLancamentos, blocoRetorno } from './declaracao.js';

/** Carrega tudo o que a ficha usa. O desempenho escolar é opcional: sem diário, a ficha segue sem ele. */
export async function carregarFicha() {
  const [dados, escolas, notas, hoje, atos] = await Promise.all([profinComDeclaracoes(), carregar('escolas'), conjunto('profin-notas'), dataDeReferencia(), carregar('atos')]);
  return { dados, escolas, notas, hoje, atos };
}
export const desempenhoOpcional = (escolaId) => desempenhoDaEscola(escolaId).catch(() => null);

const NIVEL_DA_GRAVIDADE = { erro: { chave: 'vermelho', icone: 'fechar' }, atencao: { chave: 'amarelo', icone: 'alerta' }, info: { chave: 'neutro', icone: 'info' } };
const ROTULO_DA_GRAVIDADE = { erro: 'Resolver já', atencao: 'Resolver logo', info: 'Acompanhar' };

/** Pendências da escola (para o painel e para a ficha). */
export function pendenciasDe(base, escolaId) {
  return pendenciasDaEscola({ repasses: base.dados.repasses.filter((r) => r.escolaId === escolaId), declaracoes: base.dados.declaracoes.filter((d) => d.escolaId === escolaId), hoje: base.hoje });
}
/** Anotações do PROFIN que esta visão pode ver: a equipe vê todas; a direção, só as compartilhadas. */
export const notasVisiveis = (base, escolaId, { tecnico = false } = {}) => notasDaEscola(base.notas || {}, escolaId, { soCompartilhadas: !tecnico });

function blocoPendencias(pend, { acaoDeclaracao }, anotadas = [], tecnico = false) {
  const manuais = anotadas.length ? `<div class="esp-t-2">${anotadas.map((n) => notaHtml(n, { tecnico })).join('')}</div>` : '';
  if (!pend.length && anotadas.length) return manuais;
  if (!pend.length) return `<p class="alerta-sucesso">${icone('ok', 20)}<span>Nada pendente: as prestações estão em dia e não há documento recusado.</span></p>`;
  return `<ul class="lista-pendencias">${pend.map((p) => `<li class="pendencia pendencia-${p.gravidade}">
    ${semaforo({ ...NIVEL_DA_GRAVIDADE[p.gravidade], texto: ROTULO_DA_GRAVIDADE[p.gravidade] })}
    <div><strong>${esc(p.titulo)}</strong><p class="esp-t-1 esp-b-0">${esc(p.detalhe)}</p>
    ${p.documentos?.length ? `<p class="esp-t-1 esp-b-0 texto-pequeno"><strong>Documentos com problema:</strong></p><ul class="texto-pequeno">${p.documentos.map((d) => `<li>${esc(d)}</li>`).join('')}</ul>` : ''}
    ${p.declaracaoId && acaoDeclaracao ? acaoDeclaracao(p) : ''}</div></li>`).join('')}</ul>${manuais}`;
}
function tabelaDeRecursos(linhas, descricoes) {
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Saldo e comprovação por recurso</caption>
    <thead><tr><th scope="col">Recurso</th><th scope="col" class="num">Recebido</th><th scope="col" class="num">Executado</th><th scope="col" class="num">Saldo</th><th scope="col">Comprovado no portal</th><th scope="col">Prestação de contas</th></tr></thead>
    <tbody>${linhas.map((l) => `<tr><td class="titulo-linha"><strong>${esc(l.categoria)}</strong><small>${esc(descricoes[l.categoria] || '')}</small></td>
      <td class="num valor-reais" data-rotulo="Recebido"><div>${reais(l.recebido)}</div></td>
      <td class="num valor-reais" data-rotulo="Executado"><div>${reais(l.executado)}<small>${numeroBR(l.percentual)}% do recebido</small></div></td>
      <td class="num valor-reais" data-rotulo="Saldo"><div>${reais(l.saldo)}</div></td>
      <td data-rotulo="Comprovado no portal"><div>${l.declaracoes ? `${reais(l.aprovado)} aprovado${l.emAnalise ? `<small>${reais(l.emAnalise)} em análise</small>` : ''}${l.devolvido ? `<small class="cor-perigo">${reais(l.devolvido)} devolvido para correção</small>` : ''}${l.glosado ? `<small>${reais(l.glosado)} glosado</small>` : ''}` : `<span class="texto-suave">${l.recebido > 0 ? 'nenhuma declaração enviada' : 'sem repasse'}</span>`}</div></td>
      <td data-rotulo="Prestação"><div>${semaforo(l.situacao)}<small>prazo ${dataBR(l.prazo)}</small></div></td></tr>`).join('')}</tbody></table></div>`;
}
function blocoGastos(g) {
  if (!g.porNatureza.length) return vazio('Nenhum gasto declarado ainda', 'Os gastos aparecem aqui quando a escola envia a declaração com os comprovantes.');
  const maior = Math.max(...g.porNatureza.map((n) => n.declarado));
  return `<p class="texto-suave esp-t-0">Gastos declarados pelo portal (${reais(g.total)}). O valor aprovado não conta os itens glosados nem as declarações ainda em análise.</p>
    ${graficoDeBarras(g.porNatureza.map((n) => ({ rotulo: `${n.natureza} (${n.categoria})`, valor: n.declarado, texto: `${reais(n.declarado)} · ${n.itens} ${plural(n.itens, 'gasto', 'gastos')}`, nivel: { chave: n.aprovado >= n.declarado ? 'verde' : n.aprovado > 0 ? 'amarelo' : 'neutro', icone: n.aprovado >= n.declarado ? 'ok' : 'info', texto: n.aprovado >= n.declarado ? 'aprovado' : n.aprovado > 0 ? `${reais(n.aprovado)} aprovado` : 'ainda sem aprovação' } })), { maximo: maior, formato: reais })}
    <h3>Fornecedores</h3>
    <div class="tabela-rolagem sem-limite"><table class="tabela min-0"><caption class="sr-only">Gastos por fornecedor</caption><thead><tr><th scope="col">Fornecedor</th><th scope="col" class="num">Gastos</th><th scope="col" class="num">Valor</th></tr></thead>
      <tbody>${g.porFornecedor.slice(0, 8).map((f) => `<tr><td>${esc(f.fornecedor)}</td><td class="num">${f.itens}</td><td class="num valor-reais">${reais(f.declarado)}</td></tr>`).join('')}</tbody></table></div>
    <h3>Últimos gastos com comprovante</h3>
    <ul class="lista-simples">${g.ultimos.slice(0, 8).map((l) => `<li><span><strong>${esc(l.descricao)}</strong> <span class="texto-suave texto-pequeno">${l.data ? dataBR(l.data) : 'sem data'} · ${esc(l.fornecedor)} · ${esc(l.documento)} · ${esc(l.categoria)}</span>${l.glosado ? ` ${etiqueta('Glosado', 'erro')}` : ''}<br><span class="texto-pequeno">${l.comprovante?.nome ? `${icone('documento', 16)} ${esc(l.comprovante.nome)}` : etiqueta('Sem comprovante', 'atencao')}</span></span><strong class="valor-reais">${reais(l.valor)}</strong></li>`).join('')}</ul>`;
}
function blocoContexto(escola, desempenho, atos, anotacoes, hoje, tecnico) {
  const meus = atos.filter((a) => a.escolaId === escola.id);
  const vencidos = meus.filter((a) => !situacaoAto(a, hoje).vigente).length;
  const cx = contextos(anotacoes);
  const resolvidas = anotacoes.filter((n) => n.tipo === 'pendencia' && !n.aberta);
  const t = desempenho?.totais;
  return `<dl class="resumo-linha">
      <div><dd>${t ? t.alunos : '—'}</dd><dt>estudantes</dt></div>
      <div><dd>${desempenho ? desempenho.lista.length : '—'}</dd><dt>turmas com diário</dt></div>
      <div><dd>${t?.frequencia == null ? '—' : `${numeroBR(t.frequencia)}%`}</dd><dt>frequência média</dt></div>
      <div class="${t?.emRisco ? 'alerta' : ''}"><dd>${t ? t.emRisco : '—'}</dd><dt>estudantes em risco</dt></div>
      <div class="${vencidos ? 'alerta' : ''}"><dd>${meus.length - vencidos} de ${meus.length}</dd><dt>atos vigentes</dt></div>
    </dl>
    <h3>${tecnico ? 'Contexto registrado pelo PROFIN' : 'Informações do PROFIN para a sua escola'}</h3>
    ${cx.length ? cx.map((n) => notaHtml(n, { tecnico })).join('') : `<p class="texto-suave">${tecnico ? 'Nenhuma anotação de contexto. O que os documentos não mostram (reforma, troca de gestor, atraso de fornecedor) fica registrado aqui.' : 'Nenhuma informação adicional no momento.'}</p>`}
    ${resolvidas.length ? `<h3>Pendências já resolvidas</h3>${resolvidas.map((n) => notaHtml(n, { tecnico })).join('')}` : ''}
    ${tecnico ? '' : '<p class="caixa-contexto">Por que isso ajuda: a escola sabe antes de gastar que um recurso tem restrição e resolve as pendências sem esperar o próximo contato do PROFIN. A escola precisa estar em dia com a prestação de contas para receber novos repasses.</p>'}`;
}
function blocoLinhaDoTempo(itens) {
  if (!itens.length) return '<p class="texto-suave">Sem movimentação registrada pelo portal.</p>';
  return `<ol class="linha-historico">${itens.slice(0, 12).map((i) => `<li>${dataBR(i.quando)} · ${esc(i.texto)}</li>`).join('')}</ol>`;
}
function blocoDeclaracoes(ds) {
  const enviadas = ds.filter((d) => d.situacao !== 'Rascunho').sort((a, b) => String(b.enviadaEm || '').localeCompare(String(a.enviadaEm || '')));
  if (!enviadas.length) return '<p class="texto-suave">A escola ainda não enviou declaração de gastos.</p>';
  return enviadas.map((d) => `<details class="bloco-declaracao"><summary><strong>${esc(d.categoria)} · ${esc(mesAno(d.competencia))}</strong> · ${reais(d.total)} ${etiquetaDaDeclaracao(d)}<br><span class="texto-suave texto-pequeno">${esc(d.id)}${d.enviadaEm ? ` · enviada em ${dataBR(d.enviadaEm.slice(0, 10))}` : ''}</span></summary>${blocoRetorno(d)}${tabelaLancamentos(d)}</details>`).join('');
}

/**
 * Tela da ficha. acaoDeclaracao(p): botão opcional em cada pendência com declaração (a direção corrige; o PROFIN analisa).
 * tecnico: true na equipe do PROFIN (vê as anotações internas e marca pendência como resolvida); a direção vê só as compartilhadas.
 * @param {{dados, escolas, notas, hoje, atos}} base resultado de carregarFicha()
 */
export function fichaHtml(base, escolaId, { desempenho = null, acaoDeclaracao = null, cabecalhoExtra = '', tecnico = false } = {}) {
  const { dados, escolas, hoje, atos } = base;
  const escola = escolas.find((e) => e.id === escolaId);
  const repasses = dados.repasses.filter((r) => r.escolaId === escolaId);
  const declaracoes = dados.declaracoes.filter((d) => d.escolaId === escolaId);
  const totais = totaisDaEscola(repasses);
  const linhas = comprovacaoPorCategoria(repasses, declaracoes, hoje);
  const aprovado = linhas.reduce((t, l) => t + l.aprovado, 0);
  const pend = pendenciasDe(base, escolaId);
  const anotacoes = notasVisiveis(base, escolaId, { tecnico });
  const anotadas = pendenciasAbertas(anotacoes);
  const nFalta = pend.length + anotadas.length;
  const adim = adimplenciaDaEscola(repasses, hoje);
  return `<header class="ficha-cabecalho"><div><h2 class="esp-t-0 esp-b-1" id="ficha-titulo">${esc(escola.nome)}</h2><p class="esp-t-0 texto-suave">${esc(escola.municipio)} · ${esc(escola.dre)}${escola.inep ? ` · INEP ${esc(escola.inep)}` : ''} · dados de ${dataBR(hoje)}</p><p class="esp-t-0">${semaforo(adim, { grande: true })}</p></div>${cabecalhoExtra}</header>
    <dl class="resumo-linha">
      <div><dd>${reais(totais.recebido)}</dd><dt>recebido no ano</dt></div>
      <div><dd>${reais(totais.executado)}</dd><dt>executado (${numeroBR(totais.percentual)}%)</dt></div>
      <div><dd>${reais(totais.saldo)}</dd><dt>saldo na conta</dt></div>
      <div><dd>${reais(aprovado)}</dd><dt>comprovado e aprovado no portal</dt></div>
      ${totais.emAnalise ? `<div class="atencao"><dd>${reais(totais.emAnalise)}</dd><dt>em análise no PROFIN</dt></div>` : ''}
    </dl>
    <h2>${tecnico ? 'O que falta' : 'O que falta regularizar'} <span class="texto-suave peso-normal texto-pequeno">${nFalta ? `${nFalta} ${plural(nFalta, 'item', 'itens')}` : 'nada'}</span></h2>
    ${blocoPendencias(pend, { acaoDeclaracao }, anotadas, tecnico)}
    <h2>Saldo e comprovação por recurso</h2>
    ${tabelaDeRecursos(linhas, dados.descricoes)}
    <p class="contagem">Executado = gastos registrados na conta da escola mais o que o PROFIN aprovou nas declarações. A prestação em atraso pode suspender o próximo repasse.</p>
    <h2>Como a escola está gastando</h2>
    ${blocoGastos(gastosDaEscola(declaracoes))}
    <h2>Declarações de gastos</h2>
    ${blocoDeclaracoes(declaracoes)}
    <h2>Contexto da escola</h2>
    ${blocoContexto(escola, desempenho, atos, anotacoes, hoje, tecnico)}
    <h2>Linha do tempo</h2>
    ${blocoLinhaDoTempo(linhaDoTempoFinanceira({ declaracoes, lancados: (dados.lancados || []).filter((l) => l.escolaId === escolaId) }))}`;
}
