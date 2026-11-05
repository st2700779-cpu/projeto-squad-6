// Diário de classe (HU11; wireframe W13): turmas vindas da alocação da escola, estudantes vindos da enturmação,
// validação no próprio campo e gravação pela API. No celular, cada estudante vira um cartão (classe tabela-cartoes).
// Sem conexão (real ou simulada pelo botão Ficar offline), notas e chamada ficam em IndexedDB como "pendentes"
// (offline.js) e seguem para o "servidor" quando a conexão volta (dominio/sincronizacao.js).
import { iniciar, falhaDados, link } from '../app.js';
import { esc, avisar, icone, numeroBR, confirmar, dataHoraBR, dataBR, vazio, etiqueta, comEspera } from '../ui.js';
import { carregar, diario, letivo, matriculas, turmasEscola, salvar as salvarDados, conjunto, registrarAcao, recarregarDoServidor } from '../dados.js';
import { estaOnline, montarIndicador, guardarPendente, pendentes, baixarPendente, pendentePorChave } from '../offline.js';
import { aplicarPendentes, sobreporPendentes } from '../dominio/sincronizacao.js';
import { hojeISO } from '../dominio/hoje.js';
import { abonosPorEstudante } from '../dominio/vida-escolar.js';
import { estudantesInativos, situacaoDoEstudante } from '../dominio/movimentacao.js';
import { presenca, media, situacao, nomeCurto, turmasDoProfessor, sincronizarDiario, codigoDaTurma } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma');
let dados, prof, escolas, chamadas, minhas, aulasDadas, bimestres, meta, abonos = {}, movs = [];
let baseline = {};          // valores de cada estudante no último carregamento ou gravação (para achar o que mudou)
let pendentesIds = new Set(); // estudantes com nota pendente de envio ('turma|aluno')
let resultadoSync = '';     // aviso do último resultado de sincronização, mostrado na tela
let indicador = null;
const ausentes = new Set(); // chamada rápida: todos começam presentes; o professor toca em quem faltou
const hoje = hojeISO();
// Observações rápidas: um painel flutuante sob o campo em foco (sem mexer na altura das linhas e sem ser cortado pela rolagem da tabela).
const flutuante = document.createElement('div');
flutuante.className = 'chips-flutuantes';
flutuante.hidden = true;
flutuante.setAttribute('role', 'group');
flutuante.setAttribute('aria-label', 'Observações rápidas');
let campoObs = null;

const CAMPOS = { n1: 'Nota do 1º bimestre', n2: 'Nota do 2º bimestre', faltas: 'Faltas' };
// Observações rápidas: o clique (ou Alt+1 a Alt+6 no campo) preenche a observação do estudante sem digitar.
const CHIPS = ['Não entregou', 'Entregou incompleto', 'Participou bem', 'Faltou à prova', 'Precisa de apoio', 'Evoluiu'];
const obsCelula = (a) => `<td class="obs-celula" data-rotulo="Observação"><label class="sr-only" for="${a.id}-obs">Observação sobre ${esc(a.nome)}</label><input id="${a.id}-obs" class="entrada" type="text" maxlength="140" autocomplete="off" aria-keyshortcuts="Alt+1 Alt+2 Alt+3 Alt+4 Alt+5 Alt+6" data-aluno="${a.id}" data-nome="${esc(a.nome)}" data-campo="obs" value="${esc(a.obs ?? '')}"></td>`;
flutuante.innerHTML = CHIPS.map((t, i) => `<button type="button" class="chip" tabindex="-1" data-chip="${esc(t)}" title="Alt+${i + 1}">${esc(t)}</button>`).join('');
document.body.append(flutuante);
function posicionarChips() {
  if (!campoObs?.isConnected || flutuante.hidden) return;
  const r = campoObs.getBoundingClientRect();
  const h = flutuante.offsetHeight, w = flutuante.offsetWidth;
  flutuante.style.left = `${Math.max(8, Math.min(r.left, innerWidth - w - 8))}px`;
  flutuante.style.top = `${r.bottom + 4 + h > innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4}px`;
}
const esconderChips = () => { flutuante.hidden = true; };
flutuante.addEventListener('mousedown', (e) => e.preventDefault()); // o campo não perde o foco ao tocar num chip
flutuante.addEventListener('click', (e) => { const c = e.target.closest('[data-chip]'); if (c && campoObs) aplicarChip(campoObs, c.dataset.chip); });
document.addEventListener('focusin', (e) => {
  if (e.target.dataset?.campo === 'obs' && main.contains(e.target)) { campoObs = e.target; flutuante.hidden = false; posicionarChips(); }
  else if (!flutuante.contains(e.target)) esconderChips();
});
document.addEventListener('mousedown', (e) => { if (!flutuante.contains(e.target) && e.target !== campoObs) esconderChips(); });
addEventListener('scroll', posicionarChips, { passive: true });
addEventListener('resize', posicionarChips);
function aplicarChip(campo, texto) {
  if (!campo) return;
  const atual = campo.value.trim();
  if (atual.split('; ').includes(texto)) return;
  campo.value = `${atual ? `${atual}; ` : ''}${texto}`.slice(0, 140);
  campo.dispatchEvent(new Event('input', { bubbles: true }));
}

async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes, pedidos, enturmacao, lv] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), matriculas(), conjunto('enturmacao'), letivo()]);
    recarregarDoServidor();
    [dados, escolas, chamadas, meta] = await Promise.all([diario(), carregar('escolas'), conjunto('chamadas'), conjunto('diario-meta')]);
    abonos = abonosPorEstudante(chamadas, await conjunto('justificativas'));
    movs = await conjunto('movimentacoes');
    prof = professores.find((p) => p.id === logado.professorId);
    aulasDadas = lv.aulasDadas;
    bimestres = lv.bimestresLancados;
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
    // Estudantes enturmados pela secretaria entram no diário, com notas em branco.
    const novos = minhas.map(({ turma }) => sincronizarDiario(dados, turma.id, { pedidos, enturmacao })).some(Boolean);
    if (novos) await salvarDados('diario', dados);
    // Registros pendentes aparecem na tela, mas só na memória: quem grava no servidor é a sincronização.
    const fila = await pendentes();
    sobreporPendentes(fila, { dados, chamadas });
    pendentesIds = new Set(fila.filter((f) => f.tipo === 'notas').map((f) => `${f.turmaId}|${f.alunoId}`));
    tirarFoto();
    desenhar();
    indicador ??= montarIndicador({ aoSincronizar: sincronizarAgora });
  } catch { falhaDados(main, mostrar); }
}
function tirarFoto() {
  baseline = {};
  Object.entries(dados).forEach(([t, alunos]) => alunos.forEach((a) => { baseline[`${t}|${a.id}`] = { n1: a.n1, n2: a.n2, faltas: a.faltas, obs: a.obs ?? '' }; }));
}
// Estudantes da turma aberta cujas notas ou faltas mudaram desde a última foto.
const alterados = () => dados[turmaId].filter((a) => { const b = baseline[`${turmaId}|${a.id}`]; return !b || b.n1 !== a.n1 || b.n2 !== a.n2 || b.faltas !== a.faltas || b.obs !== (a.obs ?? ''); });

// Envia o que ficou pendente: relê o "servidor", aplica pela regra do registro mais recente e limpa a fila.
async function sincronizarAgora() {
  const fila = await pendentes();
  if (!fila.length) return;
  try {
    recarregarDoServidor();
    const servidor = { dados: await diario(), chamadas: await conjunto('chamadas'), meta: await conjunto('diario-meta') };
    const r = aplicarPendentes(fila, servidor);
    await salvarDados('diario', servidor.dados);
    await salvarDados('chamadas', servidor.chamadas);
    await salvarDados('diario-meta', servidor.meta);
    for (const f of fila) await baixarPendente(f.chave);
    await registrarAcao(prof?.nome || 'Professor', `Sincronizou o diário offline (${r.enviados} registros)`, 'Diário de classe');
    const hora = (iso) => new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    resultadoSync = `<div class="alerta-info" role="status">${icone('info', 20)}<div><strong>Sincronizado: ${r.enviados} ${r.enviados === 1 ? 'registro enviado' : 'registros enviados'}.</strong>${r.conflitos.length ? `<ul class="lista-texto">${r.conflitos.map((c) => `<li>${esc(c.nome)} (${c.assunto}): ${c.resultado === 'mantido' ? `prevaleceu o registro mais recente, feito em outro aparelho às ${hora(c.servidorEm)}; o seu, das ${hora(c.localEm)}, foi descartado.` : `o seu registro das ${hora(c.localEm)} é mais recente e substituiu o de ${hora(c.servidorEm)}.`}</li>`).join('')}</ul>` : ''}</div></div>`;
    avisar(`Diário sincronizado: ${r.enviados} ${r.enviados === 1 ? 'registro enviado' : 'registros enviados'}${r.conflitos.length ? `, ${r.conflitos.length} ${r.conflitos.length === 1 ? 'conflito resolvido' : 'conflitos resolvidos'}` : ''}.`);
    await mostrar();
  } catch {
    avisar('A sincronização não foi concluída e os registros continuam pendentes. Confira a conexão e clique em Sincronizar agora.');
  }
}

function desenhar() {
  esconderChips();
  if (!minhas.length) {
    main.innerHTML = `<h1>Diário de classe</h1>${vazio('Nenhuma turma alocada', 'O diário abre quando a coordenação da escola aloca você em uma turma aprovada.')}`;
    return;
  }
  if (!minhas.some((m) => m.turma.id === turmaId)) turmaId = minhas[0].turma.id;
  const { turma: t, componente } = minhas.find((m) => m.turma.id === turmaId);
  const escola = escolas.find((e) => e.id === t.escolaId);
  const inativos = estudantesInativos(movs);
  const alunos = dados[turmaId].filter((a) => !inativos.has(a.id)); // transferidos e cancelados saem da chamada e do lançamento
  const fora = dados[turmaId].filter((a) => inativos.has(a.id));
  const campo = (a, c, max) => `<td data-rotulo="${CAMPOS[c]}"><label class="sr-only" for="${a.id}-${c}">${CAMPOS[c]} de ${esc(a.nome)}</label><input id="${a.id}-${c}" class="entrada" inputmode="decimal" data-aluno="${a.id}" data-nome="${esc(a.nome)}" data-campo="${c}" data-max="${max}" data-vazio="${c !== 'faltas' && a[c] === null}" value="${c === 'faltas' ? a[c] : (a[c] === null ? '' : numeroBR(a[c]))}"></td>`;
  main.innerHTML = `
    <div class="barra-turma">
      <div class="campo campo-turma"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
      <p class="info-turma esp-b-0">${esc(nomeCurto(escola.nome))} · turma ${esc(codigoDaTurma(t))} · ${bimestres}º bimestre lançado · ${aulasDadas} aulas dadas</p>
      <a class="botao botao-secundario botao-mini" href="${link('professor/mapa.html')}?turma=${turmaId}">Mapa de calor da turma</a>
    </div>
    <h1 class="esp-b-3">Diário de classe · ${esc(t.nome)} · ${esc(componente)}</h1>
    <div id="resultado-sync" class="esp-b-3">${resultadoSync}</div>
    ${fora.length ? `<p class="texto-suave texto-pequeno esp-b-3">Fora da lista (saíram da escola): ${fora.map((a) => `${esc(a.nome)} (${esc(situacaoDoEstudante(a.id, movs).texto.toLowerCase())})`).join(', ')}.</p>` : ''}
    ${alunos.length ? `${painelChamada(alunos)}
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes tabela-notas"><caption class="sr-only">Chamada, notas e faltas de ${esc(t.nome)}, ${esc(componente)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Faltou hoje</th><th scope="col">Nota do 1º bimestre</th><th scope="col">Nota do 2º bimestre</th><th scope="col" class="num">Faltas</th><th scope="col" class="num">Presença</th><th scope="col">Situação</th><th scope="col">Observação</th></tr></thead>
      <tbody>${alunos.map((a) => { const freq = presenca(a.faltas, aulasDadas); const p = `${freq.toFixed(0)}%`; const sit = situacao(media(a.n1, a.n2), freq); return `<tr><td>${esc(a.nome)}${pendentesIds.has(`${turmaId}|${a.id}`) ? `<span class="pendente-marca">${etiqueta('pendente de envio', 'atencao')}</span>` : ''}<span class="presenca-inline texto-suave">Presença ${p}</span></td>${celulaHoje(a)}${campo(a, 'n1', 10)}${campo(a, 'n2', 10)}${campo(a, 'faltas', aulasDadas)}<td class="presenca-celula num">${p}${abonos[a.id] ? `<small class="abono-marca">${abonos[a.id]} ${abonos[a.id] > 1 ? 'abonadas' : 'abonada'}</small>` : ''}</td><td class="situacao-celula" data-rotulo="Situação">${etiqueta(sit.texto, sit.tipo)}</td>${obsCelula(a)}</tr>`; }).join('')}</tbody>
    </table></div>
    <p class="contagem">${alunos.length} ${alunos.length === 1 ? 'estudante' : 'estudantes'} · Enter desce para o próximo estudante · Shift+Enter sobe · Tab vai para o campo seguinte · Alt+1 a Alt+6 inserem uma observação rápida</p>
    ${alunos.some((a) => abonos[a.id]) ? '<p class="contagem">Faltas abonadas (justificativa aceita pela secretaria) continuam no diário, mas não contam na frequência que o estudante e a família veem.</p>' : ''}
    <div class="barra-acoes compacta"><button type="button" class="botao" id="salvar">Salvar notas e faltas</button><span class="texto-suave" id="estado-diario">As notas salvas aparecem para a família.</span></div>
    <div id="erro-diario" role="alert"></div>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.')}`;
}
// Coluna "Faltou hoje": caixa de marcação enquanto a chamada não foi registrada; depois, o resultado.
function celulaHoje(a) {
  const feita = chamadas[turmaId]?.[hoje];
  if (feita) return `<td data-rotulo="Chamada de hoje">${feita.ausentes.includes(a.id) ? etiqueta('Faltou', 'erro') : '<span class="texto-suave">Presente</span>'}</td>`;
  return `<td data-rotulo="Faltou hoje"><input type="checkbox" class="caixa-grande" data-faltou="${a.id}" aria-label="Faltou hoje: ${esc(a.nome)}" ${ausentes.has(a.id) ? 'checked' : ''}></td>`;
}
// Chamada: todos começam presentes; marque só quem faltou. Registrar soma 1 falta a cada ausente.
function painelChamada(alunos) {
  const feita = chamadas[turmaId]?.[hoje];
  const dataHoje = dataBR(hoje);
  if (feita) {
    const nomes = alunos.filter((a) => feita.ausentes.includes(a.id)).map((a) => a.nome);
    return `<p class="esp-b-3"><strong>Chamada de ${dataHoje} registrada</strong> ${etiqueta('Registrada', 'ok')} ${nomes.length ? `${nomes.length} ${nomes.length > 1 ? 'faltas' : 'falta'}: ${esc(nomes.join(', '))}.` : 'Todos presentes.'} <span class="registro">Registrada em ${dataHoraBR(feita.quando)}</span>${feita.pendente ? ` ${etiqueta('pendente de envio', 'atencao')}` : ''}</p>`;
  }
  return `<div class="linha-botoes entre esp-b-3">
    <p class="esp-t-0 esp-b-0" id="chamada-titulo"><strong>Chamada de ${dataHoje}</strong> · todos começam presentes; marque só quem faltou. <span id="chamada-resumo">${alunos.length - ausentes.size} ${alunos.length - ausentes.size === 1 ? 'presente' : 'presentes'} · ${ausentes.size} ${ausentes.size === 1 ? 'falta' : 'faltas'}</span></p>
    <button type="button" class="botao" id="registrar-chamada">${ausentes.size ? `Registrar chamada com ${ausentes.size} ${ausentes.size > 1 ? 'faltas' : 'falta'}` : 'Registrar chamada: todos presentes'}</button>
  </div>`;
}
async function registrarChamada() {
  const t = minhas.find((x) => x.turma.id === turmaId).turma;
  const alunos = dados[turmaId];
  if (ausentes.size) {
    const nomes = alunos.filter((a) => ausentes.has(a.id)).map((a) => a.nome);
    const ok = await confirmar({ titulo: 'Registrar a chamada de hoje?', texto: `Vai somar 1 falta para: ${nomes.join(', ')}. Depois de registrada, a chamada de hoje não pode ser refeita.`, botao: 'Registrar chamada' });
    if (!ok) return;
  }
  try {
    const agora = new Date().toISOString();
    alunos.forEach((a) => { if (ausentes.has(a.id)) a.faltas += 1; });
    chamadas[turmaId] = { ...(chamadas[turmaId] || {}), [hoje]: { ausentes: [...ausentes], quando: agora } };
    if (!estaOnline()) {
      // Sem conexão: a chamada fica na fila do aparelho e só vai ao servidor na sincronização.
      chamadas[turmaId][hoje].pendente = true;
      await guardarPendente({ chave: `chamada|${turmaId}|${hoje}`, tipo: 'chamada', turmaId, data: hoje, ausentes: [...ausentes], criadoEm: agora });
      const n = ausentes.size;
      ausentes.clear();
      tirarFoto();
      desenhar();
      avisar(`Sem conexão: a chamada de ${t.nome} ficou guardada neste aparelho (${n === 0 ? 'todos presentes' : `${n} ${n === 1 ? 'falta' : 'faltas'}`}) e segue quando a conexão voltar.`);
      return;
    }
    await comEspera(main.querySelector('#registrar-chamada'), async () => {
      await salvarDados('diario', dados);
      await salvarDados('chamadas', chamadas);
      ausentes.forEach((id) => { meta[`${turmaId}|${id}`] = { em: agora }; });
      if (ausentes.size) await salvarDados('diario-meta', meta);
    });
    tirarFoto();
    await registrarAcao(prof.nome, `Registrou chamada (${ausentes.size} falta${ausentes.size === 1 ? '' : 's'})`, t.nome);
    const faltas = ausentes.size;
    ausentes.clear();
    desenhar();
    avisar(`Chamada registrada em ${t.nome}: ${faltas === 0 ? 'todos presentes' : `${faltas} ${faltas === 1 ? 'falta lançada' : 'faltas lançadas'}`}.`);
  } catch {
    avisar('A chamada não foi registrada e nenhuma falta foi lançada. Confira a conexão e clique em Registrar chamada de novo.');
    mostrar();
  }
}
// Regra de um campo do diário: devolve a mensagem de erro ou '' se está certo.
// Nota: 0 a 10 (vírgula ou ponto); faltas: inteiro de 0 ao total de aulas dadas. Nota em branco só vale se ainda não foi lançada.
function erroDoCampo(c) {
  if (c.dataset.campo === 'obs') return '';
  const texto = c.value.trim();
  if (texto === '' && c.dataset.vazio === 'true') return '';
  const v = Number(texto.replace(',', '.'));
  const max = Number(c.dataset.max);
  if (c.dataset.campo === 'faltas') {
    return texto === '' || !Number.isInteger(v) || v < 0 || v > max ? `Faltas inválidas em ${c.dataset.nome}: use um número inteiro de 0 a ${max}.` : '';
  }
  return texto === '' || Number.isNaN(v) || v < 0 || v > max ? `Nota inválida em ${c.dataset.nome}, ${c.dataset.campo === 'n1' ? '1º' : '2º'} bimestre: use um valor de 0 a ${max}.` : '';
}
function mostrarErro(c, texto) {
  const caixa = main.querySelector('#erro-diario');
  if (texto) {
    c.setAttribute('aria-invalid', 'true');
    c.setAttribute('aria-describedby', 'erro-diario');
    caixa.dataset.campo = c.id;
    caixa.innerHTML = `<p class="alerta-erro esp-t-2">${icone('alerta', 20)}<span>${esc(texto)}</span></p>`;
  } else {
    c.removeAttribute('aria-invalid');
    if (caixa.dataset.campo === c.id) { caixa.innerHTML = ''; caixa.dataset.campo = ''; }
  }
}
async function salvar() {
  const campos = [...main.querySelectorAll('[data-aluno]')];
  campos.forEach((c) => c.removeAttribute('aria-invalid'));
  const caixa = main.querySelector('#erro-diario');
  caixa.innerHTML = '';
  for (const c of campos) {
    const texto = erroDoCampo(c);
    if (texto) { mostrarErro(c, texto); c.focus(); return; }
  }
  for (const c of campos) {
    const a = dados[turmaId].find((x) => x.id === c.dataset.aluno);
    if (c.dataset.campo === 'obs') { a.obs = c.value.trim(); continue; }
    if (c.value.trim() === '') continue; // nota ainda não lançada: continua em branco
    const v = Number(c.value.replace(',', '.'));
    a[c.dataset.campo] = c.dataset.campo === 'faltas' ? v : Math.round(v * 10) / 10;
  }
  const mudaram = alterados();
  try {
    if (!estaOnline()) {
      // Sem conexão: cada estudante alterado vira um registro pendente (um por estudante; salvar de novo substitui).
      for (const a of mudaram) {
        const chave = `notas|${turmaId}|${a.id}`;
        const anterior = await pendentePorChave(chave);
        await guardarPendente({ chave, tipo: 'notas', turmaId, alunoId: a.id, valores: { n1: a.n1, n2: a.n2, faltas: a.faltas, obs: a.obs ?? '' }, baseEm: anterior ? anterior.baseEm : (meta[`${turmaId}|${a.id}`]?.em ?? null), criadoEm: new Date().toISOString() });
        pendentesIds.add(`${turmaId}|${a.id}`);
      }
      tirarFoto();
      desenhar();
      avisar(mudaram.length ? `Sem conexão: ${mudaram.length} ${mudaram.length === 1 ? 'estudante salvo' : 'estudantes salvos'} neste aparelho, pendentes de envio. Seguem quando a conexão voltar.` : 'Sem conexão e sem alterações novas para guardar.');
      return;
    }
    const agora = new Date().toISOString();
    await comEspera(main.querySelector('#salvar'), async () => {
      await salvarDados('diario', dados);
      if (mudaram.length) { mudaram.forEach((a) => { meta[`${turmaId}|${a.id}`] = { em: agora }; }); await salvarDados('diario-meta', meta); }
    });
    tirarFoto();
    desenhar();
    avisar(`Notas e faltas salvas: ${dados[turmaId].length} estudantes, turma ${minhas.find((m) => m.turma.id === turmaId).turma.nome}.`);
  } catch {
    caixa.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>As notas e faltas não foram salvas. Confira a conexão e clique em Salvar notas e faltas de novo.</span></p>`;
  }
}
main.addEventListener('click', async (e) => {
  if (e.target.closest('#salvar')) { salvar(); return; }
  const aluno = e.target.closest('[data-faltou]');
  if (aluno) {
    // Só atualiza o resumo da chamada: redesenhar a tabela apagaria as notas digitadas e ainda não salvas.
    const id = aluno.dataset.faltou;
    if (aluno.checked) ausentes.add(id); else ausentes.delete(id);
    const total = dados[turmaId].length;
    const n = ausentes.size;
    const resumo = main.querySelector('#chamada-resumo');
    if (resumo) resumo.textContent = `${total - n} ${total - n === 1 ? 'presente' : 'presentes'} · ${n} ${n === 1 ? 'falta' : 'faltas'}`;
    const registrar = main.querySelector('#registrar-chamada');
    if (registrar) registrar.textContent = n ? `Registrar chamada com ${n} ${n > 1 ? 'faltas' : 'falta'}` : 'Registrar chamada: todos presentes';
    return;
  }
  if (e.target.closest('#registrar-chamada')) registrarChamada();
});
// Validação em tempo real: erro ao digitar/sair do campo; a nota é normalizada para o formato brasileiro (8,5).
main.addEventListener('input', (e) => {
  if (!e.target.dataset?.aluno) return;
  if (e.target.getAttribute('aria-invalid')) mostrarErro(e.target, erroDoCampo(e.target));
  const estado = main.querySelector('#estado-diario');
  if (estado) { estado.textContent = 'Há alterações não salvas.'; estado.classList.add('cor-atencao'); }
});
// Menos esforço no lançamento: o texto do campo já vem selecionado e Enter desce para o mesmo campo do estudante seguinte.
main.addEventListener('focusin', (e) => { if (e.target.dataset?.aluno) e.target.select(); });
main.addEventListener('keydown', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  const alt = /^Digit([1-6])$/.exec(e.code);
  if (e.altKey && alt && c.dataset.campo === 'obs') { e.preventDefault(); aplicarChip(c, CHIPS[Number(alt[1]) - 1]); return; }
  const passo = e.key === 'Enter' ? (e.shiftKey ? -1 : 1) : e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
  if (!passo) return;
  e.preventDefault();
  const mesmos = [...main.querySelectorAll(`[data-campo="${c.dataset.campo}"]`)];
  mesmos[(mesmos.indexOf(c) + passo + mesmos.length) % mesmos.length]?.focus();
});
main.addEventListener('focusout', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  const texto = erroDoCampo(c);
  mostrarErro(c, texto);
  if (!texto && c.dataset.campo !== 'faltas' && c.dataset.campo !== 'obs' && c.value.trim() !== '') c.value = numeroBR(Number(c.value.replace(',', '.')));
});
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; ausentes.clear(); desenhar(); } });
mostrar();
