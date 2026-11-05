// Cadastros da rede (SEED central): as listas que o resto do portal usa. Nada fica escrito no código.
//  - Níveis e séries: níveis de ensino (Educação Infantil, Fundamental, Médio, EJA, educação profissional...), como cada um se divide
//    (anos, séries, etapas ou módulos), as séries de cada um, a carga mínima e se aparece na matrícula on-line. Os níveis viram as
//    caixas de marcar do cadastro de escola, as opções de curso e as séries da matrícula, das turmas e das vagas.
//  - Tipos de vínculo: efetivo, contratado temporário (PSS), comissionado... Usados no cadastro de professor e da equipe do PROFIN.
// O que está em uso não é apagado (só desativado). As regras ficam em dominio/niveis.js e dominio/vinculos.js.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, comEspera, confirmar, plural } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, turmasDaRede, matriculas, professoresComInativos } from '../dados.js';
import { NOMENCLATURAS, aplicarNiveis, resumoDoNivel, validarNivel, montarNivel, aplicarEdicaoDeNivel, sugerirSerie, validarSerieNova, usoDaSerie, podeRemoverSerie, usoDoNivel, podeApagarNivel, nomeDaDivisao } from '../dominio/niveis.js';
import { aplicarVinculos, validarVinculo, montarVinculo, usoDoVinculo, podeApagarVinculo, podeDesativarVinculo } from '../dominio/vinculos.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';

const main = await iniciar({ perfil: 'rede', pagina: 'rede/cadastros.html', assistente: true });
const ABAS = [['niveis', 'Níveis e séries'], ['vinculos', 'Tipos de vínculo']];
let aba = new URLSearchParams(location.search).get('aba') === 'vinculos' ? 'vinculos' : 'niveis';
let niveis, vinculos, atos, cursos, turmas, pedidos, professores, equipe;
let formNivel = null; // null | 'novo' | id do nível em edição
let formVinculo = null; // null | 'novo' | id do vínculo em edição

async function mostrar() {
  try {
    [niveis, vinculos, atos, cursos, turmas, pedidos, professores, equipe] = await Promise.all([conjunto('niveis'), conjunto('vinculos'), carregar('atos'), conjunto('cursos'), turmasDaRede(), matriculas(), professoresComInativos(), conjunto('equipe-profin')]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const uso = (serie) => usoDaSerie(serie, { turmas, atos, pedidos });
const nomeDoNivel = (id) => niveis.find((n) => n.id === id)?.curto || '';
const quem = () => sessao()?.nome || 'SEED';

// ---------------- Níveis ----------------
function formularioNivel() {
  if (!formNivel) return '';
  const n = formNivel === 'novo' ? null : niveis.find((x) => x.id === formNivel);
  const p = 'nv';
  return `<form id="form-nivel" class="form-cadastro" novalidate aria-labelledby="nv-titulo">
    <h2 id="nv-titulo">${n ? `Editar nível: ${esc(n.curto)}` : 'Cadastrar nível de ensino'}</h2>
    <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios.${n ? ' O nome completo não muda: ele está nos atos autorizativos e nos cursos.' : ' Depois de cadastrar, acrescente as séries (ou anos, etapas, módulos) do nível.'}</p>
    <fieldset class="form-bloco"><legend>Nível</legend>
      <div class="largo">${n ? `<div class="campo"><span class="rotulo-fixo">Nome completo</span><p class="valor-fixo">${esc(n.etapa)}</p></div>` : campo({ prefixo: p, nome: 'etapa', rotulo: 'Nome completo', obrigatorio: true, dica: 'Exemplo: EJA — Ensino Fundamental. Aparece nos atos e nos cursos.', atributos: 'maxlength="80" autocomplete="off"' })}</div>
      ${campo({ prefixo: p, nome: 'curto', rotulo: 'Nome curto', valor: n?.curto || '', obrigatorio: true, dica: 'Para listas e tabelas. Exemplo: EJA Fundamental', atributos: 'maxlength="30" autocomplete="off"' })}
      ${campo({ prefixo: p, nome: 'nomenclatura', rotulo: 'O nível se divide em', valor: n?.nomenclatura || '', obrigatorio: true, dica: 'Muda só o nome: anos (1º ano), séries (1ª série), etapas (EJA) ou módulos (cursos técnicos).', opcoes: [['', 'Escolha'], ...Object.entries(NOMENCLATURAS).map(([k, v]) => [k, `${v.rotulo} (${v.exemplo})`])] })}
      ${campo({ prefixo: p, nome: 'horasMinimas', rotulo: 'Carga mínima por ano (horas)', valor: String(n?.horasMinimas ?? 800), tipo: 'number', obrigatorio: true, dica: '800 h no Fundamental e na EJA; 1.000 h no Médio', atributos: 'min="400" max="2000" step="1" inputmode="numeric"' })}
      ${campo({ prefixo: p, nome: 'aulasPadrao', rotulo: 'Aulas por semana (padrão)', valor: String(n?.aulasPadrao ?? 25), tipo: 'number', obrigatorio: true, dica: 'Valor inicial da carga horária de cada série, de 15 a 40', atributos: 'min="15" max="40" step="1" inputmode="numeric"' })}
      ${campo({ prefixo: p, nome: 'continuaEm', rotulo: 'Depois da última série, o estudante vai para', valor: n?.continuaEm || '', dica: 'Usado na rematrícula. Exemplo: Anos Finais → Ensino Médio', opcoes: [['', 'Nenhum (o nível termina aqui)'], ...niveis.filter((x) => x.id !== n?.id).map((x) => [x.id, x.curto])] })}
      <div class="largo">${campo({ prefixo: p, nome: 'observacao', rotulo: 'Observação', valor: n?.observacao || '', dica: 'Opcional, até 200 letras', atributos: 'maxlength="200" autocomplete="off"' })}</div>
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}${n ? 'Salvar nível' : 'Cadastrar nível'}</button><button type="button" class="botao botao-secundario" data-cancelar-nivel>Cancelar</button></div></form>`;
}
function cartaoNivel(n) {
  const u = usoDoNivel(n, { atos, cursos, turmas });
  const divisao = nomeDaDivisao(n);
  const series = n.series.map((s) => {
    const us = uso(s);
    const detalhe = us.total ? `${us.turmas} ${plural(us.turmas, 'turma', 'turmas')}` : 'sem uso';
    return `<li><span><strong>${esc(s)}</strong> <span class="texto-suave texto-pequeno">${esc(detalhe)}</span></span>${us.total ? '' : `<button type="button" class="botao botao-texto botao-mini" data-tirar-serie="${esc(n.id)}" data-serie="${esc(s)}" aria-label="Tirar ${esc(s)} de ${esc(n.curto)}">Tirar</button>`}</li>`;
  }).join('');
  const idCampo = `nova-serie-${n.id}`;
  return `<article class="bloco-nivel${n.ativo === false ? ' desativado' : ''}" aria-labelledby="titulo-${esc(n.id)}">
    <div class="linha-entre"><h3 id="titulo-${esc(n.id)}" class="esp-b-0">${esc(n.curto)} <span class="texto-suave peso-normal texto-pequeno">${esc(n.etapa)}</span></h3>
      <div>${n.ativo === false ? etiqueta('Desativado', 'neutra') : etiqueta('Ativo', 'ok')} ${n.matricula && n.ativo !== false ? etiqueta('Na matrícula on-line', 'info') : ''}</div></div>
    <p class="texto-pequeno esp-t-1">Divide-se em <strong>${esc(NOMENCLATURAS[n.nomenclatura]?.plural || 'séries')}</strong> (${esc(resumoDoNivel(n))}) · carga mínima de ${n.horasMinimas} h por ano · ${n.aulasPadrao} aulas por semana no padrão${n.continuaEm ? ` · depois: ${esc(nomeDoNivel(n.continuaEm))}` : ''}</p>
    <p class="texto-pequeno texto-suave esp-t-0">${u.escolas} ${plural(u.escolas, 'escola autorizada', 'escolas autorizadas')} · ${u.cursos} ${plural(u.cursos, 'curso', 'cursos')} · ${u.turmas} ${plural(u.turmas, 'turma', 'turmas')}${n.observacao ? ` · ${esc(n.observacao)}` : ''}</p>
    ${n.series.length ? `<ul class="lista-simples lista-series" aria-label="${esc(NOMENCLATURAS[n.nomenclatura]?.rotulo || 'Séries')} de ${esc(n.curto)}">${series}</ul>` : `<p class="alerta-info">${icone('info', 20)}<span>Nenhum(a) ${esc(divisao)} cadastrado(a). Acrescente abaixo.</span></p>`}
    <form class="linha-campo esp-t-3" data-form-serie="${esc(n.id)}" novalidate>
      <div class="campo esp-b-0"><label for="${idCampo}">Acrescentar ${esc(divisao)}</label><input id="${idCampo}" name="serie" class="entrada" value="${esc(sugerirSerie(n, niveis.flatMap((x) => x.series)))}" maxlength="40" autocomplete="off" aria-describedby="${idCampo}-erro"><p class="erro" id="${idCampo}-erro" role="alert"></p></div>
      <button type="submit" class="botao botao-secundario">${icone('mais', 20)}Acrescentar</button>
    </form>
    <div class="linha-botoes esp-t-3">
      <label class="marca-item"><input type="checkbox" data-matricula="${esc(n.id)}" ${n.matricula ? 'checked' : ''} ${n.ativo === false ? 'disabled' : ''}><span>Aparece na matrícula on-line<small>As famílias escolhem estas ${esc(NOMENCLATURAS[n.nomenclatura]?.plural || 'séries')} no pedido de vaga</small></span></label>
    </div>
    <div class="linha-botoes esp-t-2">
      <button type="button" class="botao botao-secundario botao-mini" data-editar-nivel="${esc(n.id)}">Editar</button>
      <button type="button" class="botao botao-secundario botao-mini" data-alternar-nivel="${esc(n.id)}">${n.ativo === false ? 'Ativar' : 'Desativar'}</button>
      ${u.total ? '' : `<button type="button" class="botao botao-texto botao-mini" data-apagar-nivel="${esc(n.id)}">Apagar nível</button>`}
    </div></article>`;
}
function abaNiveis() {
  const ativos = niveis.filter((n) => n.ativo !== false);
  const naMatricula = ativos.filter((n) => n.matricula).flatMap((n) => n.series);
  return `<dl class="resumo-linha">
      <div><dd>${ativos.length}</dd><dt>${plural(ativos.length, 'nível ativo', 'níveis ativos')}</dt></div>
      <div><dd>${ativos.reduce((t, n) => t + n.series.length, 0)}</dd><dt>séries, anos, etapas e módulos</dt></div>
      <div><dd>${naMatricula.length}</dd><dt>na matrícula on-line</dt></div>
    </dl>
    <p class="texto-suave">A lista de níveis é a fonte do cadastro de escola (caixas de marcar), dos cursos, da matrícula, das turmas e das vagas. Série em uso não sai do nível; nível em uso não é apagado, só desativado (some dos cadastros novos e o que já existe continua valendo).</p>
    <div class="linha-botoes esp-b-3"><button type="button" class="botao" data-novo-nivel>${icone('mais', 20)}Cadastrar nível</button></div>
    ${formularioNivel()}
    <div class="lista-niveis">${niveis.map(cartaoNivel).join('')}</div>`;
}

// ---------------- Vínculos ----------------
function formularioVinculo() {
  if (!formVinculo) return '';
  const v = formVinculo === 'novo' ? null : vinculos.find((x) => x.id === formVinculo);
  const emUso = v ? usoDoVinculo(v.nome, { professores, equipe }).total : 0;
  return `<form id="form-vinculo" class="form-cadastro" novalidate aria-labelledby="vc-titulo">
    <h2 id="vc-titulo">${v ? `Editar vínculo: ${esc(v.nome)}` : 'Cadastrar tipo de vínculo'}</h2>
    ${emUso ? `<p class="texto-suave esp-t-0">${emUso} ${plural(emUso, 'pessoa tem', 'pessoas têm')} este vínculo: o nome não muda, só a descrição.</p>` : ''}
    <fieldset class="form-bloco"><legend>Vínculo</legend>
      ${emUso ? `<input type="hidden" name="nome" value="${esc(v.nome)}"><div class="campo"><span class="rotulo-fixo">Nome</span><p class="valor-fixo">${esc(v.nome)}</p></div>` : campo({ prefixo: 'vc', nome: 'nome', rotulo: 'Nome', valor: v?.nome || '', obrigatorio: true, dica: 'Exemplo: Contratado temporário (PSS)', atributos: 'maxlength="50" autocomplete="off"' })}
      <div class="largo">${campo({ prefixo: 'vc', nome: 'descricao', rotulo: 'Descrição', valor: v?.descricao || '', dica: 'Opcional, até 160 letras', atributos: 'maxlength="160" autocomplete="off"' })}</div>
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}${v ? 'Salvar' : 'Cadastrar vínculo'}</button><button type="button" class="botao botao-secundario" data-cancelar-vinculo>Cancelar</button></div></form>`;
}
function abaVinculos() {
  const linhas = vinculos.map((v) => {
    const u = usoDoVinculo(v.nome, { professores, equipe });
    return `<tr><td class="titulo-linha"><strong>${esc(v.nome)}</strong>${v.descricao ? `<br><span class="texto-suave texto-pequeno">${esc(v.descricao)}</span>` : ''}</td>
      <td class="num" data-rotulo="Professores">${u.professores}</td><td class="num" data-rotulo="Equipe do PROFIN">${u.equipe}</td>
      <td data-rotulo="Situação">${v.ativo === false ? etiqueta('Desativado', 'neutra') : etiqueta('Ativo', 'ok')}</td>
      <td class="acoes"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-editar-vinculo="${esc(v.id)}" aria-label="Editar ${esc(v.nome)}">Editar</button><button type="button" class="botao botao-secundario botao-mini" data-alternar-vinculo="${esc(v.id)}" aria-label="${v.ativo === false ? 'Ativar' : 'Desativar'} ${esc(v.nome)}">${v.ativo === false ? 'Ativar' : 'Desativar'}</button>${u.total ? '' : `<button type="button" class="botao botao-texto botao-mini" data-apagar-vinculo="${esc(v.id)}" aria-label="Apagar ${esc(v.nome)}">Apagar</button>`}</div></td></tr>`;
  }).join('');
  const semVinculo = professores.filter((p) => !p.vinculo).length + equipe.filter((m) => !m.vinculo).length;
  return `<p class="texto-suave">Todo cadastro de pessoa (professor e equipe do PROFIN) exige o tipo de vínculo, escolhido desta lista. Vínculo em uso não muda de nome nem é apagado; desativado, some dos formulários e quem já tem continua com ele.</p>
    ${semVinculo ? `<p class="alerta-atencao">${icone('alerta', 20)}<span>${semVinculo} ${plural(semVinculo, 'pessoa está', 'pessoas estão')} sem vínculo informado. Complete na tela de Professores ou da Equipe do PROFIN.</span></p>` : ''}
    <div class="linha-botoes esp-b-3"><button type="button" class="botao" data-novo-vinculo>${icone('mais', 20)}Cadastrar vínculo</button></div>
    ${formularioVinculo()}
    <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Tipos de vínculo</caption>
      <thead><tr><th scope="col">Vínculo</th><th scope="col" class="num">Professores</th><th scope="col" class="num">Equipe do PROFIN</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${linhas}</tbody></table></div>
    <p class="contagem">${vinculos.filter((v) => v.ativo !== false).length} ${plural(vinculos.filter((v) => v.ativo !== false).length, 'vínculo ativo', 'vínculos ativos')} · ${vinculos.length} no total</p>`;
}

function desenhar() {
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Cadastros da rede</h1></div>
    <p class="pagina-descricao">As listas que alimentam o portal inteiro: níveis de ensino com as séries de cada um, e os tipos de vínculo de quem trabalha na rede.</p>
    <div class="abas-estado" role="group" aria-label="Cadastro">${ABAS.map(([k, t]) => `<button type="button" class="chip" data-aba="${k}" aria-pressed="${aba === k}">${t}</button>`).join('')}</div>
    <div id="conteudo-aba">${aba === 'niveis' ? abaNiveis() : abaVinculos()}</div>`;
}
function abrirForm(seletor) { const f = main.querySelector(seletor); f?.querySelector('input:not([type=hidden]), select')?.focus(); f?.scrollIntoView({ block: 'start' }); }

async function salvarNiveis(lista, acao, alvo, msg) {
  await salvar('niveis', lista);
  niveis = lista; aplicarNiveis(lista);
  await registrarAcao(quem(), acao, alvo);
  desenhar(); avisar(msg);
}
async function salvarVinculos(lista, acao, alvo, msg) {
  await salvar('vinculos', lista);
  vinculos = lista; aplicarVinculos(lista);
  await registrarAcao(quem(), acao, alvo);
  desenhar(); avisar(msg);
}
const falhou = () => { avisar('Não foi possível salvar. Confira a conexão e tente de novo.'); mostrar(); };

main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.aba) { aba = b.dataset.aba; formNivel = null; formVinculo = null; desenhar(); main.querySelector(`[data-aba="${aba}"]`).focus(); return; }
  if ('novoNivel' in b.dataset) { formNivel = 'novo'; desenhar(); abrirForm('#form-nivel'); }
  if (b.dataset.editarNivel) { formNivel = b.dataset.editarNivel; desenhar(); abrirForm('#form-nivel'); }
  if ('cancelarNivel' in b.dataset) { formNivel = null; desenhar(); }
  if ('novoVinculo' in b.dataset) { formVinculo = 'novo'; desenhar(); abrirForm('#form-vinculo'); }
  if (b.dataset.editarVinculo) { formVinculo = b.dataset.editarVinculo; desenhar(); abrirForm('#form-vinculo'); }
  if ('cancelarVinculo' in b.dataset) { formVinculo = null; desenhar(); }
  try {
    if (b.dataset.tirarSerie) {
      const n = niveis.find((x) => x.id === b.dataset.tirarSerie); const s = b.dataset.serie;
      const r = podeRemoverSerie(s, uso(s));
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      if (!(await confirmar({ titulo: `Tirar ${s}?`, texto: `${s} sai de ${n.curto} e deixa de aparecer nos cadastros, na matrícula e nas turmas.`, botao: 'Tirar', perigo: true }))) return;
      await salvarNiveis(niveis.map((x) => (x.id === n.id ? { ...x, series: x.series.filter((y) => y !== s) } : x)), `Tirou ${s} do nível`, n.curto, `${s} saiu de ${n.curto}.`);
    }
    if (b.dataset.alternarNivel) {
      const n = niveis.find((x) => x.id === b.dataset.alternarNivel);
      const ativar = n.ativo === false;
      if (!ativar && !(await confirmar({ titulo: `Desativar ${n.curto}?`, texto: 'O nível some do cadastro de escola, dos cursos novos e da matrícula on-line. Escolas, cursos e turmas que já existem continuam valendo.', botao: 'Desativar', perigo: true }))) return;
      await salvarNiveis(niveis.map((x) => (x.id === n.id ? { ...x, ativo: ativar } : x)), ativar ? 'Ativou o nível' : 'Desativou o nível', n.curto, ativar ? 'Nível ativado.' : 'Nível desativado.');
    }
    if (b.dataset.apagarNivel) {
      const n = niveis.find((x) => x.id === b.dataset.apagarNivel);
      const r = podeApagarNivel(n, usoDoNivel(n, { atos, cursos, turmas }));
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      if (n.series.some((s) => uso(s).total)) { avisar('Uma série deste nível está em uso. Desative o nível em vez de apagar.', 'erro'); return; }
      if (!(await confirmar({ titulo: `Apagar ${n.curto}?`, texto: 'O nível e as séries dele saem da lista. Nada no portal usa este nível.', botao: 'Apagar', perigo: true }))) return;
      await salvarNiveis(niveis.filter((x) => x.id !== n.id).map((x) => (x.continuaEm === n.id ? { ...x, continuaEm: null } : x)), 'Apagou o nível', n.curto, 'Nível apagado.');
    }
    if (b.dataset.alternarVinculo) {
      const v = vinculos.find((x) => x.id === b.dataset.alternarVinculo);
      const ativar = v.ativo === false;
      if (!ativar) { const r = podeDesativarVinculo(vinculos, v.id); if (!r.ok) { avisar(r.motivo, 'erro'); return; } }
      await salvarVinculos(vinculos.map((x) => (x.id === v.id ? { ...x, ativo: ativar } : x)), ativar ? 'Ativou o tipo de vínculo' : 'Desativou o tipo de vínculo', v.nome, ativar ? 'Vínculo ativado.' : 'Vínculo desativado: some dos formulários.');
    }
    if (b.dataset.apagarVinculo) {
      const v = vinculos.find((x) => x.id === b.dataset.apagarVinculo);
      const r = podeApagarVinculo(v, usoDoVinculo(v.nome, { professores, equipe }));
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      if (v.ativo !== false) { const d = podeDesativarVinculo(vinculos, v.id); if (!d.ok) { avisar(d.motivo, 'erro'); return; } }
      if (!(await confirmar({ titulo: `Apagar ${v.nome}?`, texto: 'Ninguém tem este vínculo. Ele sai da lista.', botao: 'Apagar', perigo: true }))) return;
      await salvarVinculos(vinculos.filter((x) => x.id !== v.id), 'Apagou o tipo de vínculo', v.nome, 'Vínculo apagado.');
    }
  } catch { falhou(); }
});

main.addEventListener('change', async (e) => {
  const id = e.target.dataset?.matricula;
  if (!id) return;
  const n = niveis.find((x) => x.id === id);
  const lista = niveis.map((x) => (x.id === id ? { ...x, matricula: e.target.checked } : x));
  if (!lista.some((x) => x.ativo !== false && x.matricula && x.series.length)) { e.target.checked = true; avisar('A matrícula on-line precisa de pelo menos um nível com séries.', 'erro'); return; }
  try { await salvarNiveis(lista, e.target.checked ? 'Pôs o nível na matrícula on-line' : 'Tirou o nível da matrícula on-line', n.curto, e.target.checked ? `${n.curto} aparece na matrícula on-line.` : `${n.curto} saiu da matrícula on-line.`); main.querySelector(`[data-matricula="${id}"]`)?.focus(); } catch { falhou(); }
});

main.addEventListener('submit', async (e) => {
  e.preventDefault();
  const form = e.target;
  try {
    if (form.dataset.formSerie) {
      const n = niveis.find((x) => x.id === form.dataset.formSerie);
      const campoSerie = form.querySelector('[name="serie"]');
      const nome = campoSerie.value.trim();
      const { erros } = validarSerieNova(nome, { niveis });
      const erro = form.querySelector('.erro');
      erro.textContent = erros.serie || '';
      if (erros.serie) { campoSerie.setAttribute('aria-invalid', 'true'); campoSerie.focus(); return; }
      await comEspera(e.submitter, () => salvarNiveis(niveis.map((x) => (x.id === n.id ? { ...x, series: [...x.series, nome] } : x)), `Acrescentou ${nome} ao nível`, n.curto, `${nome} acrescentado(a) em ${n.curto}.`));
      main.querySelector(`#nova-serie-${CSS.escape(n.id)}`)?.focus();
      return;
    }
    if (form.id === 'form-nivel') {
      const dados = lerFormulario(form);
      const atual = formNivel === 'novo' ? null : niveis.find((x) => x.id === formNivel);
      const f = atual ? { ...dados, etapa: atual.etapa } : dados;
      if (!mostrarErros(form, validarNivel(f, { niveis, id: atual?.id || null }).erros, 'nv-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
      await comEspera(e.submitter, async () => {
        if (atual) await salvarNiveis(niveis.map((x) => (x.id === atual.id ? aplicarEdicaoDeNivel(x, f) : x)), 'Editou o nível de ensino', atual.curto, 'Nível salvo.');
        else { const novo = montarNivel(f, { niveis }); await salvarNiveis([...niveis, novo], 'Cadastrou o nível de ensino', novo.curto, 'Nível cadastrado. Agora acrescente as séries.'); }
      });
      formNivel = null; desenhar();
      return;
    }
    if (form.id === 'form-vinculo') {
      const dados = lerFormulario(form);
      const atual = formVinculo === 'novo' ? null : vinculos.find((x) => x.id === formVinculo);
      if (!mostrarErros(form, validarVinculo(dados, { vinculos, id: atual?.id || null }).erros, 'vc-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
      await comEspera(e.submitter, async () => {
        if (atual) await salvarVinculos(vinculos.map((x) => (x.id === atual.id ? { ...x, nome: dados.nome.trim(), descricao: String(dados.descricao ?? '').trim() } : x)), 'Editou o tipo de vínculo', dados.nome.trim(), 'Vínculo salvo.');
        else { const novo = montarVinculo(dados, { vinculos }); await salvarVinculos([...vinculos, novo], 'Cadastrou o tipo de vínculo', novo.nome, 'Vínculo cadastrado. Ele já aparece nos formulários.'); }
      });
      formVinculo = null; desenhar();
    }
  } catch { falhou(); }
});
mostrar();
