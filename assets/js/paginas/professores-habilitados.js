// Mapa de falta de professores habilitados: escola × componente da matriz. A regra está em dominio/habilitacao.js.
// Na rede mostra as escolas do acesso (a DRE vê só as da sua regional; a SEED, todas) e o resumo por município; na secretaria,
// só a escola da pessoa. O cadastro começa pelo CPF: "Buscar no RH" preenche os dados do sistema de RH (base simulada).
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, baixarCSV, vazio, avisar, comEspera, plural, combina, confirmar, dataBR } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, dataDeReferencia, professoresComInativos, turmasDaRede } from '../dados.js';
import { mapaDeFalta } from '../dominio/habilitacao.js';
import { VINCULOS, validarProfessor, montarProfessor, mascararCpf, validarEdicaoDeProfessor, aplicarEdicaoDeProfessor, podeDesligar, turmasQueDeixa, semAlocacoesDe } from '../dominio/cadastros.js';
import { campo, marcas, lerFormulario, mostrarErros } from '../componentes/formulario.js';
import { daMinhaDre, avisoDeAcesso } from '../dre.js';

const perfil = document.body.dataset.perfil === 'escola' ? 'escola' : 'rede';
const main = await iniciar({ perfil, pagina: `${perfil}/professores.html`, assistente: true });
const ETAPA_EM = 'Ensino Médio';
let aberto = false;
let escolasDoAcesso = [], todosProfessores = [], componentesDaRede = [], hoje = '', busca = '', alocacoes = [], turmasRede = [];

async function mostrar() {
  try {
    const [escolas, atos, professores, matrizes, extra, dataRef] = await Promise.all([carregar('escolas'), carregar('atos'), carregar('professores'), carregar('matrizes'), carregar('componentes-etapa'), dataDeReferencia()]);
    hoje = dataRef;
    // A matriz do Ensino Médio vem da versão vigente de data/matrizes.json; a do Fundamental, de data/componentes-etapa.json.
    const componentesPorEtapa = { [ETAPA_EM]: matrizes.versoes[0].componentes.map((c) => c[0]), ...extra };
    const proprias = perfil === 'escola' ? escolas.filter((e) => e.id === sessao()?.escolaId) : escolas.filter(daMinhaDre);
    escolasDoAcesso = proprias; todosProfessores = await professoresComInativos(); alocacoes = await conjunto('alocacoes'); turmasRede = await turmasDaRede(); componentesDaRede = [...new Set(Object.values(componentesPorEtapa).flat())];
    const { componentes, linhas } = mapaDeFalta({ escolas: proprias, atos, professores, componentesPorEtapa });
    const total = linhas.reduce((t, l) => t + l.faltam.length, 0);
    const porMunicipio = [...new Set(linhas.map((l) => l.escola.municipio))].map((m) => {
      const ls = linhas.filter((l) => l.escola.municipio === m);
      const cont = {};
      ls.forEach((l) => l.faltam.forEach((c) => { cont[c] = (cont[c] || 0) + 1; }));
      const mais = Object.entries(cont).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([c, n]) => `${c} (${n} ${n === 1 ? 'escola' : 'escolas'})`);
      return { municipio: m, escolas: ls.length, faltas: ls.reduce((t, l) => t + l.faltam.length, 0), mais };
    }).sort((a, b) => b.faltas - a.faltas);
    const celula = (estado) => estado === 'falta' ? '<td class="num"><span class="etiqueta etiqueta-erro">falta</span></td>' : estado === 'ok' ? '<td class="num"><span class="sr-only">tem professor habilitado</span></td>' : '<td class="num texto-suave" aria-label="não se aplica">—</td>';
    main.innerHTML = `
      <div class="cabecalho-pagina"><h1>Professores</h1></div>
      <p class="pagina-descricao">Cadastro dos professores lotados ${perfil === 'escola' ? 'na escola' : 'nas escolas da rede'} e o mapa dos componentes da matriz sem professor habilitado.</p>
      ${perfil === 'rede' ? avisoDeAcesso() : ''}
      <dl class="resumo-linha">
        <div class="${total ? 'alerta' : ''}"><dd>${total}</dd><dt>${total === 1 ? 'componente sem professor' : 'componentes sem professor'} nas escolas listadas</dt></div>
        <div><dd>${linhas.filter((l) => l.faltam.length).length}</dd><dt>de ${linhas.length} ${linhas.length === 1 ? 'escola' : 'escolas'} com pelo menos uma falta</dt></div>
      </dl>
      <div class="linha-botoes nao-imprimir esp-b-3"><button type="button" class="botao" id="novo-professor">${icone('pessoas', 20)}Cadastrar professor</button><button type="button" class="botao botao-secundario" id="imprimir">${icone('imprimir', 20)}Imprimir</button><button type="button" class="botao botao-secundario" id="exportar">${icone('baixar', 20)}Exportar CSV</button></div>
      ${formularioProfessor()}
      <div id="area-edicao"></div>
      <h2>Professores cadastrados</h2>
      <div class="campo campo-busca nao-imprimir"><label for="busca-prof">Buscar professor</label><input id="busca-prof" class="entrada" type="search" placeholder="Nome, matrícula ou componente" value="${esc(busca)}">${icone('busca', 20)}</div>
      <div id="tabela-prof">${tabelaProfessores()}</div>
      <h2>Componentes sem professor habilitado</h2>
      ${linhas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-matriz"><caption class="sr-only">Componentes sem professor habilitado, por escola</caption>
        <thead><tr><th scope="col">Escola</th>${componentes.map((c) => `<th scope="col" class="num cabecalho-vertical">${esc(c)}</th>`).join('')}</tr></thead>
        <tbody>${linhas.map((l) => `<tr><th class="celula-escola" scope="row">${esc(l.escola.nome)}<br><span class="texto-suave texto-pequeno peso-normal">${esc(l.escola.municipio)} · ${l.faltam.length} ${l.faltam.length === 1 ? 'falta' : 'faltas'}</span></th>${componentes.map((c) => celula(l.celulas[c])).join('')}</tr>`).join('')}</tbody></table></div>
        <p class="contagem">“—”: componente fora da matriz das etapas da escola.</p>` : vazio('Nenhuma escola para mostrar', 'Não há escola vinculada a este acesso.')}
      ${perfil === 'rede' ? `<h2>Resumo por município</h2>
        <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Faltas de professor por município</caption>
          <thead><tr><th scope="col">Município</th><th scope="col" class="num">Escolas</th><th scope="col" class="num">Componentes sem professor</th><th scope="col">Mais faltam</th></tr></thead>
          <tbody>${porMunicipio.map((m) => `<tr><td class="titulo-linha"><strong>${esc(m.municipio)}</strong></td><td class="num" data-rotulo="Escolas">${m.escolas}</td><td class="num" data-rotulo="Componentes sem professor">${m.faltas ? etiqueta(String(m.faltas), 'erro') : '0'}</td><td data-rotulo="Mais faltam">${m.mais.length ? esc(m.mais.join('; ')) : '<span class="texto-suave">nenhuma falta</span>'}</td></tr>`).join('')}</tbody></table></div>` : ''}`;
    main.querySelector('#imprimir').addEventListener('click', () => window.print());
    main.querySelector('#exportar').addEventListener('click', () => baixarCSV('professores-habilitados.csv', ['Escola', 'Município', ...componentes], linhas.map((l) => [l.escola.nome, l.escola.municipio, ...componentes.map((c) => ({ falta: 'falta', ok: 'ok', na: '' })[l.celulas[c]])])));
  } catch { falhaDados(main, mostrar); }
}
function formularioProfessor() {
  const lotacao = escolasDoAcesso.length === 1
    ? ''
    : campo({ nome: 'escolaId', rotulo: 'Escola de lotação', obrigatorio: true, opcoes: [['', 'Escolha a escola'], ...escolasDoAcesso.map((e) => [e.id, `${e.nome} (${e.municipio})`])] });
  return `<form id="form-professor" class="form-cadastro" novalidate ${aberto ? '' : 'hidden'} aria-labelledby="prof-titulo">
    <h2 id="prof-titulo">Cadastrar professor</h2>
    <p class="texto-suave esp-t-0">Campos com <span class="obrigatorio" aria-hidden="true">*</span> são obrigatórios. Comece pelo CPF: se a pessoa estiver no sistema de RH do estado, os dados vêm preenchidos (no protótipo, uma base simulada; para testar, use 314.159.265-90). O acesso ao portal é criado pela equipe técnica depois do cadastro.</p>
    <fieldset class="form-bloco"><legend>Sistema de RH</legend>
      <div class="campo campo-com-botao largo"><label for="f-cpf">CPF <span class="obrigatorio" aria-hidden="true">*</span></label>
        <div class="linha-campo"><input id="f-cpf" name="cpf" class="entrada" inputmode="numeric" maxlength="14" autocomplete="off" aria-describedby="f-cpf-dica f-cpf-erro" required><button type="button" class="botao botao-secundario" id="buscar-rh">${icone('busca', 20)}Buscar no RH</button></div>
        <span class="dica" id="f-cpf-dica">11 números. A busca usa uma base simulada do RH.</span><p class="erro" id="f-cpf-erro" role="alert"></p><p class="texto-pequeno" id="rh-status" role="status"></p></div>
    </fieldset>
    <fieldset class="form-bloco"><legend>Dados do professor</legend>
      <div class="largo">${campo({ nome: 'nome', rotulo: 'Nome completo', obrigatorio: true, atributos: 'maxlength="120" autocomplete="off"' })}</div>
      ${campo({ nome: 'matriculaFuncional', rotulo: 'Matrícula funcional', obrigatorio: true, dica: 'Exemplo: PF-30999', atributos: 'maxlength="8" autocomplete="off"' })}
      ${campo({ nome: 'vinculo', rotulo: 'Vínculo', obrigatorio: true, opcoes: [['', 'Escolha o vínculo'], ...VINCULOS.map((v) => [v, v])] })}
      ${campo({ nome: 'cargaHorariaSemanal', rotulo: 'Carga horária semanal', obrigatorio: true, opcoes: [['', 'Escolha'], ['10', '10 horas'], ['20', '20 horas'], ['30', '30 horas'], ['40', '40 horas']] })}
      ${lotacao}
      <div class="largo">${campo({ nome: 'formacao', rotulo: 'Formação', obrigatorio: true, dica: 'Exemplo: Licenciatura em Matemática', atributos: 'maxlength="120" autocomplete="off"' })}</div>
      <div class="largo">${marcas({ nome: 'habilitacao', rotulo: 'Componentes em que é habilitado', obrigatorio: true, dica: 'A habilitação decide em quais turmas o professor pode ser alocado.', itens: componentesDaRede.map((c) => [c, c]) })}</div>
      ${campo({ nome: 'email', rotulo: 'E-mail', tipo: 'email', dica: 'Opcional', atributos: 'autocomplete="off"' })}
      ${campo({ nome: 'telefone', rotulo: 'Telefone', tipo: 'tel', dica: 'Com DDD. Opcional', atributos: 'inputmode="tel" autocomplete="off"' })}
    </fieldset>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Cadastrar professor</button><button type="button" class="botao botao-secundario" id="cancelar-professor">Cancelar</button></div></form>`;
}
const nomeEscola = (id) => escolasDoAcesso.find((e) => e.id === id)?.nome || id;
/** Lotação atual e anteriores, da mais recente para a mais antiga. */
function historicoDeLotacao(p) {
  const antes = [...(p.historicoLotacao || [])].reverse();
  return `<section class="historico-lotacao" aria-labelledby="hl-titulo"><h3 id="hl-titulo">Histórico de lotação</h3><ul class="lista-simples"><li><strong>${esc(nomeEscola(p.escolaId))}</strong> ${etiqueta('atual', 'ok')} <span class="texto-suave texto-pequeno">${p.lotadoDesde ? `desde ${dataBR(p.lotadoDesde)}` : 'início não registrado'}</span></li>${antes.map((h) => `<li>${esc(nomeEscola(h.escolaId))} <span class="texto-suave texto-pequeno">${h.de ? `de ${dataBR(h.de)} ` : ''}até ${dataBR(h.ate)}${h.motivo ? ` · ${esc(h.motivo)}` : ''}</span></li>`).join('')}</ul></section>`;
}
function formularioEdicao(p) {
  const lotacao = escolasDoAcesso.length === 1 ? '' : campo({ prefixo: 'pe', nome: 'escolaId', rotulo: 'Escola de lotação', valor: p.escolaId, obrigatorio: true, opcoes: escolasDoAcesso.map((e) => [e.id, `${e.nome} (${e.municipio})`]) });
  return `<form id="form-prof-editar" class="form-cadastro" novalidate data-id="${p.id}" aria-labelledby="pe-titulo">
    <h2 id="pe-titulo">Editar professor: ${esc(p.nome)}</h2>
    <p class="texto-suave esp-t-0">Matrícula funcional ${esc(p.matriculaFuncional)}${p.cpf ? ` · CPF ${esc(mascararCpf(p.cpf))}` : ''}. Nome, matrícula e CPF não mudam aqui.</p>
    <fieldset class="form-bloco"><legend>Dados do professor</legend>
      ${campo({ prefixo: 'pe', nome: 'vinculo', rotulo: 'Vínculo', valor: p.vinculo || 'Efetivo', obrigatorio: true, opcoes: VINCULOS.map((v) => [v, v]) })}
      ${campo({ prefixo: 'pe', nome: 'cargaHorariaSemanal', rotulo: 'Carga horária semanal', valor: String(p.cargaHorariaSemanal), obrigatorio: true, opcoes: [['10', '10 horas'], ['20', '20 horas'], ['30', '30 horas'], ['40', '40 horas']] })}
      ${lotacao}
      ${lotacao ? `<div class="largo" id="pe-area-mudanca" hidden><p class="alerta-info" id="pe-aviso-turmas" role="status" hidden></p>${campo({ prefixo: 'pe', nome: 'motivoLotacao', rotulo: 'Motivo da mudança de escola', obrigatorio: true, dica: 'Fica no histórico de lotação.', atributos: 'maxlength="160" autocomplete="off"' })}</div>` : ''}
      <div class="largo">${campo({ prefixo: 'pe', nome: 'formacao', rotulo: 'Formação', valor: p.formacao, obrigatorio: true })}</div>
      <div class="largo">${marcas({ prefixo: 'pe', nome: 'habilitacao', rotulo: 'Componentes em que é habilitado', obrigatorio: true, itens: componentesDaRede.map((c) => [c, c]), marcados: p.habilitacao })}</div>
      ${campo({ prefixo: 'pe', nome: 'email', rotulo: 'E-mail', valor: p.email || '', tipo: 'email', dica: 'Opcional' })}
      ${campo({ prefixo: 'pe', nome: 'telefone', rotulo: 'Telefone', valor: p.telefone || '', tipo: 'tel', dica: 'Com DDD. Opcional' })}
    </fieldset>
    ${historicoDeLotacao(p)}
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}Salvar alterações</button><button type="button" class="botao botao-secundario" id="cancelar-edicao">Cancelar</button></div></form>`;
}
function tabelaProfessores() {
  const ids = new Set(escolasDoAcesso.map((e) => e.id));
  const lista = todosProfessores.filter((p) => ids.has(p.escolaId) && combina(busca, p.nome, p.matriculaFuncional, p.habilitacao.join(' ')));
  if (!lista.length) return vazio('Nenhum professor encontrado', 'Mude a busca ou cadastre um professor.');
  return `<div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Professores cadastrados</caption>
    <thead><tr><th scope="col">Professor</th><th scope="col">Habilitação</th><th scope="col" class="num">Carga semanal</th>${perfil === 'rede' ? '<th scope="col">Escola</th>' : ''}<th scope="col" class="nao-imprimir"><span class="sr-only">Ações</span></th></tr></thead>
    <tbody>${lista.map((p) => `<tr><td class="titulo-linha"><strong>${esc(p.nome)}</strong> ${p.ativo === false ? etiqueta('Desligado', 'neutra') : p.cadastradoEm ? etiqueta('Novo', 'info') : ''}<br><span class="texto-suave texto-pequeno">${esc(p.matriculaFuncional)} · ${esc(p.vinculo || 'Efetivo')}${p.cpf ? ` · CPF ${esc(mascararCpf(p.cpf))}` : ''}</span></td>
      <td data-rotulo="Habilitação"><div>${esc(p.habilitacao.join(', '))}<br><span class="texto-suave texto-pequeno">${esc(p.formacao)}</span></div></td>
      <td class="num" data-rotulo="Carga semanal"><div>${p.cargaHorariaSemanal} h<br><span class="texto-suave texto-pequeno">${p.aulasEmOutrasTurmas ?? 0} aulas em turmas</span></div></td>
      ${perfil === 'rede' ? `<td data-rotulo="Escola"><div>${esc(escolasDoAcesso.find((e) => e.id === p.escolaId)?.nome || '')}</div></td>` : ''}
      <td class="acoes nao-imprimir"><div class="linha-botoes"><button type="button" class="botao botao-secundario botao-mini" data-prof-editar="${p.id}" aria-label="Editar ${esc(p.nome)}">Editar</button><button type="button" class="botao botao-texto botao-mini" data-prof-desligar="${p.id}" aria-label="${p.ativo === false ? 'Reativar' : 'Desligar'} ${esc(p.nome)}">${p.ativo === false ? 'Reativar' : 'Desligar'}</button></div></td></tr>`).join('')}</tbody></table></div>
    <p class="contagem">${lista.length} ${plural(lista.length, 'professor', 'professores')}</p>`;
}
main.addEventListener('input', (e) => { if (e.target.id === 'busca-prof') { busca = e.target.value; main.querySelector('#tabela-prof').innerHTML = tabelaProfessores(); } });
main.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b?.id === 'novo-professor') { aberto = true; const f = main.querySelector('#form-professor'); f.hidden = false; f.querySelector('#f-cpf').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b?.id === 'buscar-rh') buscarNoRh(b.form);
  if (b?.dataset.profEditar) { const p = todosProfessores.find((x) => x.id === b.dataset.profEditar); main.querySelector('#area-edicao').innerHTML = formularioEdicao(p); const f = main.querySelector('#form-prof-editar'); f.querySelector('select, input').focus(); f.scrollIntoView({ block: 'start' }); }
  if (b?.id === 'cancelar-edicao') main.querySelector('#area-edicao').innerHTML = '';
  if (b?.dataset.profDesligar) desligarOuReativar(todosProfessores.find((x) => x.id === b.dataset.profDesligar));
  if (b?.id === 'cancelar-professor') { aberto = false; main.querySelector('#form-professor').hidden = true; main.querySelector('#novo-professor').focus(); }
});
// Busca no sistema de RH (base simulada em data/rh-servidores.json): preenche nome, matrícula, vínculo, carga, formação e habilitação.
const formatarCpf = (c) => c.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
async function buscarNoRh(form) {
  const status = form.querySelector('#rh-status');
  const cpf = String(form.querySelector('#f-cpf').value).replace(/\D/g, '');
  const dizer = (texto, erro = false) => { status.textContent = texto; status.className = `texto-pequeno${erro ? ' erro' : ''}`; };
  if (cpf.length !== 11) { dizer('Digite os 11 números do CPF para buscar.', true); form.querySelector('#f-cpf').focus(); return; }
  const jaTem = todosProfessores.find((p) => p.cpf && String(p.cpf).replace(/\D/g, '') === cpf);
  if (jaTem) { dizer(`Esse CPF já está cadastrado: ${jaTem.nome} (${jaTem.matriculaFuncional}).`, true); return; }
  let rh;
  try { rh = await carregar('rh-servidores'); } catch { dizer('Não foi possível consultar o RH agora. Preencha os dados à mão.', true); return; }
  const pessoa = rh.servidores.find((x) => x.cpf === cpf);
  if (!pessoa) { dizer('Esse CPF não está no sistema de RH (base simulada). Confira o número ou preencha os dados à mão.'); return; }
  form.querySelector('#f-cpf').value = formatarCpf(cpf);
  for (const c of ['nome', 'matriculaFuncional', 'vinculo', 'formacao']) { const el = form.querySelector(`#f-${c}`); if (el) el.value = pessoa[c] || ''; }
  const carga = form.querySelector('#f-cargaHorariaSemanal'); if (carga) carga.value = String(pessoa.cargaHorariaSemanal || '');
  form.querySelectorAll('[name="habilitacao"]').forEach((c) => { c.checked = (pessoa.habilitacao || []).includes(c.value); });
  dizer(`Dados encontrados no RH (base simulada): ${pessoa.nome}. Confira e escolha a escola de lotação.`);
  status.classList.add('sucesso-texto');
  (form.querySelector('#f-escolaId') || form.querySelector('#f-nome')).focus();
}
async function guardarProfessor(novo, acao) {
  const lista = (await conjunto('professores-novos')).filter((x) => x.id !== novo.id);
  await salvar('professores-novos', [...lista, novo]);
  await registrarAcao(sessao().nome, acao, novo.nome);
}
async function desligarOuReativar(p) {
  const reativar = p.ativo === false;
  if (!reativar) {
    const r = podeDesligar(p, alocacoes);
    if (!r.ok) { avisar(r.motivo, 'erro'); return; }
    if (!(await confirmar({ titulo: 'Desligar este professor?', texto: `${p.nome} deixa de contar na habilitação e não pode mais ser alocado. O cadastro fica guardado e dá para reativar.`, botao: 'Desligar', perigo: true }))) return;
  }
  try {
    await guardarProfessor(reativar ? { ...p, ativo: true, desligadoEm: null } : { ...p, ativo: false, desligadoEm: hoje }, reativar ? 'Reativou o professor' : 'Desligou o professor');
    await mostrar(); avisar(reativar ? 'Professor reativado.' : 'Professor desligado.');
  } catch { avisar('Não foi possível salvar a mudança. Confira a conexão e tente de novo.'); }
}
main.addEventListener('change', (e) => {
  if (e.target.id !== 'pe-escolaId') return;
  const form = e.target.closest('form'), p = todosProfessores.find((x) => x.id === form.dataset.id);
  const muda = e.target.value !== p.escolaId;
  form.querySelector('#pe-area-mudanca').hidden = !muda;
  const saidas = muda ? turmasQueDeixa(p, e.target.value, alocacoes, turmasRede) : [];
  const aviso = form.querySelector('#pe-aviso-turmas');
  aviso.hidden = !saidas.length;
  aviso.textContent = saidas.length ? `Ao mudar de escola, ${p.nome.split(' ')[0]} sai de ${saidas.length} ${plural(saidas.length, 'turma', 'turmas')}: ${saidas.map((s) => `${s.turma} (${s.componente})`).join(', ')}. Essas turmas ficam sem professor nesse componente até a secretaria alocar outro.` : '';
});
main.addEventListener('submit', async (e) => {
  if (e.target.id === 'form-prof-editar') {
    e.preventDefault();
    const dados = lerFormulario(e.target);
    if (escolasDoAcesso.length === 1) dados.escolaId = escolasDoAcesso[0].id;
    dados.habilitacao ||= [];
    const atual = todosProfessores.find((x) => x.id === e.target.dataset.id);
    if (!mostrarErros(e.target, validarEdicaoDeProfessor(dados, { escolas: escolasDoAcesso, componentes: componentesDaRede, escolaAtual: atual.escolaId }).erros, 'pe-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
    const saidas = dados.escolaId !== atual.escolaId ? turmasQueDeixa(atual, dados.escolaId, alocacoes, turmasRede) : [];
    if (saidas.length && !(await confirmar({ titulo: `Mudar ${atual.nome.split(' ')[0]} de escola?`, texto: `Sai de ${saidas.length} ${plural(saidas.length, 'turma', 'turmas')} da escola atual: ${saidas.map((s) => `${s.turma} (${s.componente})`).join(', ')}. Essas turmas ficam sem professor nesse componente. A mudança entra no histórico de lotação.`, botao: 'Mudar de escola', perigo: true }))) return;
    try {
      await comEspera(e.submitter, async () => {
        await guardarProfessor(aplicarEdicaoDeProfessor(atual, dados, hoje), dados.escolaId !== atual.escolaId ? `Mudou a lotação para ${nomeEscola(dados.escolaId)}` : 'Editou o cadastro do professor');
        if (saidas.length) await salvar('alocacoes', semAlocacoesDe(await conjunto('alocacoes'), atual.id, saidas));
      });
      await mostrar(); avisar(saidas.length ? 'Alterações salvas. As turmas de que saiu ficaram sem professor.' : 'Alterações salvas.');
    } catch { avisar('Não foi possível salvar as alterações. Confira a conexão e tente de novo.'); }
    return;
  }
  if (e.target.id !== 'form-professor') return;
  e.preventDefault();
  const dados = lerFormulario(e.target);
  if (escolasDoAcesso.length === 1) dados.escolaId = escolasDoAcesso[0].id;
  dados.habilitacao ||= [];
  if (!mostrarErros(e.target, validarProfessor(dados, { professores: todosProfessores, escolas: escolasDoAcesso, componentes: componentesDaRede }).erros)) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  try {
    await comEspera(e.submitter, async () => {
      const novos = await conjunto('professores-novos');
      const novo = montarProfessor(dados, { professores: todosProfessores, hoje });
      novos.push(novo);
      await salvar('professores-novos', novos);
      await registrarAcao(sessao().nome, 'Cadastrou o professor', novo.nome);
    });
    aberto = false;
    await mostrar();
    avisar('Professor cadastrado. Ele já aparece na lista e conta na habilitação da escola.');
  } catch { avisar('Não foi possível cadastrar o professor. Confira a conexão e tente de novo.'); mostrar(); }
});
mostrar();
