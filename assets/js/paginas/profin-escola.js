// PROFIN › Ficha da escola: o lugar consolidado de cada escola. Saldo por recurso, o que falta (prestação, documentos recusados,
// rascunhos, saldo parado), como a escola gasta, declarações, contexto escolar e linha do tempo (componentes/ficha-profin.js).
// Aqui a equipe também lança e estorna repasses e escreve as anotações (pendência ou contexto, interna ou compartilhada com a
// gestão), e marca a pendência anotada como resolvida. Abre com ?escola=ID (vem do painel).
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, comEspera, dataBR } from '../ui.js';
import { conjunto, salvar, registrarAcao } from '../dados.js';
import { profinComDeclaracoes } from '../prestacao-dados.js';
import { reais, adimplenciaDaEscola, nomeCurto } from '../regras.js';
import { validarRepasse, podeEstornar, validarEstorno, aplicarEstorno } from '../dominio/prestacao.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { carregarFicha, desempenhoOpcional, fichaHtml, pendenciasDe, notasVisiveis } from '../componentes/ficha-profin.js';
import { pendenciasAbertas } from '../dominio/notas-profin.js';
import { formularioNotaHtml, salvarNotaDoFormulario, alternarNotaSalva } from '../componentes/notas-profin.js';

const main = await iniciar({ perfil: 'profin', pagina: 'profin/escola.html', assistente: false });
const GRAVE = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };
let base, escolas, sel = new URLSearchParams(location.search).get('escola'), estornando = null, desempenho = null;

async function mostrar() {
  try {
    base = await carregarFicha();
    escolas = base.escolas.filter((e) => !e.exemplo); // as escolas reais com vagas de exemplo não têm dados do PROFIN no protótipo
    const ordem = escolas.map((e) => ({ e, a: adimplenciaDaEscola(base.dados.repasses.filter((r) => r.escolaId === e.id), base.hoje) })).sort((x, y) => GRAVE[x.a.chave] - GRAVE[y.a.chave] || x.e.nome.localeCompare(y.e.nome, 'pt-BR'));
    escolas = ordem.map((x) => x.e);
    if (!escolas.some((e) => e.id === sel)) sel = escolas[0]?.id;
    desempenho = await desempenhoOpcional(sel);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const doEscola = (id) => base.dados.repasses.filter((r) => r.escolaId === id);

function blocoRepasses() {
  const ls = (base.dados.lancados || []).filter((l) => l.escolaId === sel);
  const linhaDe = (l) => {
    if (l.estornadoEm) return `<li class="repasse-estornado"><div>${esc(l.categoria)} · ${reais(l.valor)} · crédito em ${dataBR(l.data)} ${etiqueta('Estornado', 'neutra')}<small class="repasse-nota">${dataBR(l.estornadoEm)} · ${esc(l.estornadoPor)} · motivo: ${esc(l.estornoMotivo)}</small></div></li>`;
    const pode = podeEstornar(l, doEscola(sel).find((r) => r.categoria === l.categoria) || { recebido: 0, executado: 0 });
    const acao = estornando === l.id
      ? `<form class="form-recusa" data-estornar-form="${esc(l.id)}" novalidate><label for="est-${esc(l.id)}">Motivo do estorno <span class="dica">Fica no histórico.</span></label><textarea id="est-${esc(l.id)}" name="motivo" class="entrada" rows="2" maxlength="300" aria-describedby="est-${esc(l.id)}-erro"></textarea><p class="erro" id="est-${esc(l.id)}-erro" role="alert"></p><div class="linha-botoes"><button type="submit" class="botao botao-perigo botao-mini">Confirmar estorno</button><button type="button" class="botao botao-secundario botao-mini" data-cancelar-estorno>Cancelar</button></div></form>`
      : pode.ok ? `<button type="button" class="botao botao-secundario botao-mini" data-estornar="${esc(l.id)}" aria-label="Estornar repasse de ${reais(l.valor)} (${esc(l.categoria)})">Estornar</button>` : `<small class="texto-suave">${esc(pode.motivo)}</small>`;
    return `<li><div>${esc(l.categoria)} · ${reais(l.valor)} · crédito em ${dataBR(l.data)} · prestar contas até ${dataBR(l.prazo)} <span class="texto-suave texto-pequeno">(${esc(l.lancadoPor)})</span><div class="esp-t-1">${acao}</div></div></li>`;
  };
  return `<h2>Repasses lançados</h2>${ls.length ? `<ul class="lista-simples">${ls.map(linhaDe).join('')}</ul>` : '<p class="texto-suave">Nenhum repasse lançado por aqui. Os valores vêm da base inicial do PROFIN.</p>'}
    <form id="form-repasse" class="painel-inline esp-t-2" novalidate><h3 class="esp-t-0">Lançar repasse</h3>
      <p class="texto-suave esp-t-0">Registre o recurso que entrou na conta da escola. O valor soma ao recebido e a prestação de contas ganha um novo prazo.</p>
      <div class="form-bloco">${campo({ nome: 'categoria', rotulo: 'Categoria do recurso', obrigatorio: true, opcoes: [['', 'Escolha a categoria'], ...base.dados.categorias.map((c) => [c, c])] })}
        ${campo({ nome: 'valor', rotulo: 'Valor (R$)', obrigatorio: true, dica: 'Digite só os números: 1500000 vira 15.000,00', atributos: 'data-formato="dinheiro"' })}
        ${campo({ nome: 'data', rotulo: 'Data do crédito', tipo: 'date', obrigatorio: true, atributos: `max="${base.hoje}"` })}
        ${campo({ nome: 'prazo', rotulo: 'Prazo para prestar contas', tipo: 'date', obrigatorio: true, dica: 'Em geral de 60 a 90 dias depois do crédito' })}</div>
      <button type="submit" class="botao">${icone('moeda', 20)}Lançar repasse</button></form>`;
}
function desenhar() {
  const pend = pendenciasDe(base, sel).length + pendenciasAbertas(notasVisiveis(base, sel, { tecnico: true })).length;
  const extra = `<div class="linha-botoes"><a class="botao botao-secundario" href="${link('profin/index.html')}">${icone('voltar', 20)}Painel</a><a class="botao" href="${link('profin/analise.html')}">${icone('lista', 20)}Analisar declarações</a></div>`;
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Ficha da escola</h1></div>
    <p class="pagina-descricao">Tudo o que acontece com o dinheiro da escola num lugar só: saldo, o que falta, como gasta, as declarações, o contexto e a linha do tempo. A direção da escola vê a mesma ficha, com as anotações que o PROFIN compartilhou.</p>
    <div class="ferramentas-tabela"><div class="campo"><label for="escola">Escola</label><select id="escola" class="entrada">${escolas.map((e) => `<option value="${e.id}" ${e.id === sel ? 'selected' : ''}>${esc(nomeCurto(e.nome))} · ${esc(e.municipio)}</option>`).join('')}</select></div>
      <p class="texto-suave texto-pequeno esp-b-0">${pend ? `${pend} ${pend === 1 ? 'pendência' : 'pendências'} nesta escola` : 'Nenhuma pendência nesta escola'}</p></div>
    <section aria-labelledby="ficha-titulo">${fichaHtml(base, sel, { desempenho, tecnico: true, cabecalhoExtra: extra, acaoDeclaracao: (p) => `<p class="esp-t-1 esp-b-0"><a href="${link(`profin/analise.html?declaracao=${encodeURIComponent(p.declaracaoId)}`)}">Abrir a declaração ${esc(p.declaracaoId)}</a></p>` })}
      <div class="painel-inline esp-t-4">${formularioNotaHtml(sel, base.dados.categorias)}</div>
      ${blocoRepasses()}</section>`;
}

async function recarregarDados() { base.dados = await profinComDeclaracoes(); }
main.addEventListener('change', async (e) => {
  if (e.target.id !== 'escola') return;
  sel = e.target.value; estornando = null;
  history.replaceState(null, '', `?escola=${encodeURIComponent(sel)}`);
  desempenho = await desempenhoOpcional(sel);
  desenhar(); main.querySelector('#escola').focus();
});
main.addEventListener('click', async (e) => {
  const res = e.target.closest('[data-resolver]');
  if (res) {
    const chave = res.dataset.resolver, indice = Number(res.dataset.indice);
    const ref = (base.notas[chave] || [])[indice];
    if (!ref) return;
    try {
      const r = await comEspera(res, () => alternarNotaSalva(chave, indice, ref, { por: sessao().nome, hoje: base.hoje, nomeDaEscola: escolas.find((x) => x.id === sel).nome }));
      base.notas = r.notas; desenhar();
      main.querySelector(`[data-resolver="${CSS.escape(chave)}"][data-indice="${indice}"]`)?.focus();
      avisar(r.resolvida ? 'Pendência marcada como resolvida.' : 'Pendência reaberta.');
    } catch { avisar('Não foi possível atualizar a pendência. Confira a conexão e tente de novo.'); }
    return;
  }
  const est = e.target.closest('[data-estornar]');
  if (est) { estornando = est.dataset.estornar; desenhar(); main.querySelector(`#est-${CSS.escape(estornando)}`)?.focus(); return; }
  if (e.target.closest('[data-cancelar-estorno]')) { const id = estornando; estornando = null; desenhar(); main.querySelector(`[data-estornar="${CSS.escape(id)}"]`)?.focus(); }
});
main.addEventListener('submit', async (e) => {
  const form = e.target;
  e.preventDefault();
  const nomeDaEscola = () => escolas.find((x) => x.id === sel).nome;
  if (form.id === 'form-repasse') {
    const f = { ...lerFormulario(form), escolaId: sel };
    if (!mostrarErros(form, validarRepasse(f, { escolas, categorias: base.dados.categorias, hoje: base.hoje }).erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    try {
      await comEspera(e.submitter, async () => {
        const lista = await conjunto('repasses-lancados');
        const id = `RP-2026-${String(1 + Math.max(0, ...lista.map((l) => Number(/(\d+)$/.exec(l.id)?.[1] || 0)))).padStart(4, '0')}`;
        lista.push({ id, escolaId: sel, categoria: f.categoria, valor: Number(f.valor), data: f.data, prazo: f.prazo, lancadoPor: sessao().nome, lancadoEm: base.hoje });
        await salvar('repasses-lancados', lista);
        await registrarAcao(sessao().nome, `Lançou repasse de ${reais(Number(f.valor))} (${f.categoria})`, nomeDaEscola());
      });
      await recarregarDados(); desenhar(); avisar('Repasse lançado. A prestação de contas da categoria tem novo prazo.');
    } catch { avisar('Não foi possível lançar o repasse. Confira a conexão e tente de novo.'); }
    return;
  }
  const idEstorno = form.dataset?.estornarForm;
  if (idEstorno) {
    const motivo = form.querySelector('[name="motivo"]').value;
    const { ok, erros } = validarEstorno({ motivo });
    if (!ok) { form.querySelector('.erro').textContent = erros.motivo; form.querySelector('textarea').setAttribute('aria-invalid', 'true'); form.querySelector('textarea').focus(); return; }
    try {
      await comEspera(e.submitter, async () => {
        const lista = await conjunto('repasses-lancados');
        const alvo = lista.find((l) => l.id === idEstorno);
        if (!alvo) throw new Error('NAO_ENCONTRADO');
        const linha = base.dados.repasses.find((r) => r.escolaId === alvo.escolaId && r.categoria === alvo.categoria);
        const pode = podeEstornar(alvo, linha || { recebido: 0, executado: 0 });
        if (!pode.ok) { avisar(pode.motivo, 'erro'); throw Object.assign(new Error('BLOQUEADO'), { tratado: true }); }
        await salvar('repasses-lancados', lista.map((l) => (l === alvo ? aplicarEstorno(alvo, { motivo, por: sessao().nome, hoje: base.hoje }) : l)));
        await registrarAcao(sessao().nome, `Estornou repasse de ${reais(alvo.valor)} (${alvo.categoria})`, nomeDaEscola());
      });
      estornando = null; await recarregarDados(); desenhar(); avisar('Repasse estornado. O valor saiu do recebido e o prazo anterior voltou.');
    } catch (err) { if (!err.tratado) avisar('Não foi possível estornar. Confira a conexão e tente de novo.'); }
    return;
  }
  if (form.classList.contains('form-nota')) {
    try {
      const r = await comEspera(e.submitter, () => salvarNotaDoFormulario(form, { categorias: base.dados.categorias, por: sessao().nome, hoje: base.hoje, nomeDaEscola: nomeDaEscola() }));
      if (!r.ok) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
      base.notas = r.notas; desenhar(); avisar('Anotação salva.');
      main.querySelector(`#nn-${CSS.escape(sel)}-texto`)?.focus();
    } catch { avisar('Não foi possível salvar a anotação. Confira a conexão e tente de novo.'); }
  }
});
mostrar();
