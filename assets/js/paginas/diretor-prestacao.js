// Prestação de contas da escola (direção): situação por categoria de recurso, declaração dos gastos com comprovantes,
// envio ao PROFIN e retorno da análise (aprovada, com ressalvas ou devolvida para correção).
// A regra de validação e a soma nos painéis ficam em dominio/prestacao.js.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, vazio, comEspera, dataBR, numeroBR, plural, confirmar } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia } from '../dados.js';
import { adimplenciaDaEscola, situacaoDaPrestacao, reais, saldo, percentualExecutado } from '../dominio/profin.js';
import { NATUREZAS, PENDENTES_DE_ANALISE, APROVADAS, validarDeclaracao, totalDosLancamentos, situacaoDaDeclaracao } from '../dominio/prestacao.js';
import { semaforo } from '../componentes/indicadores.js';
import { campo, mostrarErros, limparErros } from '../componentes/formulario.js';
import { tabelaLancamentos, blocoRetorno, historico, etiquetaDaDeclaracao, mesAno, kb } from '../componentes/declaracao.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/prestacao.html', assistente: false });
const escolaId = sessao().escolaId;
let dados, escola, hoje, minhas, repasses, rascunho = null;

const novoLancamento = (categoria) => ({ data: '', descricao: '', fornecedor: '', documento: '', natureza: NATUREZAS[categoria][0], valor: '', comprovante: null });
const agora = () => `${hoje}T${new Date().toTimeString().slice(0, 8)}`;

async function mostrar() {
  try {
    dados = await profinComDeclaracoes();
    [escola, hoje] = await Promise.all([carregar('escolas').then((l) => l.find((e) => e.id === escolaId)), dataDeReferencia()]);
    minhas = dados.declaracoes.filter((d) => d.escolaId === escolaId);
    repasses = dados.repasses.filter((r) => r.escolaId === escolaId);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}

function resumo() {
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Recursos recebidos, gastos e prestação por categoria</caption>
    <thead><tr><th scope="col">Categoria</th><th scope="col" class="num">Recebido</th><th scope="col" class="num">Executado</th><th scope="col" class="num">Saldo</th><th scope="col">Prestação</th><th scope="col">Declaração</th><th scope="col"><span class="sr-only">Ação</span></th></tr></thead>
    <tbody>${repasses.map((r) => {
      const ds = minhas.filter((d) => d.categoria === r.categoria);
      const ultima = [...ds].sort((a, b) => String(b.enviadaEm).localeCompare(String(a.enviadaEm)))[0];
      const devolvida = ds.find((d) => d.situacao === 'Devolvida');
      const rasc = ds.find((d) => d.situacao === 'Rascunho');
      const acao = r.recebido <= 0 ? '' : devolvida ? `<button type="button" class="botao botao-mini" data-corrigir="${devolvida.id}">Corrigir e reenviar</button>` : rasc ? `<button type="button" class="botao botao-mini" data-corrigir="${rasc.id}">Continuar rascunho</button>` : `<button type="button" class="botao botao-secundario botao-mini" data-declarar="${esc(r.categoria)}">Declarar gastos</button>`;
      return `<tr><td class="titulo-linha"><strong>${esc(r.categoria)}</strong><br><span class="texto-suave texto-pequeno">${esc(dados.descricoes[r.categoria] || '')}</span></td>
        <td class="num valor-reais" data-rotulo="Recebido"><div>${reais(r.recebido)}</div></td>
        <td class="num valor-reais" data-rotulo="Executado"><div>${reais(r.executado)}<small>${numeroBR(percentualExecutado(r))}% do recebido</small>${r.emAnalise ? `<small>+ ${reais(r.emAnalise)} em análise</small>` : ''}</div></td>
        <td class="num valor-reais" data-rotulo="Saldo"><div>${reais(saldo(r))}</div></td>
        <td data-rotulo="Prestação"><div>${semaforo(situacaoDaPrestacao(r, hoje))}<small>prazo ${dataBR(r.prestacao.prazo)}</small></div></td>
        <td data-rotulo="Declaração"><div>${ultima ? etiquetaDaDeclaracao(ultima) : r.recebido > 0 ? '<span class="texto-suave">nenhuma enviada</span>' : '<span class="texto-suave">sem repasse</span>'}</div></td>
        <td class="acoes">${acao}</td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function cartaoDeclaracao(d) {
  const s = situacaoDaDeclaracao(d);
  return `<article class="bloco-declaracao cartao-declaracao" aria-labelledby="t-${d.id}">
    <h3 id="t-${d.id}" class="esp-t-0 titulo-cartao">${esc(d.categoria)} · ${esc(mesAno(d.competencia))} ${etiquetaDaDeclaracao(d)}</h3>
    <p class="texto-suave texto-pequeno esp-t-0">${esc(d.id)} · ${reais(d.total)} · ${d.enviadaEm ? `enviada em ${dataBR(d.enviadaEm.slice(0, 10))}` : 'ainda não enviada'}</p>
    ${blocoRetorno(d)}
    <details class="esp-t-3"><summary>Ver os ${d.lancamentos.length} ${plural(d.lancamentos.length, 'gasto', 'gastos')} e o histórico</summary>${tabelaLancamentos(d)}${historico(d)}</details>
    <div class="linha-botoes esp-t-3">${d.situacao === 'Devolvida' || d.situacao === 'Rascunho' ? `<button type="button" class="botao" data-corrigir="${d.id}">${d.situacao === 'Rascunho' ? 'Continuar rascunho' : 'Corrigir e reenviar'}</button>` : ''}${d.situacao === 'Enviada' ? `<button type="button" class="botao botao-secundario" data-retirar="${d.id}">Retirar do PROFIN para editar</button>` : ''}${d.situacao === 'Rascunho' ? `<button type="button" class="botao botao-texto" data-descartar="${d.id}">Descartar rascunho</button>` : ''}</div>
    <span class="sr-only">Situação: ${esc(s.texto)}</span></article>`;
}

function formulario() {
  if (!rascunho) return '';
  const r = repasses.find((x) => x.categoria === rascunho.categoria);
  const outras = minhas.filter((d) => d.categoria === rascunho.categoria && d.id !== rascunho.id);
  const consumido = outras.filter((o) => PENDENTES_DE_ANALISE.includes(o.situacao)).reduce((t, o) => t + o.total, 0);
  const disponivel = saldo(r) - consumido;
  const total = totalDosLancamentos(rascunho.lancamentos.map((l) => ({ valor: Number(l.valor) || 0 })));
  return `<form id="form-declaracao" class="form-cadastro" novalidate aria-labelledby="dec-titulo">
    <h2 id="dec-titulo">${rascunho.id ? `Corrigir a declaração ${esc(rascunho.id)}` : 'Declarar gastos'}: ${esc(rascunho.categoria)}</h2>
    ${rascunho.retornoAnterior ? blocoRetorno({ ...rascunho, retorno: rascunho.retornoAnterior }) : ''}
    <p class="texto-suave esp-t-0">Saldo disponível nesta categoria: <strong>${reais(disponivel)}</strong>. Cada gasto precisa de nota fiscal ou recibo anexado (PDF, JPG ou PNG, até 5 MB). Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios.</p>
    <div class="form-bloco">${campo({ nome: 'competencia', rotulo: 'Mês de referência', tipo: 'month', valor: rascunho.competencia, obrigatorio: true, atributos: `max="${hoje.slice(0, 7)}"` })}</div>
    <div class="lancamentos" id="lancamentos">${rascunho.lancamentos.map((l, i) => bloco(l, i)).join('')}</div>
    <div class="linha-botoes"><button type="button" class="botao botao-secundario" id="add-lancamento">${icone('formulario', 20)}Adicionar gasto</button></div>
    <p class="erro" id="f-geral-erro" role="alert"></p>
    <p class="total-declaracao" aria-live="polite"><span>Total desta declaração</span><strong id="total-decl">${reais(total)}</strong></p>
    <div class="form-acoes"><button type="submit" class="botao" data-envio="enviar">${icone('enviar', 20)}Enviar ao PROFIN</button><button type="submit" class="botao botao-secundario" data-envio="rascunho">Salvar rascunho</button><button type="button" class="botao botao-texto" id="cancelar-declaracao">Cancelar</button></div>
  </form>`;
}
function bloco(l, i) {
  const n = `l${i}`;
  return `<fieldset class="lancamento" data-i="${i}"><header><span>Gasto ${i + 1}</span>${rascunho.lancamentos.length > 1 ? `<button type="button" class="botao botao-texto botao-mini" data-remover="${i}">Remover</button>` : ''}</header>
    ${campo({ nome: `${n}-data`, rotulo: 'Data do gasto', tipo: 'date', valor: l.data, obrigatorio: true, atributos: `max="${hoje}" min="${hoje.slice(0, 4)}-01-01"` })}
    ${campo({ nome: `${n}-valor`, rotulo: 'Valor (R$)', tipo: 'number', valor: l.valor ? String(l.valor) : '', obrigatorio: true, atributos: 'min="0.01" step="0.01" inputmode="decimal"' })}
    <div class="largo">${campo({ nome: `${n}-descricao`, rotulo: 'O que foi comprado ou pago', valor: l.descricao, obrigatorio: true, atributos: 'maxlength="140" autocomplete="off"' })}</div>
    ${campo({ nome: `${n}-fornecedor`, rotulo: 'Fornecedor', valor: l.fornecedor, obrigatorio: true, atributos: 'maxlength="100" autocomplete="off"' })}
    ${campo({ nome: `${n}-documento`, rotulo: 'Nº da nota fiscal ou recibo', valor: l.documento, obrigatorio: true, atributos: 'maxlength="40" autocomplete="off"' })}
    ${campo({ nome: `${n}-natureza`, rotulo: 'Natureza do gasto', valor: l.natureza, obrigatorio: true, opcoes: NATUREZAS[rascunho.categoria] })}
    ${campo({ nome: `${n}-comprovante`, rotulo: 'Comprovante', tipo: 'file', obrigatorio: true, dica: l.comprovante ? `Anexado: ${l.comprovante.nome} (${kb(l.comprovante.tamanho)}). Escolha outro arquivo para trocar.` : 'PDF, JPG ou PNG, até 5 MB', atributos: 'accept=".pdf,.jpg,.jpeg,.png"' })}
  </fieldset>`;
}

function desenhar() {
  const adim = adimplenciaDaEscola(repasses, hoje);
  const pendentes = minhas.filter((d) => ['Devolvida', 'Rascunho'].includes(d.situacao));
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Prestação de contas</h1></div>
    <p class="pagina-descricao">${esc(escola.nome)}. Declare os gastos de cada recurso recebido, anexe os comprovantes e acompanhe o retorno do PROFIN.</p>
    <p class="esp-t-0">${semaforo(adim, { grande: true })}</p>
    ${pendentes.length ? `<div class="alerta-atencao" role="status">${icone('alerta', 20)}<span>${pendentes.filter((d) => d.situacao === 'Devolvida').length ? `${pendentes.filter((d) => d.situacao === 'Devolvida').length} ${plural(pendentes.filter((d) => d.situacao === 'Devolvida').length, 'declaração devolvida', 'declarações devolvidas')} pelo PROFIN: corrija e reenvie.` : 'Há declaração em rascunho para terminar e enviar.'}</span></div>` : ''}
    <h2>Recursos e prestação por categoria</h2>
    ${resumo()}
    <p class="contagem">A prestação em atraso pode suspender o próximo repasse da escola. O valor aprovado pelo PROFIN entra no executado.</p>
    <div id="area-form">${formulario()}</div>
    <h2>Declarações enviadas e retorno do PROFIN</h2>
    ${minhas.length ? `<div class="grade-cartoes">${[...minhas].sort((a, b) => String(b.enviadaEm || b.id).localeCompare(String(a.enviadaEm || a.id))).map(cartaoDeclaracao).join('')}</div>` : vazio('Nenhuma declaração ainda', 'Use "Declarar gastos" na categoria de recurso. O retorno do PROFIN aparece aqui.')}`;
}

// ---------- formulário: leitura e edição dos gastos ----------
function lerDoFormulario() {
  const form = main.querySelector('#form-declaracao');
  if (!form) return;
  rascunho.competencia = form.querySelector('#f-competencia').value;
  rascunho.lancamentos.forEach((l, i) => {
    for (const c of ['data', 'valor', 'descricao', 'fornecedor', 'documento', 'natureza']) l[c] = form.querySelector(`#f-l${i}-${c}`).value;
  });
}
const atualizarTotal = () => { const t = totalDosLancamentos(rascunho.lancamentos.map((l) => ({ valor: Number(l.valor) || 0 }))); const el = main.querySelector('#total-decl'); if (el) el.textContent = reais(t); };
const abrirFormulario = (r) => { rascunho = r; main.querySelector('#area-form').innerHTML = formulario(); const f = main.querySelector('#form-declaracao'); f.querySelector('input').focus(); f.scrollIntoView({ block: 'start' }); };
const redesenharFormulario = (foco) => { main.querySelector('#area-form').innerHTML = formulario(); if (foco) main.querySelector(foco)?.focus(); };

main.addEventListener('input', (e) => {
  if (!rascunho || !e.target.closest('#form-declaracao')) return;
  if (e.target.id.endsWith('-valor')) { lerDoFormulario(); atualizarTotal(); }
});
main.addEventListener('change', (e) => {
  const m = /^f-l(\d+)-comprovante$/.exec(e.target.id);
  if (!m || !rascunho) return;
  const arq = e.target.files[0];
  lerDoFormulario();
  rascunho.lancamentos[Number(m[1])].comprovante = arq ? { nome: arq.name, tamanho: arq.size } : null;
  const dica = main.querySelector(`#${e.target.id}-dica`);
  if (dica) dica.textContent = arq ? `Anexado: ${arq.name} (${kb(arq.size)}). Escolha outro arquivo para trocar.` : 'PDF, JPG ou PNG, até 5 MB';
});
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.declarar) abrirFormulario({ id: null, categoria: b.dataset.declarar, competencia: hoje.slice(0, 7), lancamentos: [novoLancamento(b.dataset.declarar)] });
  if (b.dataset.corrigir) { const d = minhas.find((x) => x.id === b.dataset.corrigir); abrirFormulario({ id: d.id, categoria: d.categoria, competencia: d.competencia, lancamentos: d.lancamentos.map((l) => ({ ...l })), retornoAnterior: d.retorno || null }); }
  if (b.id === 'cancelar-declaracao') { rascunho = null; main.querySelector('#area-form').innerHTML = ''; }
  if (b.id === 'add-lancamento') { lerDoFormulario(); rascunho.lancamentos.push(novoLancamento(rascunho.categoria)); redesenharFormulario(`#f-l${rascunho.lancamentos.length - 1}-data`); }
  if (b.dataset.remover) { lerDoFormulario(); rascunho.lancamentos.splice(Number(b.dataset.remover), 1); redesenharFormulario('#add-lancamento'); }
  if (b.dataset.retirar) {
    const d = minhas.find((x) => x.id === b.dataset.retirar);
    if (!(await confirmar({ titulo: 'Retirar a declaração do PROFIN?', texto: 'Ela volta para rascunho e sai da fila de análise. Depois de editar, é preciso enviar de novo.', botao: 'Retirar' }))) return;
    try { await gravar(d, { situacao: 'Rascunho', enviadaEm: null }, 'Retirou a declaração da fila do PROFIN'); await mostrar(); avisar('Declaração retirada. Edite e envie de novo.'); } catch { avisar('Não foi possível retirar a declaração. Tente de novo.'); }
  }
  if (b.dataset.descartar) {
    const d = minhas.find((x) => x.id === b.dataset.descartar);
    if (!(await confirmar({ titulo: 'Descartar o rascunho?', texto: 'O rascunho é apagado e não pode ser recuperado.', botao: 'Descartar', perigo: true }))) return;
    try { const lista = (await conjunto('declaracoes-gastos')).filter((x) => x.id !== d.id); await salvar('declaracoes-gastos', lista); await registrarAcao(sessao().nome, 'Descartou o rascunho da declaração', d.id); await mostrar(); avisar('Rascunho descartado.'); } catch { avisar('Não foi possível descartar. Tente de novo.'); }
  }
});

// Atualiza uma declaração existente (ou acrescenta uma nova) e registra no histórico dela.
async function gravar(d, mudancas, acao) {
  const lista = await conjunto('declaracoes-gastos');
  const i = lista.findIndex((x) => x.id === d.id);
  const nova = { ...(i >= 0 ? lista[i] : d), ...mudancas, historico: [...((i >= 0 ? lista[i] : d).historico || []), { quando: agora(), quem: sessao().nome, acao }] };
  if (i >= 0) lista[i] = nova; else lista.push(nova);
  await salvar('declaracoes-gastos', lista);
  await registrarAcao(sessao().nome, acao, `${nova.id} · ${nova.categoria}`);
  return nova;
}
const proximoId = (lista) => `DG-2026-${String(1 + Math.max(0, ...lista.map((d) => Number(/(\d+)$/.exec(d.id)?.[1] || 0)))).padStart(4, '0')}`;

main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-declaracao') return;
  e.preventDefault();
  const form = e.target;
  const enviar = e.submitter?.dataset.envio === 'enviar';
  lerDoFormulario();
  const lancs = rascunho.lancamentos.map((l) => ({ ...l, valor: l.valor === '' ? NaN : Number(l.valor) }));
  const outras = minhas.filter((d) => d.categoria === rascunho.categoria);
  const repasse = repasses.find((x) => x.categoria === rascunho.categoria);
  limparErros(form);
  if (enviar) {
    const v = validarDeclaracao({ categoria: rascunho.categoria, competencia: rascunho.competencia, lancamentos: lancs }, { repasse, outras, hoje, idAtual: rascunho.id });
    const erros = {};
    if (/^\d{4}-\d{2}$/.test(rascunho.competencia) === false) erros.competencia = 'Escolha o mês de referência.';
    v.porLinha.forEach((er, i) => Object.entries(er).forEach(([c, msg]) => { erros[`l${i}-${c}`] = msg; }));
    const geral = v.geral.filter((m) => !/mês de referência/.test(m));
    if (!v.ok) {
      mostrarErros(form, erros);
      form.querySelector('#f-geral-erro').textContent = geral.join(' ');
      if (geral.length && !Object.keys(erros).length) form.querySelector('#f-geral-erro').scrollIntoView({ block: 'center' });
      avisar('A declaração não foi enviada. Confira os avisos em vermelho.', 'erro'); return;
    }
  } else if (!rascunho.lancamentos.some((l) => l.descricao || l.valor || l.documento)) { form.querySelector('#f-geral-erro').textContent = 'Preencha ao menos um gasto antes de salvar o rascunho.'; return; }
  try {
    await comEspera(e.submitter, async () => {
      const lista = await conjunto('declaracoes-gastos');
      const base = {
        id: rascunho.id || proximoId(lista), escolaId, categoria: rascunho.categoria, competencia: rascunho.competencia,
        lancamentos: lancs.map((l) => ({ ...l, valor: Number.isFinite(l.valor) ? l.valor : 0 })), total: totalDosLancamentos(lancs.map((l) => ({ valor: Number.isFinite(l.valor) ? l.valor : 0 }))),
        situacao: enviar ? 'Enviada' : 'Rascunho', enviadaEm: enviar ? agora() : null, enviadaPor: sessao().nome, retorno: null
      };
      const anterior = lista.find((x) => x.id === base.id);
      if (anterior?.retorno) base.retornoAnterior = anterior.retorno;
      await gravar(anterior ? { ...anterior } : { ...base, historico: [] }, base, enviar ? (anterior?.situacao === 'Devolvida' ? 'Corrigiu e reenviou ao PROFIN' : 'Enviou a declaração ao PROFIN') : 'Salvou o rascunho');
    });
    rascunho = null;
    await mostrar();
    avisar(enviar ? 'Declaração enviada ao PROFIN. O retorno aparece aqui.' : 'Rascunho salvo.');
  } catch { avisar('Não foi possível salvar a declaração. Confira a conexão e tente de novo.'); mostrar(); }
});
mostrar();
