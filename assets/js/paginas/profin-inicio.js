// PROFIN · Prestação de contas: o painel no modelo combinado com a equipe. Os dados são os mesmos de antes (repasses, execução,
// situação da prestação por categoria, declarações e anotações); muda a forma de mostrar.
//  - Ver como: "Técnico do PROFIN" (todas as escolas, com as anotações internas) ou "Gestor da escola" (o que a direção vê em
//    Direção › Financeiro: só o que o PROFIN compartilhou).
//  - Indicadores, busca, regional, município, situação, "só com pendências" e o rascunho do relatório no próprio painel.
//  - Um cartão por escola, da situação mais grave para a menos grave: situação geral, pendências abertas, um chip por recurso
//    (executado e prazo da prestação) e, aberto, os valores, as pendências (calculadas pelo portal e anotadas pelo PROFIN), o
//    contexto da escola e a nova anotação. Pendência anotada tem documento (NF), pode ser interna ou compartilhada e é marcada
//    como resolvida. Gastos, declarações e repasses ficam na ficha da escola (profin/escola.html).
// As regras ficam em dominio/ficha-profin.js e dominio/notas-profin.js.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { pendenciasDaEscola } from '../dominio/ficha-profin.js';
import { notasDaEscola, pendenciasAbertas, contextos } from '../dominio/notas-profin.js';
import { esc, numeroBR, dataBR, plural, vazio, icone, etiqueta, avisar, combina, baixarTexto, comEspera } from '../ui.js';
import { carregar, conjunto, dataDeReferencia, registrarAcao } from '../dados.js';
import { situacaoDaPrestacao, adimplenciaDaEscola, saldo, percentualExecutado, reais, nomeCurto, rascunhoDoRelatorio } from '../regras.js';
import { semaforo, legendaDeNiveis } from '../componentes/indicadores.js';
import { notaHtml, pendenciaCalculadaHtml, formularioNotaHtml, salvarNotaDoFormulario, alternarNotaSalva } from '../componentes/notas-profin.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/index.html', assistente: false });
const GRAVE = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };
const SITUACOES = [['', 'Todas'], ['atraso', 'Com prestação atrasada'], ['vencendo', 'Vencendo em 30 dias'], ['dia', 'Em dia']];
let dados, escolas, notas, hoje;
let visao = 'tecnico', busca = '', regional = '', municipio = '', filtro = '', soPendencias = false, gestorId = null;
const abertas = new Set();
let rascunho = null; // { texto, escolas, aprovado?: { por, quando } }

const doEscola = (id) => dados.repasses.filter((r) => r.escolaId === id);
const decsDe = (id) => dados.declaracoes.filter((d) => d.escolaId === id);
/** Pendências calculadas pelo portal (prestação, declaração devolvida, rascunho, glosa...), da mais grave à menos grave. */
const calculadas = (id) => pendenciasDaEscola({ repasses: doEscola(id), declaracoes: decsDe(id), hoje });
/** Pendências abertas: as calculadas para resolver (não as só "para acompanhar") e as anotadas pelo PROFIN ainda abertas. */
const abertasDe = (id, { soCompartilhadas = false } = {}) => calculadas(id).filter((p) => p.gravidade !== 'info').length + pendenciasAbertas(notasDaEscola(notas, id, { soCompartilhadas })).length;
const quem = () => sessao()?.nome || 'Equipe PROFIN';
const nomeDe = (id) => escolas.find((e) => e.id === id)?.nome || id;

function lista() {
  return escolas
    .filter((e) => (!regional || e.dre === regional) && (!municipio || e.municipio === municipio) && combina(busca, e.nome, e.municipio, e.inep))
    .map((e) => ({ e, adim: adimplenciaDaEscola(doEscola(e.id), hoje), abertas: abertasDe(e.id) }))
    .filter(({ adim }) => !filtro || (filtro === 'atraso' ? adim.chave === 'vermelho' : filtro === 'vencendo' ? adim.chave === 'amarelo' : adim.chave === 'verde'))
    .filter((x) => !soPendencias || x.abertas > 0)
    .sort((a, b) => GRAVE[a.adim.chave] - GRAVE[b.adim.chave] || b.abertas - a.abertas || a.e.nome.localeCompare(b.e.nome, 'pt-BR'));
}
const seloPendencias = (n) => (n ? etiqueta(`Pendências abertas: ${n}`, 'atencao') : etiqueta('Em dia', 'ok'));

// ---------------- Técnico do PROFIN ----------------
function indicadores() {
  const adims = escolas.map((e) => adimplenciaDaEscola(doEscola(e.id), hoje));
  const conta = (c) => adims.filter((a) => a.chave === c).length;
  const abertasPorEscola = escolas.map((e) => abertasDe(e.id));
  const totalAbertas = abertasPorEscola.reduce((t, n) => t + n, 0);
  const comPend = abertasPorEscola.filter((n) => n > 0).length;
  const nContextos = contextos(notasDaEscola(notas)).length;
  const recebido = dados.repasses.reduce((n, r) => n + r.recebido, 0), executado = dados.repasses.reduce((n, r) => n + r.executado, 0);
  return `<dl class="resumo-linha">
      <div><dd>${escolas.length}</dd><dt>escolas acompanhadas</dt></div>
      <div class="${comPend ? 'atencao' : ''}"><dd>${comPend}</dd><dt>${plural(comPend, 'escola com pendências', 'escolas com pendências')}</dt></div>
      <div class="${totalAbertas ? 'atencao' : ''}"><dd>${totalAbertas}</dd><dt>${plural(totalAbertas, 'pendência aberta', 'pendências abertas')}</dt></div>
      <div><dd>${nContextos}</dd><dt>${plural(nContextos, 'contexto registrado', 'contextos registrados')}</dt></div>
    </dl>
    <dl class="resumo-linha">
      <div><dd>${conta('verde')}</dd><dt>em dia</dt></div>
      <div class="${conta('amarelo') ? 'atencao' : ''}"><dd>${conta('amarelo')}</dd><dt>vencendo em 30 dias</dt></div>
      <div class="${conta('vermelho') ? 'alerta' : ''}"><dd>${conta('vermelho')}</dd><dt>${plural(conta('vermelho'), 'escola com atraso', 'escolas com atraso')}</dt></div>
      <div><dd>${numeroBR(recebido ? (executado / recebido) * 100 : 0)}%</dd><dt>executado de ${reais(recebido)}</dt></div>
    </dl>`;
}
function filtros() {
  const dres = [...new Set(escolas.map((e) => e.dre))].sort((a, b) => a.localeCompare(b, 'pt-BR', { numeric: true }));
  const municipios = [...new Set(escolas.filter((e) => !regional || e.dre === regional).map((e) => e.municipio))].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  return `<div class="ferramentas-tabela filtros-profin">
      <div class="campo campo-busca"><label for="busca">Buscar escola</label><input id="busca" class="entrada" type="search" autocomplete="off" placeholder="Nome ou município" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div class="campo"><label for="f-regional">Regional</label><select id="f-regional" class="entrada"><option value="">Todas</option>${dres.map((d) => `<option ${d === regional ? 'selected' : ''}>${esc(d)}</option>`).join('')}</select></div>
      <div class="campo"><label for="f-municipio">Município</label><select id="f-municipio" class="entrada"><option value="">Todos</option>${municipios.map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div>
      <div class="campo"><label for="f-situacao">Situação</label><select id="f-situacao" class="entrada">${SITUACOES.map(([v, t]) => `<option value="${v}" ${v === filtro ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      <label class="marca-item marca-filtro"><input type="checkbox" id="so-pendencias" ${soPendencias ? 'checked' : ''}><span>Só com pendências</span></label>
      <button type="button" class="botao" id="gerar-rascunho">${icone('documento', 20)}Gerar rascunho do relatório</button>
    </div>`;
}
function blocoRascunho() {
  if (!rascunho) return '';
  return `<section class="painel-rascunho" aria-labelledby="rascunho-titulo">
    <div class="linha-entre"><h2 id="rascunho-titulo" class="esp-t-0">Rascunho do relatório</h2>${etiqueta('Montado por modelo fixo, sem IA', 'atencao')}</div>
    <p class="texto-suave texto-pequeno esp-t-0">${rascunho.escolas} ${plural(rascunho.escolas, 'escola', 'escolas')} do filtro atual. Revise os números e escreva as conclusões antes de usar.</p>
    <pre class="texto-rascunho" tabindex="0">${esc(rascunho.texto)}</pre>
    <div class="linha-botoes"><button type="button" class="botao" id="aprovar-rascunho" ${rascunho.aprovado ? 'disabled' : ''}>${icone('ok', 20)}${rascunho.aprovado ? 'Rascunho aprovado' : 'Aprovar rascunho'}</button><button type="button" class="botao botao-secundario" id="baixar-rascunho">${icone('baixar', 20)}Baixar (.txt)</button><a class="botao botao-secundario" href="${link('profin/relatorio.html')}">${icone('formulario', 20)}Editar no relatório completo</a><button type="button" class="botao botao-texto" id="fechar-rascunho">Fechar</button></div>
    ${rascunho.aprovado ? `<p class="alerta-sucesso esp-t-2">${icone('ok', 20)}<span>Aprovado para exportação por ${esc(rascunho.aprovado.por)} em ${dataBR(rascunho.aprovado.quando)}. Baixe o texto ou abra o relatório completo para editar e imprimir.</span></p>` : ''}
  </section>`;
}
function chipsDeRecursos(id) {
  const ns = notasDaEscola(notas, id);
  return `<ul class="chips-recursos" aria-label="Recursos e prestação de contas">${doEscola(id).map((r) => {
    const n = ns.filter((x) => x.categoria === r.categoria).length;
    return `<li class="chip-recurso"><strong>${esc(r.categoria)}</strong><span>${r.recebido > 0 ? `${numeroBR(percentualExecutado(r), 0)}% executado` : '—'}</span>${semaforo(situacaoDaPrestacao(r, hoje))}${n ? `<small>${n} ${plural(n, 'anotação', 'anotações')}</small>` : ''}</li>`;
  }).join('')}</ul>`;
}
/** "2 pendências · 1 para acompanhar": as calculadas pelo portal mais as anotadas abertas. */
function linhaDePendencias(id) {
  const n = abertasDe(id), info = calculadas(id).filter((p) => p.gravidade === 'info').length;
  return `<span class="${n ? 'cor-perigo' : ''}">${n ? `${n} ${plural(n, 'pendência', 'pendências')}` : 'sem pendência'}${info ? ` · ${info} para acompanhar` : ''}</span>`;
}
function tabelaDeRecursos(e) {
  const reps = doEscola(e.id);
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Recursos de ${esc(e.nome)} por categoria</caption>
    <thead><tr><th scope="col">Categoria</th><th scope="col" class="num">Recebido</th><th scope="col" class="num">Executado</th><th scope="col" class="num">Saldo</th><th scope="col">Prestação de contas</th></tr></thead>
    <tbody>${reps.map((r) => `<tr><td class="titulo-linha"><strong>${esc(r.categoria)}</strong>${r.declaracoes?.length ? `<small>${r.declaracoes.length} ${plural(r.declaracoes.length, 'declaração', 'declarações')}: ${r.declaracoes.map((d) => esc(d.situacao)).join(', ')}</small>` : ''}</td><td class="num valor-reais" data-rotulo="Recebido"><div>${reais(r.recebido)}</div></td><td class="num valor-reais" data-rotulo="Executado"><div>${reais(r.executado)}<small>${numeroBR(percentualExecutado(r))}%</small>${r.emAnalise ? `<small>+ ${reais(r.emAnalise)} em análise</small>` : ''}</div></td><td class="num valor-reais" data-rotulo="Saldo"><div>${reais(saldo(r))}</div></td><td data-rotulo="Prestação"><div>${semaforo(situacaoDaPrestacao(r, hoje))}<small>prazo ${dataBR(r.prestacao.prazo)}</small></div></td></tr>`).join('')}</tbody></table></div>`;
}
function corpoDaEscola(e) {
  const calc = calculadas(e.id);
  const ns = notasDaEscola(notas, e.id);
  const ordem = [...pendenciasAbertas(ns), ...contextos(ns), ...ns.filter((n) => n.tipo === 'pendencia' && !n.aberta)];
  return `<div class="corpo-escola" id="corpo-${esc(e.id)}">
    <p class="esp-t-0 texto-suave">${esc(e.nome)} · ${esc(e.municipio)} · ${esc(e.dre)}</p>
    <p>${semaforo(adimplenciaDaEscola(doEscola(e.id), hoje), { grande: true })}</p>
    ${tabelaDeRecursos(e)}
    <h3>Pendências e anotações</h3>
    ${calc.length || ordem.length ? `${calc.map(pendenciaCalculadaHtml).join('')}${ordem.map((n) => notaHtml(n, { tecnico: true })).join('')}` : '<p class="texto-suave">Sem anotações. Esta escola está em dia.</p>'}
    ${formularioNotaHtml(e.id, dados.categorias)}
    <p class="esp-t-3"><a class="botao botao-secundario" href="${link(`profin/escola.html?escola=${encodeURIComponent(e.id)}`)}">${icone('documento', 20)}Abrir a ficha da escola</a> <span class="texto-suave texto-pequeno">gastos por natureza e fornecedor, declarações, contexto escolar, repasses e linha do tempo</span></p>
  </div>`;
}
function cartaoDaEscola({ e, adim, abertas: nAbertas }) {
  const aberto = abertas.has(e.id);
  const reps = doEscola(e.id);
  const recebido = reps.reduce((t, r) => t + r.recebido, 0), executado = reps.reduce((t, r) => t + r.executado, 0);
  return `<section class="cartao-escola" aria-labelledby="esc-${esc(e.id)}">
    <div class="linha-entre"><h2 class="titulo-cartao esp-t-0"><button type="button" class="botao-expandir" id="esc-${esc(e.id)}" data-abrir="${esc(e.id)}" aria-expanded="${aberto}" aria-controls="corpo-${esc(e.id)}"><span class="seta-expandir" aria-hidden="true">${aberto ? '▾' : '▸'}</span><span>${esc(nomeCurto(e.nome))}</span></button></h2>
      <div class="selos-escola">${etiqueta(e.dre, 'neutra')}${seloPendencias(nAbertas)}</div></div>
    <p class="linha-escola">${semaforo({ ...adim, texto: { vermelho: 'Com atraso', amarelo: 'Vencendo', verde: 'Em dia' }[adim.chave] || adim.texto })}<span>${esc(e.municipio)}</span><span>executado ${reais(executado)} de ${reais(recebido)}</span>${linhaDePendencias(e.id)}</p>
    ${chipsDeRecursos(e.id)}
    ${aberto ? corpoDaEscola(e) : ''}
  </section>`;
}
function visaoTecnico() {
  const ls = lista();
  const fila = dados.declaracoes.filter((d) => d.situacao === 'Enviada' || d.situacao === 'Em análise').length;
  return `${fila ? `<div class="alerta-atencao" role="status">${icone('alerta', 20)}<span>${fila} ${plural(fila, 'declaração de gastos aguarda análise', 'declarações de gastos aguardam análise')}. <a href="${link('profin/analise.html')}">Abrir a fila</a></span></div>` : ''}
    ${indicadores()}
    ${filtros()}
    <div id="area-rascunho">${blocoRascunho()}</div>
    ${legendaDeNiveis([[{ chave: 'verde', icone: 'ok' }, 'entregue ou no prazo'], [{ chave: 'amarelo', icone: 'alerta' }, 'vence em até 30 dias'], [{ chave: 'vermelho', icone: 'fechar' }, 'atrasada']])}
    ${ls.length ? ls.map(cartaoDaEscola).join('') : vazio('Nenhuma escola encontrada com esses filtros', 'Limpe a busca ou escolha outra regional, município ou situação.')}
    <p class="contagem">${ls.length} ${plural(ls.length, 'escola', 'escolas')} · da situação mais grave para a menos grave · abra a escola para ver os valores, as pendências e anotar</p>`;
}

// ---------------- Gestor da escola (o que a direção vê) ----------------
function visaoGestor() {
  if (!escolas.some((e) => e.id === gestorId)) gestorId = lista()[0]?.e.id || escolas[0].id;
  const e = escolas.find((x) => x.id === gestorId);
  const adim = adimplenciaDaEscola(doEscola(e.id), hoje);
  const ns = notasDaEscola(notas, e.id, { soCompartilhadas: true });
  const calc = calculadas(e.id);
  const pen = pendenciasAbertas(ns), cx = contextos(ns);
  return `<div class="ferramentas-tabela"><div class="campo"><label for="g-escola">Sua escola</label><select id="g-escola" class="entrada">${escolas.map((x) => `<option value="${x.id}" ${x.id === gestorId ? 'selected' : ''}>${esc(nomeCurto(x.nome))}</option>`).join('')}</select></div></div>
    <section class="cartao-escola" aria-labelledby="g-titulo"><div class="linha-entre"><h2 id="g-titulo" class="titulo-cartao">${esc(e.nome)}</h2><div class="selos-escola">${semaforo(adim)} ${seloPendencias(abertasDe(e.id, { soCompartilhadas: true }))}</div></div>
      <p class="texto-suave esp-b-0">A gestão da escola vê apenas o que o PROFIN compartilhou. É a mesma informação de Direção › Financeiro.</p></section>
    <section class="cartao-escola" aria-labelledby="g-falta"><h2 id="g-falta" class="titulo-cartao">O que falta regularizar</h2>
      ${calc.length || pen.length ? `${calc.map(pendenciaCalculadaHtml).join('')}${pen.map((n) => notaHtml(n)).join('')}` : '<p class="esp-b-0">Nenhuma pendência aberta. A prestação de contas está em dia.</p>'}</section>
    <section class="cartao-escola" aria-labelledby="g-info"><h2 id="g-info" class="titulo-cartao">Informações do PROFIN para a sua escola</h2>
      ${cx.length ? cx.map((n) => notaHtml(n)).join('') : '<p>Nenhuma informação adicional no momento.</p>'}
      <p class="caixa-contexto">Por que isso ajuda: a escola sabe antes de gastar que um recurso tem restrição e resolve as pendências sem esperar o próximo contato do PROFIN. A escola precisa estar em dia com a prestação de contas para receber novos repasses.</p></section>`;
}

function desenhar() {
  main.innerHTML = `
    <header class="heroi">
      <span class="heroi-selo">Financeiro</span>
      <h1>PROFIN · Prestação de contas</h1>
      <p class="heroi-linha">Prestação de contas de cada escola por categoria de recurso. A prestação em atraso pode suspender o próximo repasse. Dados de ${dataBR(hoje)}.</p>
      <p class="heroi-linha texto-pequeno">Protótipo com dados fictícios. Complementa o ContEdu: não substitui a análise dos documentos.</p>
    </header>
    <div class="ver-como"><span id="ver-como-rotulo">Ver como</span><div class="abas-estado esp-b-0" role="group" aria-labelledby="ver-como-rotulo"><button type="button" class="chip" data-visao="tecnico" aria-pressed="${visao === 'tecnico'}">${icone('lista', 18)} Técnico do PROFIN</button><button type="button" class="chip" data-visao="gestor" aria-pressed="${visao === 'gestor'}">${icone('escola', 18)} Gestor da escola</button></div></div>
    ${visao === 'tecnico' ? visaoTecnico() : visaoGestor()}`;
}
async function mostrar() {
  try {
    [dados, escolas, notas, hoje] = await Promise.all([profinComDeclaracoes(), carregar('escolas'), conjunto('profin-notas'), dataDeReferencia()]);
    escolas = escolas.filter((e) => !e.exemplo); // as escolas reais com vagas de exemplo não têm dados do PROFIN no protótipo
    if (!abertas.size) { const primeira = lista()[0]; if (primeira) abertas.add(primeira.e.id); }
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const focar = (seletor) => main.querySelector(seletor)?.focus();

main.addEventListener('input', (e) => {
  if (e.target.id !== 'busca') return;
  busca = e.target.value;
  const pos = e.target.selectionStart;
  desenhar();
  const campo = main.querySelector('#busca'); campo.focus(); campo.setSelectionRange(pos, pos);
});
main.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'f-regional') { regional = t.value; municipio = ''; desenhar(); focar('#f-regional'); }
  if (t.id === 'f-municipio') { municipio = t.value; desenhar(); focar('#f-municipio'); }
  if (t.id === 'f-situacao') { filtro = t.value; desenhar(); focar('#f-situacao'); }
  if (t.id === 'so-pendencias') { soPendencias = t.checked; desenhar(); focar('#so-pendencias'); }
  if (t.id === 'g-escola') { gestorId = t.value; desenhar(); focar('#g-escola'); }
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.visao) { visao = b.dataset.visao; desenhar(); focar(`[data-visao="${visao}"]`); return; }
  if (b.dataset.abrir) {
    const id = b.dataset.abrir;
    if (abertas.has(id)) abertas.delete(id); else abertas.add(id);
    desenhar(); focar(`[data-abrir="${CSS.escape(id)}"]`); return;
  }
  if (b.id === 'gerar-rascunho') {
    const ls = lista().map((x) => x.e);
    if (!ls.length) { avisar('Nenhuma escola no filtro. Mude os filtros para gerar o rascunho.', 'erro'); return; }
    const ids = new Set(ls.map((x) => x.id));
    rascunho = { texto: rascunhoDoRelatorio({ escolas: ls, repasses: dados.repasses.filter((r) => ids.has(r.escolaId)), notas, hoje, declaracoes: dados.declaracoes }), escolas: ls.length };
    main.querySelector('#area-rascunho').innerHTML = blocoRascunho();
    main.querySelector('#rascunho-titulo').scrollIntoView({ block: 'start' }); focar('.texto-rascunho');
    avisar('Rascunho gerado. Revise os números e escreva as conclusões.');
    return;
  }
  if (b.id === 'aprovar-rascunho' && rascunho) {
    try {
      await comEspera(b, () => registrarAcao(quem(), 'Aprovou o rascunho do relatório do PROFIN', `${rascunho.escolas} ${plural(rascunho.escolas, 'escola', 'escolas')}`));
      rascunho.aprovado = { por: quem(), quando: hoje };
      main.querySelector('#area-rascunho').innerHTML = blocoRascunho(); focar('#baixar-rascunho');
      avisar('Rascunho aprovado para exportação.');
    } catch { avisar('Não foi possível registrar a aprovação. Confira a conexão e tente de novo.'); }
    return;
  }
  if (b.id === 'baixar-rascunho' && rascunho) { baixarTexto(`relatorio-profin-${hoje}.txt`, rascunho.texto); return; }
  if (b.id === 'fechar-rascunho') { rascunho = null; main.querySelector('#area-rascunho').innerHTML = ''; focar('#gerar-rascunho'); return; }
  if (b.dataset.resolver) {
    const chave = b.dataset.resolver, indice = Number(b.dataset.indice);
    const ref = (notas[chave] || [])[indice];
    if (!ref) return;
    const escolaId = chave.split('|')[0];
    try {
      const r = await alternarNotaSalva(chave, indice, ref, { por: quem(), hoje, nomeDaEscola: nomeDe(escolaId) });
      notas = r.notas; abertas.add(escolaId);
      desenhar(); focar(`[data-resolver="${CSS.escape(chave)}"][data-indice="${indice}"]`) ;
      avisar(r.resolvida ? 'Pendência marcada como resolvida.' : 'Pendência reaberta.');
    } catch { avisar('Não foi possível atualizar a pendência. Confira a conexão e tente de novo.'); mostrar(); }
  }
});
main.addEventListener('submit', async (e) => {
  const form = e.target.closest('.form-nota');
  if (!form) return;
  e.preventDefault();
  const escolaId = form.dataset.notaEscola;
  try {
    const r = await comEspera(e.submitter, () => salvarNotaDoFormulario(form, { categorias: dados.categorias, por: quem(), hoje, nomeDaEscola: nomeDe(escolaId) }));
    if (!r.ok) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    notas = r.notas; abertas.add(escolaId);
    desenhar();
    focar(`#nn-${CSS.escape(escolaId)}-texto`);
    avisar(`Anotação salva na escola ${nomeCurto(nomeDe(escolaId))}.`);
  } catch { avisar('Não foi possível salvar a anotação. Confira a conexão e tente de novo.'); }
});
mostrar();
