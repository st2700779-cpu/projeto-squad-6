// Análise das declarações de gastos (PROFIN): fila por antiguidade, conferência item a item (glosa com motivo) e retorno à
// escola: aprovada, aprovada com ressalvas ou devolvida para correção. A regra fica em dominio/prestacao.js.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, comEspera, dataBR, plural, confirmar } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { reais, saldo } from '../dominio/profin.js';
import { PENDENTES_DE_ANALISE, APROVADAS, TIPOS_DE_RETORNO, validarRetorno, valorAprovado, diasEmEspera, totalDosLancamentos } from '../dominio/prestacao.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { tabelaLancamentos, blocoRetorno, historico, etiquetaDaDeclaracao, mesAno, kb } from '../componentes/declaracao.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/analise.html', assistente: true });
let dados, escolas, equipe, hoje, declaracoes;
let aba = 'fila';
let sel = null;

const ABAS = [
  ['fila', 'Fila de análise', (d) => PENDENTES_DE_ANALISE.includes(d.situacao)],
  ['devolvidas', 'Devolvidas à escola', (d) => d.situacao === 'Devolvida'],
  ['concluidas', 'Concluídas', (d) => APROVADAS.includes(d.situacao)],
  ['todas', 'Todas', (d) => d.situacao !== 'Rascunho']
];
const visiveis = () => declaracoes.filter(ABAS.find((a) => a[0] === aba)[2]);
const nomeDe = (id) => escolas.find((e) => e.id === id)?.nome || id;
const agora = () => `${hoje}T${new Date().toTimeString().slice(0, 8)}`;

async function mostrar() {
  try {
    [dados, escolas, equipe, hoje] = await Promise.all([profinComDeclaracoes(), carregar('escolas'), conjunto('equipe-profin'), dataDeReferencia()]);
    escolas = escolas.filter((e) => !e.exemplo); // as escolas reais com vagas de exemplo não têm dados do PROFIN no protótipo
    declaracoes = dados.declaracoes;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}

function tabela() {
  const lista = [...visiveis()].sort((a, b) => String(a.enviadaEm).localeCompare(String(b.enviadaEm)));
  if (!lista.length) return vazio('Nada por aqui', aba === 'fila' ? 'Nenhuma declaração aguardando análise.' : 'Nenhuma declaração nesta situação.');
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Declarações de gastos</caption>
    <thead><tr><th scope="col">Escola</th><th scope="col">Recurso e mês</th><th scope="col" class="num">Total</th><th scope="col">Enviada</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
    <tbody>${lista.map((d) => { const dias = diasEmEspera(d, hoje); return `<tr><td class="titulo-linha"><strong>${esc(nomeDe(d.escolaId))}</strong><br><span class="texto-suave texto-pequeno">${esc(d.id)}</span></td>
      <td data-rotulo="Recurso"><div>${esc(d.categoria)}<br><span class="texto-suave texto-pequeno">${esc(mesAno(d.competencia))}</span></div></td>
      <td class="num valor-reais" data-rotulo="Total"><div>${reais(d.total)}</div></td>
      <td data-rotulo="Enviada"><div>${dataBR(d.enviadaEm.slice(0, 10))}${PENDENTES_DE_ANALISE.includes(d.situacao) ? `<br><span class="texto-pequeno ${dias > 7 ? 'peso-forte' : 'texto-suave'}">${dias === 0 ? 'hoje' : `há ${dias} ${plural(dias, 'dia', 'dias')}`}</span>` : ''}</div></td>
      <td data-rotulo="Situação"><div>${etiquetaDaDeclaracao(d)}</div></td>
      <td class="acoes"><button type="button" class="botao ${PENDENTES_DE_ANALISE.includes(d.situacao) ? '' : 'botao-secundario'} botao-mini" data-abrir="${d.id}" aria-pressed="${sel === d.id}">${PENDENTES_DE_ANALISE.includes(d.situacao) ? 'Analisar' : 'Ver'}</button></td></tr>`; }).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} ${plural(lista.length, 'declaração', 'declarações')} · as mais antigas primeiro</p>`;
}

function itemDeAnalise(l, i) {
  return `<tr class="item-glosa"><td class="titulo-linha"><strong>${esc(l.descricao)}</strong><br><span class="texto-suave texto-pequeno">${dataBR(l.data)} · ${esc(l.natureza)}</span></td>
    <td data-rotulo="Fornecedor"><div>${esc(l.fornecedor)}<br><span class="texto-suave texto-pequeno">${esc(l.documento)}</span></div></td>
    <td data-rotulo="Comprovante"><div>${icone('documento', 16)} ${esc(l.comprovante.nome)}<br><span class="texto-suave texto-pequeno">${kb(l.comprovante.tamanho)}</span></div></td>
    <td class="num valor-reais" data-rotulo="Valor"><div>${reais(l.valor)}</div></td>
    <td data-rotulo="Conferência"><div><label class="marca-item"><input type="checkbox" data-glosar="${i}"><span>Glosar este gasto</span></label><div id="gm-${i}" hidden>${campo({ nome: `g${i}-motivo`, rotulo: 'Motivo da glosa', atributos: 'maxlength="140" autocomplete="off"' })}</div></div></td></tr>`;
}

function detalhe() {
  const d = declaracoes.find((x) => x.id === sel);
  if (!d) return '';
  const r = dados.repassesBase.find((x) => x.escolaId === d.escolaId && x.categoria === d.categoria);
  const cab = `<header><h2 id="det-titulo" tabindex="-1" class="esp-t-0">${esc(nomeDe(d.escolaId))}: ${esc(d.categoria)}, ${esc(mesAno(d.competencia))} ${etiquetaDaDeclaracao(d)}</h2>
    <dl class="resumo-linha"><div><dd>${reais(d.total)}</dd><dt>declarado em ${d.lancamentos.length} ${plural(d.lancamentos.length, 'gasto', 'gastos')}</dt></div><div><dd>${reais(r.recebido)}</dd><dt>recebido na categoria</dt></div><div><dd>${reais(saldo(r))}</dd><dt>saldo antes desta declaração</dt></div></dl></header>`;
  if (d.situacao === 'Enviada') {
    return `<section id="detalhe" class="form-cadastro" aria-labelledby="det-titulo">${cab}<p>A declaração ainda não foi aberta. Ao iniciar a análise você assume a conferência.</p>${tabelaLancamentos(d)}
      <div class="form-acoes"><button type="button" class="botao" data-iniciar="${d.id}">Iniciar análise</button><button type="button" class="botao botao-texto" id="fechar-detalhe">Fechar</button></div></section>`;
  }
  if (d.situacao === 'Em análise') {
    const ativos = equipe.filter((m) => m.ativo !== false && m.funcao !== 'Apoio administrativo');
    return `<form id="form-retorno" class="form-cadastro" novalidate aria-labelledby="det-titulo" data-id="${d.id}">${cab}
      <h3>Conferência dos gastos</h3>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Gastos para conferir</caption>
        <thead><tr><th scope="col">Gasto</th><th scope="col">Fornecedor e documento</th><th scope="col">Comprovante</th><th scope="col" class="num">Valor</th><th scope="col">Conferência</th></tr></thead>
        <tbody>${d.lancamentos.map(itemDeAnalise).join('')}</tbody></table></div>
      <p class="total-declaracao" aria-live="polite"><span>Valor que será aprovado</span><strong id="valor-aprovado">${reais(d.total)}</strong></p>
      <fieldset class="campo" id="f-tipo" aria-describedby="f-tipo-erro"><legend>Resultado da análise <span class="obrigatorio" aria-hidden="true">*</span></legend>
        <div class="marcas">${Object.entries(TIPOS_DE_RETORNO).map(([v, t]) => `<label class="marca-item"><input type="radio" name="tipo" value="${v}"><span>${v === 'devolvida' ? 'Devolver para correção' : t}<small>${v === 'aprovada' ? 'Todos os gastos aceitos' : v === 'ressalvas' ? 'Aceita o que está certo e glosa os itens com problema' : 'A escola corrige e reenvia'}</small></span></label>`).join('')}</div><p class="erro" id="f-tipo-erro" role="alert"></p></fieldset>
      <div class="form-bloco">${campo({ nome: 'responsavel', rotulo: 'Quem fez a análise', obrigatorio: true, opcoes: [['', 'Escolha na equipe'], ...ativos.map((m) => [m.nome, `${m.nome} (${m.funcao})`])] })}</div>
      <div class="campo"><label for="f-parecer">Parecer <span class="obrigatorio" aria-hidden="true">*</span></label><textarea id="f-parecer" name="parecer" class="entrada" rows="4" maxlength="600" aria-describedby="f-parecer-erro"></textarea><p class="erro" id="f-parecer-erro" role="alert"></p></div>
      <div class="campo" id="campo-pendencia" hidden><label for="f-pendencia">O que a escola precisa corrigir</label><textarea id="f-pendencia" name="pendencia" class="entrada" rows="3" maxlength="400" aria-describedby="f-pendencia-erro"></textarea><span class="dica">Obrigatório quando nenhum gasto é glosado.</span><p class="erro" id="f-pendencia-erro" role="alert"></p></div>
      <p class="erro" id="f-glosas-erro" role="alert"></p>
      <div class="form-acoes"><button type="submit" class="botao">${icone('enviar', 20)}Registrar retorno à escola</button><button type="button" class="botao botao-texto" id="fechar-detalhe">Fechar</button></div></form>`;
  }
  return `<section id="detalhe" class="form-cadastro" aria-labelledby="det-titulo">${cab}${blocoRetorno(d)}${tabelaLancamentos(d)}<details><summary>Histórico</summary>${historico(d)}</details>
    <div class="form-acoes">${APROVADAS.includes(d.situacao) ? `<button type="button" class="botao botao-secundario" data-reabrir="${d.id}">Reabrir análise</button>` : ''}<button type="button" class="botao botao-texto" id="fechar-detalhe">Fechar</button></div></section>`;
}

function desenhar() {
  const todas = declaracoes.filter((d) => d.situacao !== 'Rascunho');
  const n = (f) => todas.filter(f).length;
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Análise das declarações</h1></div>
    <p class="pagina-descricao">As escolas declaram os gastos de cada recurso. Confira os comprovantes, glose o que estiver errado e devolva o retorno: aprovada, com ressalvas ou para correção.</p>
    <dl class="resumo-linha">
      <div class="${n((d) => d.situacao === 'Enviada') ? 'atencao' : ''}"><dd>${n((d) => d.situacao === 'Enviada')}</dd><dt>aguardando início</dt></div>
      <div><dd>${n((d) => d.situacao === 'Em análise')}</dd><dt>em análise</dt></div>
      <div class="${n((d) => d.situacao === 'Devolvida') ? 'alerta' : ''}"><dd>${n((d) => d.situacao === 'Devolvida')}</dd><dt>devolvidas, aguardando a escola</dt></div>
      <div><dd>${n((d) => APROVADAS.includes(d.situacao))}</dd><dt>concluídas</dt></div>
    </dl>
    <div class="abas-estado" role="group" aria-label="Situação das declarações">${ABAS.map(([k, t, f]) => `<button type="button" class="chip" data-aba="${k}" aria-pressed="${aba === k}">${t} (${todas.filter(f).length})</button>`).join('')}</div>
    <div id="tabela-analise">${tabela()}</div>
    <div id="area-detalhe">${detalhe()}</div>`;
}

const abrirDetalhe = () => { main.querySelector('#area-detalhe').innerHTML = detalhe(); main.querySelector('#tabela-analise').innerHTML = tabela(); main.querySelector('#det-titulo')?.scrollIntoView({ block: 'start' }); main.querySelector('#det-titulo')?.focus(); };

async function salvarDeclaracao(d, mudancas, acao) {
  const lista = await conjunto('declaracoes-gastos');
  const i = lista.findIndex((x) => x.id === d.id);
  lista[i] = { ...lista[i], ...mudancas, historico: [...(lista[i].historico || []), { quando: agora(), quem: mudancas._quem || sessao().nome, acao }] };
  delete lista[i]._quem;
  await salvar('declaracoes-gastos', lista);
  await registrarAcao(mudancas._quem || sessao().nome, acao, `${d.id} · ${nomeDe(d.escolaId)}`);
}

main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.aba) { aba = b.dataset.aba; sel = null; desenhar(); main.querySelector(`[data-aba="${aba}"]`).focus(); }
  if (b.dataset.abrir) { sel = b.dataset.abrir; abrirDetalhe(); }
  if (b.id === 'fechar-detalhe') { sel = null; abrirDetalhe(); }
  if (b.dataset.iniciar) {
    const d = declaracoes.find((x) => x.id === b.dataset.iniciar);
    try { await comEspera(b, () => salvarDeclaracao(d, { situacao: 'Em análise' }, 'Iniciou a análise')); await mostrar(); sel = d.id; abrirDetalhe(); avisar('Análise iniciada. Confira os gastos e registre o retorno.'); } catch { avisar('Não foi possível iniciar a análise. Tente de novo.'); }
  }
  if (b.dataset.reabrir) {
    const d = declaracoes.find((x) => x.id === b.dataset.reabrir);
    if (!(await confirmar({ titulo: 'Reabrir a análise?', texto: 'A declaração volta para "Em análise" e o valor aprovado sai do executado até um novo retorno.', botao: 'Reabrir' }))) return;
    try { await salvarDeclaracao(d, { situacao: 'Em análise', retorno: null, retornoAnterior: d.retorno }, 'Reabriu a análise'); await mostrar(); sel = d.id; abrirDetalhe(); avisar('Análise reaberta.'); } catch { avisar('Não foi possível reabrir. Tente de novo.'); }
  }
});
main.addEventListener('change', (e) => {
  const form = e.target.closest('#form-retorno');
  if (!form) return;
  if (e.target.dataset.glosar !== undefined) form.querySelector(`#gm-${e.target.dataset.glosar}`).hidden = !e.target.checked;
  if (e.target.dataset.glosar !== undefined || e.target.name === 'tipo') {
    const d = declaracoes.find((x) => x.id === form.dataset.id);
    const glosados = [...form.querySelectorAll('[data-glosar]:checked')].map((c) => Number(c.dataset.glosar));
    form.querySelector('#valor-aprovado').textContent = reais(totalDosLancamentos(d.lancamentos.filter((_, i) => !glosados.includes(i))));
    const tipo = form.querySelector('[name="tipo"]:checked')?.value;
    form.querySelector('#campo-pendencia').hidden = tipo !== 'devolvida';
  }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-retorno') return;
  e.preventDefault();
  const form = e.target;
  const d = declaracoes.find((x) => x.id === form.dataset.id);
  const f = lerFormulario(form);
  const glosas = [...form.querySelectorAll('[data-glosar]:checked')].map((c) => ({ indice: Number(c.dataset.glosar), motivo: form.querySelector(`#f-g${c.dataset.glosar}-motivo`).value.trim() }));
  const r = validarRetorno({ tipo: f.tipo, responsavel: f.responsavel, parecer: f.parecer, glosas, pendencia: f.pendencia }, d);
  const erros = { ...r.erros };
  if (erros.glosas) { glosas.forEach((g) => { if (g.motivo.length < 5) erros[`g${g.indice}-motivo`] = 'Escreva o motivo, com pelo menos 5 letras.'; }); form.querySelector('#f-glosas-erro').textContent = erros.glosas; delete erros.glosas; } else form.querySelector('#f-glosas-erro').textContent = '';
  if (!mostrarErros(form, erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  const retorno = { tipo: f.tipo, por: f.responsavel, quando: agora(), parecer: f.parecer.trim(), glosas, pendencia: f.tipo === 'devolvida' ? (f.pendencia || '').trim() : '' };
  const acao = { aprovada: 'Aprovou a declaração', ressalvas: 'Aprovou com ressalvas', devolvida: 'Devolveu para correção' }[f.tipo];
  try {
    await comEspera(e.submitter, () => salvarDeclaracao(d, { situacao: TIPOS_DE_RETORNO[f.tipo], retorno, _quem: f.responsavel }, acao));
    sel = null;
    await mostrar();
    avisar(f.tipo === 'devolvida' ? 'Declaração devolvida à escola.' : `Declaração aprovada${f.tipo === 'ressalvas' ? ' com ressalvas' : ''}: o valor entra no executado da escola.`);
  } catch { avisar('Não foi possível registrar o retorno. Confira a conexão e tente de novo.'); }
});
mostrar();
