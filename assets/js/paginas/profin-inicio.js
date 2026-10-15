// PROFIN: painel por escola e por categoria de recurso (Custeio, Capital, Merenda, Emenda Parlamentar).
// Cada célula mostra quanto foi executado e a situação da prestação de contas (cor, símbolo e palavra).
// Cada escola tem anotações de contexto: o que os documentos não dizem (atraso por reforma, troca de gestor).
import { iniciar, falhaDados, link } from '../app.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { etiquetaDaDeclaracao, mesAno } from '../componentes/declaracao.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { validarRepasse, podeEstornar, validarEstorno, aplicarEstorno } from '../dominio/prestacao.js';
import { sessao } from '../auth.js';
import { esc, numeroBR, dataBR, plural, vazio, avisar, comEspera, icone, etiqueta } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { situacaoDaPrestacao, adimplenciaDaEscola, saldo, percentualExecutado, reais, nomeCurto } from '../regras.js';
import { semaforo, celulaDeCalor, legendaDeNiveis } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/index.html', assistente: false });
const GRAVE = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };
let dados, escolas, notas, hoje, sel = null, filtro = '', municipio = '', estornando = null;

const doEscola = (id) => dados.repasses.filter((r) => r.escolaId === id);
function linhas() {
  return escolas.filter((e) => !municipio || e.municipio === municipio)
    .map((e) => ({ e, adim: adimplenciaDaEscola(doEscola(e.id), hoje) }))
    .filter(({ adim }) => !filtro || (filtro === 'atraso' ? adim.chave === 'vermelho' : filtro === 'vencendo' ? adim.chave === 'amarelo' : adim.chave === 'verde'))
    .sort((a, b) => GRAVE[a.adim.chave] - GRAVE[b.adim.chave] || a.e.nome.localeCompare(b.e.nome, 'pt-BR'));
}
function repassesDe(e) {
  const ls = (dados.lancados || []).filter((l) => l.escolaId === e.id);
  const linhaDe = (l) => {
    if (l.estornadoEm) return `<li class="repasse-estornado"><div>${esc(l.categoria)} · ${reais(l.valor)} · crédito em ${dataBR(l.data)} ${etiqueta('Estornado', 'neutra')}<small class="repasse-nota">${dataBR(l.estornadoEm)} · ${esc(l.estornadoPor)} · motivo: ${esc(l.estornoMotivo)}</small></div></li>`;
    const pode = podeEstornar(l, doEscola(e.id).find((r) => r.categoria === l.categoria) || { recebido: 0, executado: 0 });
    const acao = estornando === l.id
      ? `<form class="form-recusa" data-estornar-form="${esc(l.id)}" novalidate><label for="est-${esc(l.id)}">Motivo do estorno <span class="dica">Fica no histórico.</span></label><textarea id="est-${esc(l.id)}" name="motivo" class="entrada" rows="2" maxlength="300" aria-describedby="est-${esc(l.id)}-erro"></textarea><p class="erro" id="est-${esc(l.id)}-erro" role="alert"></p><div class="linha-botoes"><button type="submit" class="botao botao-perigo botao-mini">Confirmar estorno</button><button type="button" class="botao botao-texto botao-mini" data-cancelar-estorno>Cancelar</button></div></form>`
      : pode.ok ? `<button type="button" class="botao botao-secundario botao-mini" data-estornar="${esc(l.id)}" aria-label="Estornar repasse de ${reais(l.valor)} (${esc(l.categoria)})">Estornar</button>` : `<small class="texto-suave">${esc(pode.motivo)}</small>`;
    return `<li><div>${esc(l.categoria)} · ${reais(l.valor)} · crédito em ${dataBR(l.data)} · prestar contas até ${dataBR(l.prazo)} <span class="texto-suave texto-pequeno">(${esc(l.lancadoPor)})</span><div class="esp-t-1">${acao}</div></div></li>`;
  };
  return `<h3>Repasses lançados</h3>${ls.length ? `<ul class="lista-simples">${ls.map(linhaDe).join('')}</ul>` : '<p class="texto-suave">Nenhum repasse lançado por aqui. Os valores do painel vêm da base inicial.</p>'}
    <form id="form-repasse" class="painel-inline esp-t-2" novalidate data-escola-id="${e.id}"><h3 class="esp-t-0">Lançar repasse</h3>
      <p class="texto-suave esp-t-0">Registre o recurso que entrou na conta da escola. O valor soma ao recebido e a prestação de contas ganha um novo prazo.</p>
      <div class="form-bloco">${campo({ nome: 'categoria', rotulo: 'Categoria do recurso', obrigatorio: true, opcoes: [['', 'Escolha a categoria'], ...dados.categorias.map((c) => [c, c])] })}
        ${campo({ nome: 'valor', rotulo: 'Valor (R$)', tipo: 'number', obrigatorio: true, atributos: 'min="0.01" step="0.01" inputmode="decimal"' })}
        ${campo({ nome: 'data', rotulo: 'Data do crédito', tipo: 'date', obrigatorio: true, atributos: `max="${hoje}"` })}
        ${campo({ nome: 'prazo', rotulo: 'Prazo para prestar contas', tipo: 'date', obrigatorio: true, dica: 'Em geral de 60 a 90 dias depois do crédito' })}</div>
      <button type="submit" class="botao">${icone('moeda', 20)}Lançar repasse</button></form>`;
}
function decsDe(id) {
  const ds = dados.declaracoes.filter((d) => d.escolaId === id && d.situacao !== 'Rascunho');
  if (!ds.length) return '<h3>Declarações de gastos</h3><p class="texto-suave">A escola ainda não enviou declaração de gastos.</p>';
  return `<h3>Declarações de gastos</h3><ul class="lista-simples">${ds.map((d) => `<li>${esc(d.categoria)} · ${esc(mesAno(d.competencia))} · ${reais(d.total)} ${etiquetaDaDeclaracao(d)}</li>`).join('')}</ul><p class="esp-t-1"><a href="${link('profin/analise.html')}">Abrir a análise das declarações</a></p>`;
}
function detalhe(e) {
  const reps = doEscola(e.id);
  const adim = adimplenciaDaEscola(reps, hoje);
  const lista = (chave) => (notas[chave] || []).map((n) => `<p class="nota-contexto">${esc(n.texto)}<small>${esc(n.por)} · ${dataBR(n.quando)}</small></p>`).join('');
  return `<section aria-labelledby="det-titulo"><h2 id="det-titulo">${esc(e.nome)}</h2>
    <p class="esp-t-0 texto-suave">${esc(e.municipio)} · ${esc(e.dre)}</p><p>${semaforo(adim, { grande: true })}</p>
    <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Recursos de ${esc(e.nome)} por categoria</caption>
      <thead><tr><th scope="col">Categoria</th><th scope="col" class="num">Recebido</th><th scope="col" class="num">Executado</th><th scope="col" class="num">Saldo</th><th scope="col">Prestação de contas</th></tr></thead>
      <tbody>${reps.map((r) => `<tr><td class="titulo-linha"><strong>${esc(r.categoria)}</strong><small>${esc(dados.descricoes[r.categoria])}</small>${lista(`${e.id}|${r.categoria}`)}</td><td class="num valor-reais" data-rotulo="Recebido"><div>${reais(r.recebido)}</div></td><td class="num valor-reais" data-rotulo="Executado"><div>${reais(r.executado)}<small>${numeroBR(percentualExecutado(r))}%</small></div></td><td class="num valor-reais" data-rotulo="Saldo"><div>${reais(saldo(r))}</div></td><td data-rotulo="Prestação"><div>${semaforo(situacaoDaPrestacao(r, hoje))}<small>prazo ${dataBR(r.prestacao.prazo)}</small></div></td></tr>`).join('')}</tbody></table></div>
    ${decsDe(e.id)}
    ${lista(`${e.id}|Geral`) ? `<h3>Anotações gerais da escola</h3>${lista(`${e.id}|Geral`)}` : ''}
    ${repassesDe(e)}
    <form id="form-nota" class="painel-inline esp-t-4" novalidate><h3 class="esp-t-0">Anotação de contexto</h3>
      <p class="texto-suave esp-t-0">Registre o que os documentos não mostram. A anotação fica com a data e o seu nome.</p>
      <div class="campo"><label for="n-cat">Sobre</label><select id="n-cat" class="entrada"><option value="Geral">A escola em geral</option>${dados.categorias.map((c) => `<option>${esc(c)}</option>`).join('')}</select></div>
      <div class="campo"><label for="n-texto">Anotação</label><textarea id="n-texto" class="entrada" rows="3" maxlength="400" aria-describedby="n-erro"></textarea><p class="erro" id="n-erro" role="alert"></p></div>
      <button type="submit" class="botao" data-nota>${icone('formulario', 20)}Salvar anotação</button></form></section>`;
}
function desenhar() {
  const lista = linhas();
  const todas = escolas.map((e) => adimplenciaDaEscola(doEscola(e.id), hoje));
  const recebido = dados.repasses.reduce((n, r) => n + r.recebido, 0), executado = dados.repasses.reduce((n, r) => n + r.executado, 0);
  const conta = (c) => todas.filter((a) => a.chave === c).length;
  const fila = dados.declaracoes.filter((d) => d.situacao === 'Enviada' || d.situacao === 'Em análise').length;
  if (!sel || !escolas.some((e) => e.id === sel)) sel = lista[0]?.e.id ?? escolas[0].id;
  const municipios = [...new Set(escolas.map((e) => e.municipio))];
  main.innerHTML = `
    <header class="heroi">
      <span class="heroi-selo">Financeiro</span>
      <h1>PROFIN · painel por escola</h1>
      <p class="heroi-linha">Prestação de contas de cada escola por categoria de recurso. A prestação em atraso pode suspender o próximo repasse. Dados de ${dataBR(hoje)}.</p>
    </header>
    ${fila ? `<div class="alerta-atencao" role="status">${icone('alerta', 20)}<span>${fila} ${plural(fila, 'declaração de gastos aguarda análise', 'declarações de gastos aguardam análise')}. <a href="${link('profin/analise.html')}">Abrir a fila</a></span></div>` : ''}
    <dl class="resumo-linha">
      <div><dd>${escolas.length}</dd><dt>escolas</dt></div>
      <div><dd>${conta('verde')}</dd><dt>em dia</dt></div>
      <div class="${conta('amarelo') ? 'atencao' : ''}"><dd>${conta('amarelo')}</dd><dt>vencendo em 30 dias</dt></div>
      <div class="${conta('vermelho') ? 'alerta' : ''}"><dd>${conta('vermelho')}</dd><dt>${plural(conta('vermelho'), 'escola com atraso', 'escolas com atraso')}</dt></div>
      <div><dd>${numeroBR((executado / recebido) * 100)}%</dd><dt>executado de ${reais(recebido)}</dt></div></dl>
    <div class="ferramentas-tabela">
      <div class="campo"><label for="f-situacao">Situação</label><select id="f-situacao" class="entrada"><option value="">Todas</option><option value="atraso" ${filtro === 'atraso' ? 'selected' : ''}>Com prestação atrasada</option><option value="vencendo" ${filtro === 'vencendo' ? 'selected' : ''}>Vencendo em 30 dias</option><option value="dia" ${filtro === 'dia' ? 'selected' : ''}>Em dia</option></select></div>
      <div class="campo"><label for="f-municipio">Município</label><select id="f-municipio" class="entrada"><option value="">Todos</option>${municipios.map((m) => `<option ${m === municipio ? 'selected' : ''}>${esc(m)}</option>`).join('')}</select></div></div>
    ${legendaDeNiveis([[{ chave: 'verde', icone: 'ok' }, 'entregue ou no prazo'], [{ chave: 'amarelo', icone: 'alerta' }, 'vence em até 30 dias'], [{ chave: 'vermelho', icone: 'fechar' }, 'atrasada']])}
    ${lista.length ? `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-matriz mapa-calor"><caption class="sr-only">Prestação de contas por escola e categoria de recurso</caption>
      <thead><tr><th scope="col">Escola</th>${dados.categorias.map((c) => `<th scope="col">${esc(c)}</th>`).join('')}</tr></thead>
      <tbody>${lista.map(({ e, adim }) => `<tr><th scope="row"><button type="button" class="botao botao-texto" data-escola="${e.id}" aria-pressed="${e.id === sel}" style="padding-inline:0;text-align:left;justify-content:flex-start">${esc(nomeCurto(e.nome))}</button><small class="texto-suave">${esc(e.municipio)}</small>${semaforo({ ...adim, texto: { vermelho: 'Com atraso', amarelo: 'Vencendo', verde: 'Em dia' }[adim.chave] })}</th>${doEscola(e.id).map((r) => { const s = situacaoDaPrestacao(r, hoje); return celulaDeCalor(r.recebido === 0 ? '—' : `${numeroBR(percentualExecutado(r), 0)}% executado`, s); }).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'escola', 'escolas')} · ordenadas da situação mais grave para a menos grave · escolha uma escola para ver os valores e as anotações</p>` : vazio('Nenhuma escola nesse filtro', 'Mude a situação ou o município para ver outras escolas.')}
    <div id="detalhe">${detalhe(escolas.find((e) => e.id === sel))}</div>`;
}
async function mostrar() {
  try {
    [dados, escolas, notas, hoje] = await Promise.all([profinComDeclaracoes(), carregar('escolas'), conjunto('profin-notas'), dataDeReferencia()]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-situacao') { filtro = e.target.value === 'dia' ? 'dia' : e.target.value; desenhar(); main.querySelector('#f-situacao').focus(); }
  if (e.target.id === 'f-municipio') { municipio = e.target.value; desenhar(); main.querySelector('#f-municipio').focus(); }
});
function redesenharDetalhe(foco = '') {
  main.querySelector('#detalhe').innerHTML = detalhe(escolas.find((x) => x.id === sel));
  if (foco) main.querySelector(foco)?.focus();
}
main.addEventListener('click', (e) => {
  const est = e.target.closest('[data-estornar]');
  if (est) { estornando = est.dataset.estornar; redesenharDetalhe(`#est-${estornando}`); return; }
  if (e.target.closest('[data-cancelar-estorno]')) { const id = estornando; estornando = null; redesenharDetalhe(`[data-estornar="${id}"]`); return; }
  const b = e.target.closest('button[data-escola]');
  if (!b) return;
  sel = b.dataset.escola;
  main.querySelector('#detalhe').innerHTML = detalhe(escolas.find((x) => x.id === sel));
  main.querySelectorAll('[data-escola]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.escola === sel)));
  main.querySelector('#det-titulo').scrollIntoView({ block: 'start' });
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-repasse') return;
  e.preventDefault();
  const form = e.target;
  const f = { ...lerFormulario(form), escolaId: form.dataset.escolaId };
  if (!mostrarErros(form, validarRepasse(f, { escolas, categorias: dados.categorias, hoje }).erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  try {
    await comEspera(e.submitter, async () => {
      const lista = await conjunto('repasses-lancados');
      const id = `RP-2026-${String(1 + Math.max(0, ...lista.map((l) => Number(/(\d+)$/.exec(l.id)?.[1] || 0)))).padStart(4, '0')}`;
      lista.push({ id, escolaId: f.escolaId, categoria: f.categoria, valor: Number(f.valor), data: f.data, prazo: f.prazo, lancadoPor: sessao().nome, lancadoEm: hoje });
      await salvar('repasses-lancados', lista);
      await registrarAcao(sessao().nome, `Lançou repasse de ${reais(Number(f.valor))} (${f.categoria})`, escolas.find((x) => x.id === f.escolaId).nome);
    });
    dados = await profinComDeclaracoes(); desenhar();
    avisar('Repasse lançado. A prestação de contas da categoria tem novo prazo.');
  } catch { avisar('Não foi possível lançar o repasse. Confira a conexão e tente de novo.'); }
});
main.addEventListener('submit', async (e) => {
  const idEstorno = e.target.dataset?.estornarForm;
  if (!idEstorno) return;
  e.preventDefault();
  const form = e.target, motivo = form.querySelector('[name="motivo"]').value;
  const { ok, erros } = validarEstorno({ motivo });
  if (!ok) { form.querySelector('.erro').textContent = erros.motivo; form.querySelector('textarea').setAttribute('aria-invalid', 'true'); form.querySelector('textarea').focus(); return; }
  try {
    await comEspera(e.submitter, async () => {
      const lista = await conjunto('repasses-lancados');
      const alvo = lista.find((l) => l.id === idEstorno);
      if (!alvo) throw new Error('NAO_ENCONTRADO');
      const linha = dados.repasses.find((r) => r.escolaId === alvo.escolaId && r.categoria === alvo.categoria);
      const pode = podeEstornar(alvo, linha || { recebido: 0, executado: 0 });
      if (!pode.ok) { avisar(pode.motivo, 'erro'); throw Object.assign(new Error('BLOQUEADO'), { tratado: true }); }
      await salvar('repasses-lancados', lista.map((l) => (l === alvo ? aplicarEstorno(alvo, { motivo, por: sessao().nome, hoje }) : l)));
      await registrarAcao(sessao().nome, `Estornou repasse de ${reais(alvo.valor)} (${alvo.categoria})`, escolas.find((x) => x.id === alvo.escolaId).nome);
    });
    estornando = null; dados = await profinComDeclaracoes(); desenhar();
    avisar('Repasse estornado. O valor saiu do recebido e o prazo anterior voltou.');
  } catch (err) { if (!err.tratado) avisar('Não foi possível estornar. Confira a conexão e tente de novo.'); }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-nota') return;
  e.preventDefault();
  const texto = main.querySelector('#n-texto'), erro = main.querySelector('#n-erro');
  if (texto.value.trim().length < 10) { erro.textContent = 'Escreva a anotação, com pelo menos 10 letras.'; texto.setAttribute('aria-invalid', 'true'); texto.focus(); return; }
  const chave = `${sel}|${main.querySelector('#n-cat').value}`;
  try {
    await comEspera(e.submitter, async () => {
      const atual = await conjunto('profin-notas');
      atual[chave] = [{ quando: hoje, por: sessao().nome, texto: texto.value.trim() }, ...(atual[chave] || [])];
      await salvar('profin-notas', atual);
      notas = atual;
      await registrarAcao(sessao().nome, 'Anotou contexto no PROFIN', chave.replace('|', ' · '));
    });
    avisar('Anotação salva.');
    main.querySelector('#detalhe').innerHTML = detalhe(escolas.find((x) => x.id === sel));
    main.querySelector('#n-texto').focus();
  } catch { avisar('Não foi possível salvar a anotação. Confira a conexão e tente de novo.'); }
});
mostrar();
