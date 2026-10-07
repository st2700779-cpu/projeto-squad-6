// PROFIN: painel por escola e por categoria de recurso (Custeio, Capital, Merenda, Emenda Parlamentar).
// Cada célula mostra quanto foi executado e a situação da prestação de contas (cor, símbolo e palavra).
// Cada escola tem anotações de contexto: o que os documentos não dizem (atraso por reforma, troca de gestor).
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, numeroBR, dataBR, plural, vazio, avisar, comEspera, icone } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { situacaoDaPrestacao, adimplenciaDaEscola, saldo, percentualExecutado, reais, nomeCurto } from '../regras.js';
import { semaforo, celulaDeCalor, legendaDeNiveis } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/index.html', assistente: false });
const GRAVE = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };
let dados, escolas, notas, hoje, sel = null, filtro = '', municipio = '';

const doEscola = (id) => dados.repasses.filter((r) => r.escolaId === id);
function linhas() {
  return escolas.filter((e) => !municipio || e.municipio === municipio)
    .map((e) => ({ e, adim: adimplenciaDaEscola(doEscola(e.id), hoje) }))
    .filter(({ adim }) => !filtro || (filtro === 'atraso' ? adim.chave === 'vermelho' : filtro === 'vencendo' ? adim.chave === 'amarelo' : adim.chave === 'verde'))
    .sort((a, b) => GRAVE[a.adim.chave] - GRAVE[b.adim.chave] || a.e.nome.localeCompare(b.e.nome, 'pt-BR'));
}
function detalhe(e) {
  const reps = doEscola(e.id);
  const adim = adimplenciaDaEscola(reps, hoje);
  const lista = (chave) => (notas[chave] || []).map((n) => `<p class="nota-contexto">${esc(n.texto)}<small>${esc(n.por)} · ${dataBR(n.quando)}</small></p>`).join('');
  return `<section aria-labelledby="det-titulo"><h2 id="det-titulo">${esc(e.nome)}</h2>
    <p class="esp-t-0 texto-suave">${esc(e.municipio)} · ${esc(e.dre)}</p><p>${semaforo(adim, { grande: true })}</p>
    <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Recursos de ${esc(e.nome)} por categoria</caption>
      <thead><tr><th scope="col">Categoria</th><th scope="col" class="num">Recebido</th><th scope="col" class="num">Executado</th><th scope="col" class="num">Saldo</th><th scope="col">Prestação de contas</th></tr></thead>
      <tbody>${reps.map((r) => `<tr><td class="titulo-linha"><strong>${esc(r.categoria)}</strong><small>${esc(dados.descricoes[r.categoria])}</small>${lista(`${e.id}|${r.categoria}`)}</td><td class="num valor-reais" data-rotulo="Recebido">${reais(r.recebido)}</td><td class="num valor-reais" data-rotulo="Executado">${reais(r.executado)}<small>${numeroBR(percentualExecutado(r))}%</small></td><td class="num valor-reais" data-rotulo="Saldo">${reais(saldo(r))}</td><td data-rotulo="Prestação">${semaforo(situacaoDaPrestacao(r, hoje))}<small>prazo ${dataBR(r.prestacao.prazo)}</small></td></tr>`).join('')}</tbody></table></div>
    ${lista(`${e.id}|Geral`) ? `<h3>Anotações gerais da escola</h3>${lista(`${e.id}|Geral`)}` : ''}
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
  if (!sel || !escolas.some((e) => e.id === sel)) sel = lista[0]?.e.id ?? escolas[0].id;
  const municipios = [...new Set(escolas.map((e) => e.municipio))];
  main.innerHTML = `
    <h1>PROFIN · painel por escola</h1>
    <p class="pagina-descricao">Prestação de contas de cada escola por categoria de recurso. A prestação em atraso pode suspender o próximo repasse. Dados de ${dataBR(hoje)}.</p>
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
    [dados, escolas, notas, hoje] = await Promise.all([carregar('profin'), carregar('escolas'), conjunto('profin-notas'), dataDeReferencia()]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'f-situacao') { filtro = e.target.value === 'dia' ? 'dia' : e.target.value; desenhar(); main.querySelector('#f-situacao').focus(); }
  if (e.target.id === 'f-municipio') { municipio = e.target.value; desenhar(); main.querySelector('#f-municipio').focus(); }
});
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-escola]');
  if (!b) return;
  sel = b.dataset.escola;
  main.querySelector('#detalhe').innerHTML = detalhe(escolas.find((x) => x.id === sel));
  main.querySelectorAll('[data-escola]').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.escola === sel)));
  main.querySelector('#det-titulo').scrollIntoView({ block: 'start' });
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
