// Turmas da escola (só a direção): criar turma escolhendo série, turno (inclusive integral), sala e quantas vagas ela tem;
// editar; apagar a turma sem estudante. As vagas da matrícula on-line são os lugares livres nas turmas (vagas − estudantes),
// então quem cadastra a escola (SEED/DRE) não digita vagas. Série, turno e sala vêm de Direção › Estrutura da escola.
// A tela é montada em passos (série → turno → sala → vagas → nome), com um resumo ao vivo; as opções de sala já mostram as
// ocupadas no turno escolhido. As regras ficam em dominio/estrutura.js.
import { iniciar, falhaDados, link } from '../app.js';
import { sessao } from '../auth.js';
import { esc, etiqueta, icone, avisar, comEspera, confirmar, plural, vazio } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao, turmasEscola, dataDeReferencia } from '../dados.js';
import { situacaoAto, codigoDaTurma } from '../regras.js';
import { ETAPAS, ordemDaSerie } from '../dominio/niveis.js';
import { seriesEscolhidas } from '../dominio/cadastros.js';
import { TURNOS } from '../dominio/vagas.js';
import { atosDaEscola, turnosDaEscola, nomeSugerido, conflitoDeSala, validarTurma, montarTurma, aplicarEdicaoDeTurma, ocupadosDaTurma, podeApagarTurma, situacoesAbertas } from '../dominio/estrutura.js';
import { campo, lerFormulario, mostrarErros } from '../componentes/formulario.js';

const main = await iniciar({ perfil: 'diretor', pagina: 'diretor/turmas.html', assistente: false });
const escolaId = sessao().escolaId;
let escola, atos, todas, turmas, salas, enturmacao, hoje;
let form = null; // null | 'nova' | id da turma em edição
let nomeEditado = false;
let filtroSerie = '', filtroTurno = '';

async function mostrar() {
  try {
    let escolas, todasSalas;
    [escolas, atos, todas, todasSalas, enturmacao, hoje] = await Promise.all([carregar('escolas'), carregar('atos'), turmasEscola(), conjunto('salas'), conjunto('enturmacao'), dataDeReferencia()]);
    escola = escolas.find((e) => e.id === escolaId);
    turmas = todas.filter((t) => t.escolaId === escolaId).sort((a, b) => ordemDaSerie(a.serie) - ordemDaSerie(b.serie) || a.nome.localeCompare(b.nome, 'pt-BR'));
    salas = todasSalas.filter((s) => s.escolaId === escolaId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR', { numeric: true }));
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
const quem = () => sessao()?.nome || 'Direção';
const ocupados = (t) => ocupadosDaTurma(t, enturmacao);
const turmaEmEdicao = () => (form && form !== 'nova' ? turmas.find((t) => t.id === form) : null);
const fixa = (t) => Boolean(t && ocupados(t) > 0); // turma com estudante: só sala e vagas mudam

// ---------------- Formulário em passos ----------------
function opcoesDeSerie(valor) {
  return atosDaEscola(atos, escolaId).map((a) => {
    const n = ETAPAS.find((x) => x.etapa === a.etapa);
    const vigente = situacaoAto(a, hoje).vigente;
    return `<optgroup label="${esc(n?.curto || a.etapa)}${vigente ? '' : ' (ato vencido)'}">${seriesEscolhidas(a.etapa, a.series).map((s) => `<option value="${esc(s)}" ${s === valor ? 'selected' : ''} ${vigente ? '' : 'disabled'}>${esc(s)}</option>`).join('')}</optgroup>`;
  }).join('');
}
function opcoesDeSala(turno, valor, ignorarId) {
  return `<option value="">Escolha a sala</option>${salas.map((s) => {
    const outra = turno ? conflitoDeSala(s.id, turno, turmas, ignorarId) : null;
    return `<option value="${esc(s.id)}" data-lugares="${s.capacidade}" ${s.id === valor ? 'selected' : ''} ${outra ? 'disabled' : ''}>${esc(s.nome)} · ${s.capacidade} lugares${outra ? ` · ocupada pela ${esc(outra.nome)} (${esc(outra.turno.toLowerCase())})` : ''}</option>`;
  }).join('')}`;
}
function formulario() {
  if (!form) return '';
  const t = turmaEmEdicao();
  const travada = fixa(t);
  const turnos = turnosDaEscola(escola, turmas);
  const serie = t?.serie || '';
  const turno = t?.turno || (turnos.length === 1 ? turnos[0] : '');
  const p = 'tm';
  return `<form id="form-turma" class="form-cadastro" novalidate aria-labelledby="tm-titulo">
    <h2 id="tm-titulo">${t ? `Editar ${esc(t.nome)}` : 'Criar turma'}</h2>
    <p class="texto-suave esp-t-0">${t ? (travada ? `A turma tem ${ocupados(t)} ${plural(ocupados(t), 'estudante', 'estudantes')}: só a sala e as vagas mudam (série, turno e nome ficam).` : 'A turma não tem estudante: todos os campos podem mudar.') : 'Siga os passos. As vagas aparecem na matrícula on-line assim que a turma é criada.'}</p>
    <ol class="passos-form">
      <li><div class="campo"><label for="${p}-serie">Série <span class="obrigatorio" aria-hidden="true">*</span></label><select id="${p}-serie" name="serie" class="entrada" aria-describedby="${p}-serie-dica ${p}-serie-erro" ${travada ? 'disabled' : ''}><option value="">Escolha a série</option>${opcoesDeSerie(serie)}</select>${travada ? `<input type="hidden" name="serie" value="${esc(serie)}">` : ''}<span class="dica" id="${p}-serie-dica">Só as séries que a escola oferece (Estrutura da escola).</span><p class="erro" id="${p}-serie-erro" role="alert"></p></div></li>
      <li><fieldset class="campo" id="${p}-turno" aria-describedby="${p}-turno-dica ${p}-turno-erro"><legend>Turno <span class="obrigatorio" aria-hidden="true">*</span></legend>
        <div class="opcoes-chip">${turnos.map((x) => `<label class="marca-item"><input type="radio" name="turno" value="${esc(x)}" ${x === turno ? 'checked' : ''} ${travada ? 'disabled' : ''}><span>${esc(x)}${x === 'Integral' ? '<small>manhã e tarde, 9 aulas por dia</small>' : ''}</span></label>`).join('')}</div>
        ${travada ? `<input type="hidden" name="turno" value="${esc(turno)}">` : ''}<span class="dica" id="${p}-turno-dica">${turnos.includes('Integral') ? 'A turma integral ocupa a sala de manhã e de tarde.' : 'Para turma integral, acrescente o turno Integral em Estrutura da escola.'}</span><p class="erro" id="${p}-turno-erro" role="alert"></p></fieldset></li>
      <li><div class="campo"><label for="${p}-salaId">Sala <span class="obrigatorio" aria-hidden="true">*</span></label><select id="${p}-salaId" name="salaId" class="entrada" aria-describedby="${p}-salaId-dica ${p}-salaId-erro">${opcoesDeSala(turno, t?.salaId || '', t?.id)}</select><span class="dica" id="${p}-salaId-dica">As salas ocupadas no turno escolhido ficam bloqueadas.</span><p class="erro" id="${p}-salaId-erro" role="alert"></p></div></li>
      <li>${campo({ prefixo: p, nome: 'vagas', rotulo: 'Vagas da turma', valor: t ? String(t.capacidade || '') : '', tipo: 'number', obrigatorio: true, dica: t ? `De ${Math.max(5, ocupados(t))} até os lugares da sala` : 'Até os lugares da sala. Ao escolher a sala, vem o número de lugares.', atributos: 'min="1" max="80" step="1" inputmode="numeric"' })}</li>
      <li>${travada ? `<div class="campo"><span class="rotulo-fixo">Nome da turma</span><p class="valor-fixo">${esc(t.nome)}</p><input type="hidden" name="nome" value="${esc(t.nome)}"></div>` : campo({ prefixo: p, nome: 'nome', rotulo: 'Nome da turma', valor: t?.nome || '', obrigatorio: true, dica: 'Sugerido pela série e pela próxima letra livre. Pode mudar.', atributos: 'maxlength="40" autocomplete="off"' })}</li>
    </ol>
    <p class="previa-series" id="tm-resumo" aria-live="polite"></p>
    <div class="form-acoes"><button type="submit" class="botao">${icone('ok', 20)}${t ? 'Salvar turma' : 'Criar turma'}</button><button type="button" class="botao botao-secundario" data-cancelar>Cancelar</button></div></form>`;
}
/** Atualiza salas, vagas, nome sugerido e resumo conforme a pessoa escolhe (sem redesenhar o formulário: o foco fica onde está). */
function atualizarFormulario(origem = '') {
  const f = main.querySelector('#form-turma');
  if (!f) return;
  const t = turmaEmEdicao();
  const dados = lerFormulario(f);
  const sel = f.querySelector('#tm-salaId');
  if (origem === 'turno') { const atual = sel.value; sel.innerHTML = opcoesDeSala(dados.turno, atual, t?.id); if (sel.selectedOptions[0]?.disabled) sel.value = ''; }
  const sala = salas.find((s) => s.id === sel.value);
  const vagas = f.querySelector('#tm-vagas');
  if (sala) { vagas.max = String(sala.capacidade); if (origem === 'sala' && (!vagas.value || Number(vagas.value) > sala.capacidade || !t)) vagas.value = String(sala.capacidade); }
  const nome = f.querySelector('#tm-nome');
  if (nome && !nomeEditado && dados.serie && (origem === 'serie' || origem === 'turno') && !t) nome.value = nomeSugerido(dados.serie, dados.turno, turmas);
  const d = lerFormulario(f);
  const partes = [d.nome?.trim() || '(sem nome)', d.serie || '(série)', d.turno ? (d.turno === 'Integral' ? 'Integral (manhã e tarde)' : d.turno) : '(turno)', sala ? sala.nome : '(sala)', d.vagas ? `${d.vagas} vagas` : '(vagas)'];
  f.querySelector('#tm-resumo').textContent = `Resumo: ${partes.join(' · ')}.`;
}

// ---------------- Lista ----------------
function linha(t) {
  const oc = ocupados(t), livres = Math.max(0, (t.capacidade || 0) - oc);
  const aberta = situacoesAbertas.includes(t.situacao);
  const ultimo = (t.historico || []).at(-1);
  const acoes = `<div class="linha-botoes">${aberta ? `<button type="button" class="botao botao-mini" data-aprovar="${esc(t.id)}" aria-label="Aprovar a ${esc(t.nome)}">Aprovar</button>` : ''}<button type="button" class="botao botao-secundario botao-mini" data-editar="${esc(t.id)}" aria-label="Editar a ${esc(t.nome)}">Editar</button>${oc ? '' : `<button type="button" class="botao botao-texto botao-mini" data-apagar="${esc(t.id)}" aria-label="Apagar a ${esc(t.nome)}">Apagar</button>`}</div>`;
  return `<tr><td class="titulo-linha"><strong>${esc(t.nome)}</strong><small>${esc(codigoDaTurma(t))}</small></td>
    <td class="sem-quebra-texto" data-rotulo="Série">${esc(t.serie)}</td><td data-rotulo="Turno">${esc(t.turno)}</td><td data-rotulo="Sala">${esc(t.sala || '—')}</td>
    <td data-rotulo="Vagas"><div><strong>${oc} de ${t.capacidade || 0}</strong><br><span class="texto-suave texto-pequeno">${t.situacao === 'Aprovada' ? `${livres} ${plural(livres, 'vaga livre', 'vagas livres')}` : 'não conta nas vagas até aprovar'}</span></div></td>
    <td data-rotulo="Situação"><div>${etiqueta(t.situacao, t.situacao === 'Aprovada' ? 'ok' : t.situacao === 'Devolvida' ? 'erro' : 'atencao')}${ultimo ? `<br><span class="texto-suave texto-pequeno">${esc(ultimo[0])}: ${esc(ultimo[1])}${ultimo[2] ? ` · ${esc(ultimo[2])}` : ''}</span>` : ''}</div></td>
    <td class="acoes">${acoes}</td></tr>`;
}
function desenhar() {
  const aprovadas = turmas.filter((t) => t.situacao === 'Aprovada');
  const vagas = aprovadas.reduce((s, t) => s + (t.capacidade || 0), 0);
  const estudantes = aprovadas.reduce((s, t) => s + ocupados(t), 0);
  const abertas = turmas.filter((t) => situacoesAbertas.includes(t.situacao));
  const lista = turmas.filter((t) => (!filtroSerie || t.serie === filtroSerie) && (!filtroTurno || t.turno === filtroTurno));
  main.innerHTML = `
    <div class="cabecalho-pagina"><h1>Turmas</h1></div>
    <p class="pagina-descricao">A direção cria as turmas e diz quantas vagas cada uma tem. As vagas da matrícula on-line são os lugares livres nas turmas aprovadas (vagas da turma − estudantes). Série, turnos e salas vêm de <a href="${link('diretor/escola.html')}">Estrutura da escola</a>.</p>
    <dl class="resumo-linha">
      <div><dd>${aprovadas.length}</dd><dt>${plural(aprovadas.length, 'turma aprovada', 'turmas aprovadas')}</dt></div>
      <div><dd>${vagas}</dd><dt>vagas nas turmas</dt></div>
      <div><dd>${estudantes}</dd><dt>estudantes</dt></div>
      <div><dd>${Math.max(0, vagas - estudantes)}</dd><dt>lugares livres · <a href="${link('diretor/vagas.html')}">ver vagas por série</a></dt></div>
      ${abertas.length ? `<div class="atencao"><dd>${abertas.length}</dd><dt>${plural(abertas.length, 'turma esperando aprovação', 'turmas esperando aprovação')}</dt></div>` : ''}
    </dl>
    ${abertas.length ? `<p class="alerta-info">${icone('info', 20)}<span>Turmas montadas antes pela coordenação esperam a direção: aprove (se a sala e o turno estiverem certos) ou apague.</span></p>` : ''}
    ${salas.length ? '' : `<p class="alerta-atencao">${icone('alerta', 20)}<span>A escola não tem sala cadastrada. Cadastre as salas em <a href="${link('diretor/escola.html')}">Estrutura da escola</a> antes de criar turmas.</span></p>`}
    <div class="ferramentas-tabela">
      <div class="campo"><label for="filtro-serie">Série</label><select id="filtro-serie" class="entrada"><option value="">Todas as séries</option>${[...new Set(turmas.map((t) => t.serie))].map((s) => `<option ${s === filtroSerie ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <div class="campo"><label for="filtro-turno">Turno</label><select id="filtro-turno" class="entrada"><option value="">Todos os turnos</option>${TURNOS.filter((x) => turnosDaEscola(escola, turmas).includes(x) || turmas.some((t) => t.turno === x)).map((s) => `<option ${s === filtroTurno ? 'selected' : ''}>${esc(s)}</option>`).join('')}</select></div>
      <button type="button" class="botao" data-nova ${salas.length ? '' : 'disabled'}>${icone('mais', 20)}Criar turma</button>
    </div>
    ${formulario()}
    ${lista.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas da escola</caption>
      <thead><tr><th scope="col">Turma</th><th scope="col">Série</th><th scope="col">Turno</th><th scope="col">Sala</th><th scope="col">Estudantes e vagas</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
      <tbody>${lista.map(linha).join('')}</tbody></table></div>
      <p class="contagem">${lista.length} ${plural(lista.length, 'turma', 'turmas')}</p>` : vazio('Nenhuma turma', filtroSerie || filtroTurno ? 'Mude os filtros para ver outras turmas.' : 'Use “Criar turma” para montar a primeira.')}`;
  if (form) atualizarFormulario('inicio');
}

// ---------------- Ações ----------------
async function guardarTurmas(lista) {
  await salvar('turmas', [...todas.filter((t) => t.escolaId !== escolaId), ...lista]);
}
main.addEventListener('change', (e) => {
  const t = e.target;
  if (t.id === 'filtro-serie') { filtroSerie = t.value; desenhar(); main.querySelector('#filtro-serie').focus(); return; }
  if (t.id === 'filtro-turno') { filtroTurno = t.value; desenhar(); main.querySelector('#filtro-turno').focus(); return; }
  if (!t.closest('#form-turma')) return;
  atualizarFormulario(t.name === 'turno' ? 'turno' : t.name === 'salaId' ? 'sala' : t.name === 'serie' ? 'serie' : '');
});
main.addEventListener('input', (e) => { if (e.target.id === 'tm-nome') { nomeEditado = true; atualizarFormulario(); } if (e.target.id === 'tm-vagas') atualizarFormulario(); });
main.addEventListener('click', async (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if ('nova' in b.dataset) { form = 'nova'; nomeEditado = false; desenhar(); const f = main.querySelector('#form-turma'); f.scrollIntoView({ block: 'start' }); f.querySelector('#tm-serie').focus(); return; }
  if (b.dataset.editar) { form = b.dataset.editar; nomeEditado = true; desenhar(); const f = main.querySelector('#form-turma'); f.scrollIntoView({ block: 'start' }); f.querySelector('select:not([disabled]), input:not([type=hidden]):not([disabled])')?.focus(); return; }
  if ('cancelar' in b.dataset) { form = null; desenhar(); main.querySelector('[data-nova]')?.focus(); return; }
  try {
    if (b.dataset.aprovar) {
      const t = turmas.find((x) => x.id === b.dataset.aprovar);
      const f = { serie: t.serie, turno: t.turno, salaId: t.salaId, vagas: String(t.capacidade || 0), nome: t.nome };
      const { ok, erros } = validarTurma(f, { escola, atos, turmasDaEscola: turmas.filter((x) => x.situacao === 'Aprovada' || x.id === t.id), salas, hoje, id: t.id, ocupados: ocupados(t) });
      if (!ok) { avisar(`Antes de aprovar, ajuste a turma: ${Object.values(erros)[0]}`, 'erro'); form = t.id; nomeEditado = true; desenhar(); return; }
      if (!(await confirmar({ titulo: `Aprovar a ${t.nome}?`, texto: `A turma passa a valer: ${t.capacidade} vagas na matrícula on-line, aparece para professores e estudantes e já recebe alunos na enturmação.`, botao: 'Aprovar turma' }))) return;
      const nova = { ...t, situacao: 'Aprovada', historico: [...(t.historico || []), ['Direção', 'Aprovou', '']] };
      await guardarTurmas(turmas.map((x) => (x.id === t.id ? nova : x)));
      await registrarAcao(quem(), 'Aprovou a turma', t.nome);
      await mostrar(); avisar('Turma aprovada. As vagas dela já contam na matrícula.');
      return;
    }
    if (b.dataset.apagar) {
      const t = turmas.find((x) => x.id === b.dataset.apagar);
      const r = podeApagarTurma(t, { enturmacao });
      if (!r.ok) { avisar(r.motivo, 'erro'); return; }
      const [alocacoes, horarios] = await Promise.all([conjunto('alocacoes'), conjunto('horarios')]);
      const nAloc = alocacoes.filter((a) => a.turmaId === t.id).length;
      const temGrade = horarios.some((h) => h.turmaId === t.id);
      if (!(await confirmar({ titulo: `Apagar a ${t.nome}?`, texto: `A turma sai da escola e as ${t.capacidade || 0} vagas dela saem da matrícula.${nAloc ? ` ${nAloc} ${plural(nAloc, 'professor alocado sai', 'alocações de professor saem')} junto.` : ''}${temGrade ? ' A grade de horário também é apagada.' : ''}`, botao: 'Apagar turma', perigo: true }))) return;
      await guardarTurmas(turmas.filter((x) => x.id !== t.id));
      if (nAloc) await salvar('alocacoes', alocacoes.filter((a) => a.turmaId !== t.id));
      if (temGrade) await salvar('horarios', horarios.filter((h) => h.turmaId !== t.id));
      await registrarAcao(quem(), 'Apagou a turma', t.nome);
      if (form === t.id) form = null;
      await mostrar(); avisar('Turma apagada.'); main.querySelector('[data-nova]')?.focus();
    }
  } catch { avisar('Não foi possível salvar. Confira a conexão e tente de novo.'); mostrar(); }
});
main.addEventListener('submit', async (e) => {
  if (e.target.id !== 'form-turma') return;
  e.preventDefault();
  const dados = lerFormulario(e.target);
  const atual = turmaEmEdicao();
  const ctx = { escola, atos, turmasDaEscola: turmas, salas, hoje, id: atual?.id || null, ocupados: atual ? ocupados(atual) : 0 };
  if (!mostrarErros(e.target, validarTurma(dados, ctx).erros, 'tm-')) { avisar('Confira os campos marcados em vermelho.', 'erro'); return; }
  try {
    await comEspera(e.submitter, async () => {
      if (atual) {
        const editada = aplicarEdicaoDeTurma(atual, dados, { salas, por: 'Direção' });
        await guardarTurmas(turmas.map((x) => (x.id === atual.id ? editada : x)));
        // A grade de horário guarda o nome, o turno e a sala da turma: acompanham a edição.
        const horarios = await conjunto('horarios');
        const g = horarios.find((h) => h.turmaId === atual.id);
        if (g && (g.sala !== editada.sala || g.turma !== editada.nome)) { g.sala = editada.sala; g.turma = editada.nome; await salvar('horarios', horarios); }
        await registrarAcao(quem(), 'Alterou a turma', editada.nome);
      } else {
        const nova = montarTurma(dados, { escolaId, salas, hoje, por: 'Direção' });
        await guardarTurmas([...turmas, nova]);
        await registrarAcao(quem(), `Criou a turma (${nova.turno}, ${nova.capacidade} vagas)`, nova.nome);
      }
    });
    const msg = atual ? 'Turma salva.' : `Turma criada com ${dados.vagas} vagas. Elas já aparecem na matrícula on-line.`;
    form = null; await mostrar(); avisar(msg);
  } catch { avisar('Não foi possível salvar a turma. Confira a conexão e tente de novo.'); }
});
mostrar();
