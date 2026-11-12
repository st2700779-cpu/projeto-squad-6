// Diário de classe (HU11; wireframe W13): frequência e observações da turma, por bimestre. As notas ficam na aba Notas.
// As faltas não são digitadas: vêm da chamada feita no Registro de aula, que é a trilha da frequência.
// Uma falta só sai com um motivo escolhido na lista (sem digitação); a data, o motivo e quem retirou ficam na chamada.
// Só o bimestre em andamento aceita retirada; os anteriores ficam só para consulta (dominio/diario-bimestral.js).
// Sem conexão (real ou simulada pelo botão Ficar offline), as observações ficam em IndexedDB como "pendentes"
// (offline.js) e seguem para o "servidor" quando a conexão volta (dominio/sincronizacao.js).
import { iniciar, falhaDados, link } from '../app.js';
import { esc, avisar, icone, numeroBR, dataBR, vazio, etiqueta, comEspera, abrirJanela, plural } from '../ui.js';
import { carregar, diario, letivo, matriculas, turmasEscola, salvar as salvarDados, conjunto, registrarAcao, recarregarDoServidor } from '../dados.js';
import { estaOnline, montarIndicador, guardarPendente, pendentes, baixarPendente, pendentePorChave } from '../offline.js';
import { aplicarPendentes, sobreporPendentes } from '../dominio/sincronizacao.js';
import { hojeISO } from '../dominio/hoje.js';
import { abonosPorEstudante } from '../dominio/vida-escolar.js';
import { estudantesInativos, situacaoDoEstudante } from '../dominio/movimentacao.js';
import { nomeCurto, turmasDoProfessor, sincronizarDiario, codigoDaTurma, semaforoFrequencia } from '../regras.js';
import { bimestreAtual, estadoDoBimestre, periodoDoBimestre, frequenciaNoPeriodo, faltasDoEstudante, retirarFalta, atualizarMedias, MOTIVOS_RETIRADA, textoDoMotivo } from '../dominio/diario-bimestral.js';
import { abasDeBimestre } from '../componentes/abas-bimestre.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma');
let dados, prof, escolas, chamadas, minhas, meta, abonos = {}, movs = [];
let bimVer = null;
let letivoAtual = null; // bimestre aberto na tela (padrão: o em andamento)
let baseline = {};          // observação de cada estudante no último carregamento ou gravação (para achar o que mudou)
let pendentesIds = new Set(); // estudantes com observação pendente de envio ('turma|aluno')
let resultadoSync = '';     // aviso do último resultado de sincronização, mostrado na tela
let indicador = null;
const hoje = hojeISO();
// Observações rápidas: um painel flutuante sob o campo em foco (sem mexer na altura das linhas e sem ser cortado pela rolagem da tabela).
const flutuante = document.createElement('div');
flutuante.className = 'chips-flutuantes';
flutuante.hidden = true;
flutuante.setAttribute('role', 'group');
flutuante.setAttribute('aria-label', 'Observações rápidas');
let campoObs = null;

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
    letivoAtual = lv;
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
    // Estudantes enturmados pela secretaria entram no diário.
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
  Object.entries(dados).forEach(([t, alunos]) => alunos.forEach((a) => { baseline[`${t}|${a.id}`] = a.obs ?? ''; }));
}
// Estudantes da turma aberta cuja observação mudou desde a última foto.
const alterados = () => dados[turmaId].filter((a) => baseline[`${turmaId}|${a.id}`] !== (a.obs ?? ''));
const lerObservacoes = () => main.querySelectorAll('[data-campo="obs"]').forEach((c) => { const a = dados[turmaId].find((x) => x.id === c.dataset.aluno); if (a) a.obs = c.value.trim(); });

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

const atual = () => bimestreAtual(letivoAtual);
const periodo = (b) => periodoDoBimestre(letivoAtual, b);
/** Frequência do estudante no bimestre, pelas chamadas (a trilha do registro de aula). */
const freqDoBimestre = (a, b) => frequenciaNoPeriodo(chamadas, turmaId, a.id, periodo(b));

/** Faltas (quantas aulas perdeu) e frequência (porcentagem de presença): coisas diferentes, mostradas de jeitos diferentes. */
const celulaFaltas = (n, rot) => `<td class="num celula-faltas" data-rotulo="${rot}"><div><strong>${n}</strong> <span class="texto-suave texto-pequeno">${n === 1 ? 'aula' : 'aulas'}</span></div></td>`;
const celulaFrequencia = (pct, rot) => (pct === null
  ? `<td data-rotulo="${rot}"><div class="texto-suave texto-pequeno">sem chamada</div></td>`
  : `<td data-rotulo="${rot}"><div class="barra-frequencia" title="${numeroBR(pct, 0)}% de presença"><span style="width:${Math.max(0, Math.min(100, pct))}%" class="nivel-${semaforoFrequencia(pct).chave}"></span></div><small class="valor-frequencia">${numeroBR(pct, 0)}%</small></td>`);

function linha(a, b, aberto) {
  const fr = freqDoBimestre(a, b);
  if (!aberto) return `<tr><td>${esc(a.nome)}</td>${fr.aulas ? `${celulaFaltas(fr.faltas, 'Faltas no bimestre')}${celulaFrequencia(fr.percentual, 'Frequência no bimestre')}` : '<td class="texto-suave" data-rotulo="Faltas no bimestre"><div>—</div></td><td class="texto-suave" data-rotulo="Frequência no bimestre"><div>—</div></td>'}</tr>`;
  return `<tr><td>${esc(a.nome)}${pendentesIds.has(`${turmaId}|${a.id}`) ? `<span class="pendente-marca">${etiqueta('pendente de envio', 'atencao')}</span>` : ''}</td>
    ${celulaFaltas(fr.faltas, 'Faltas no bimestre')}${celulaFrequencia(fr.percentual, 'Frequência no bimestre')}
    <td data-rotulo="Retirar falta">${fr.faltas ? `<button type="button" class="botao botao-secundario botao-mini" data-retirar="${a.id}">Retirar falta</button>` : '<span class="texto-suave texto-pequeno">sem faltas</span>'}</td>
    ${obsCelula(a)}</tr>`;
}
/** Trilha da frequência: as últimas chamadas da turma, que vêm do registro de aula, com as faltas retiradas e o motivo. */
function trilha(alunos) {
  const lista = Object.entries(chamadas[turmaId] || {}).sort(([x], [y]) => y.localeCompare(x)).slice(0, 5);
  const feitaHoje = chamadas[turmaId]?.[hoje];
  const primeiro = (id) => (alunos.find((a) => a.id === id)?.nome || '').split(' ')[0];
  return `<section class="trilha-frequencia" aria-labelledby="trilha-titulo"><div class="linha-entre"><h2 id="trilha-titulo" class="esp-t-0">Frequência: trilha das chamadas</h2>
      <a class="botao ${feitaHoje ? 'botao-secundario' : ''} botao-mini" href="${link('professor/registro-aula.html')}?turma=${turmaId}">${feitaHoje ? 'Ver o registro de hoje' : 'Registrar aula e chamada de hoje'}</a></div>
    <p class="texto-suave texto-pequeno esp-t-0">As faltas não são digitadas aqui: cada aula registrada com chamada soma, para quem faltou, as aulas do dia pela grade.</p>
    ${lista.length ? `<ul class="lista-trilha">${lista.map(([d, c]) => { const nomes = c.ausentes.map(primeiro).filter(Boolean); const ret = (c.retiradas || []).map((r) => `${esc(primeiro(r.alunoId))} (${esc(textoDoMotivo(r.motivo).toLowerCase())})`); return `<li><strong>${dataBR(d).slice(0, 5)}</strong> · ${Number(c.aulas) || 1} ${Number(c.aulas) > 1 ? 'aulas' : 'aula'} · ${nomes.length ? `${nomes.length} ${nomes.length > 1 ? 'faltaram' : 'faltou'}: ${esc(nomes.join(', '))}` : 'todos presentes'}${ret.length ? `<span class="trilha-retirada"> · falta retirada: ${ret.join(', ')}</span>` : ''}${c.pendente ? ` ${etiqueta('pendente de envio', 'atencao')}` : ''}</li>`; }).join('')}</ul>` : '<p class="texto-suave">Nenhuma chamada registrada nesta turma ainda.</p>'}
  </section>`;
}

function desenhar() {
  esconderChips();
  if (!minhas.length) {
    main.innerHTML = `<h1>Diário de classe</h1>${vazio('Nenhuma turma alocada', 'O diário abre quando a coordenação da escola aloca você em uma turma aprovada.')}`;
    return;
  }
  if (!minhas.some((m) => m.turma.id === turmaId)) turmaId = minhas[0].turma.id;
  const at = atual();
  if (!bimVer || estadoDoBimestre(bimVer, at) === 'bloqueado') bimVer = at;
  const aberto = estadoDoBimestre(bimVer, at) === 'aberto';
  const { turma: t, componente } = minhas.find((m) => m.turma.id === turmaId);
  const escola = escolas.find((e) => e.id === t.escolaId);
  const inativos = estudantesInativos(movs);
  const alunos = dados[turmaId].filter((a) => !inativos.has(a.id)); // transferidos e cancelados saem da chamada
  const fora = dados[turmaId].filter((a) => inativos.has(a.id));
  const per = periodo(bimVer);
  main.innerHTML = `
    <div class="barra-turma">
      <div class="campo campo-turma"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
      <p class="info-turma esp-b-0">${esc(nomeCurto(escola.nome))} · turma ${esc(codigoDaTurma(t))} · ${at}º bimestre em andamento</p>
      <div class="linha-botoes"><a class="botao botao-secundario botao-mini" href="${link('professor/notas.html')}?turma=${turmaId}">Notas da turma</a><a class="botao botao-secundario botao-mini" href="${link('professor/mapa.html')}?turma=${turmaId}">Mapa de calor</a></div>
    </div>
    <h1 class="esp-b-3">Diário de classe · ${esc(t.nome)} · ${esc(componente)}</h1>
    <div id="resultado-sync" class="esp-b-3">${resultadoSync}</div>
    ${fora.length ? `<p class="texto-suave texto-pequeno esp-b-3">Fora da lista (saíram da escola): ${fora.map((a) => `${esc(a.nome)} (${esc(situacaoDoEstudante(a.id, movs).texto.toLowerCase())})`).join(', ')}.</p>` : ''}
    ${alunos.length ? `${trilha(alunos)}
    ${abasDeBimestre(letivoAtual, at, bimVer)}
    <p class="esp-t-2 esp-b-2"><strong>${bimVer}º bimestre</strong>${per ? ` · ${dataBR(per.inicio)} a ${dataBR(per.fim)}` : ''} · ${aberto ? 'para retirar uma falta, escolha a data e o motivo. A retirada fica registrada.' : 'fechado: só consulta.'}</p>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes tabela-frequencia"><caption class="sr-only">${bimVer}º bimestre de ${esc(t.nome)}, ${esc(componente)}: faltas e frequência</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col" class="num">Faltas <span class="sr-only">no bimestre, em aulas</span><small class="th-apoio">aulas perdidas</small></th><th scope="col">Frequência <small class="th-apoio">% de presença</small></th>${aberto ? '<th scope="col"><span class="sr-only">Retirar falta</span></th><th scope="col">Observação</th>' : ''}</tr></thead>
      <tbody>${alunos.map((a) => linha(a, bimVer, aberto)).join('')}</tbody>
    </table></div>
    <p class="contagem">${alunos.length} ${alunos.length === 1 ? 'estudante' : 'estudantes'}${aberto ? ' · Alt+1 a Alt+6 inserem uma observação rápida' : ''}</p>
    ${alunos.some((a) => abonos[a.id]) ? '<p class="contagem">Faltas abonadas (atestado aceito pela secretaria) continuam na trilha, mas não contam na frequência que o estudante e a família veem.</p>' : ''}
    ${aberto ? `<div class="barra-acoes compacta"><button type="button" class="botao" id="salvar">Salvar observações</button><span class="texto-suave" id="estado-diario">As observações ficam no diário da turma.</span></div>` : ''}
    <div id="erro-diario" role="alert"></div>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.')}`;
}

async function salvar() {
  if (estadoDoBimestre(bimVer, atual()) !== 'aberto') return;
  lerObservacoes();
  const mudaram = alterados();
  const caixa = main.querySelector('#erro-diario');
  caixa.innerHTML = '';
  if (!mudaram.length) { avisar('Nenhuma observação nova para salvar.'); return; }
  try {
    if (!estaOnline()) {
      // Sem conexão: cada estudante alterado vira um registro pendente (um por estudante; salvar de novo substitui).
      for (const a of mudaram) {
        const chave = `notas|${turmaId}|${a.id}`;
        const anterior = await pendentePorChave(chave);
        await guardarPendente({ chave, tipo: 'notas', turmaId, alunoId: a.id, valores: { obs: a.obs ?? '' }, baseEm: anterior ? anterior.baseEm : (meta[`${turmaId}|${a.id}`]?.em ?? null), criadoEm: new Date().toISOString() });
        pendentesIds.add(`${turmaId}|${a.id}`);
      }
      tirarFoto();
      desenhar();
      avisar(`Sem conexão: ${mudaram.length} ${plural(mudaram.length, 'observação salva', 'observações salvas')} neste aparelho, pendentes de envio.`);
      return;
    }
    const agora = new Date().toISOString();
    await comEspera(main.querySelector('#salvar'), async () => {
      recarregarDoServidor();
      const servidor = await diario();
      const obs = Object.fromEntries(mudaram.map((a) => [a.id, a.obs ?? '']));
      servidor[turmaId] = servidor[turmaId].map((a) => (a.id in obs ? { ...a, obs: obs[a.id] } : a));
      await salvarDados('diario', servidor);
      mudaram.forEach((a) => { meta[`${turmaId}|${a.id}`] = { em: agora }; });
      await salvarDados('diario-meta', meta);
      dados = servidor;
    });
    tirarFoto();
    desenhar();
    avisar(`${mudaram.length} ${plural(mudaram.length, 'observação salva', 'observações salvas')}.`);
  } catch {
    caixa.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>As observações não foram salvas. Confira a conexão e tente de novo.</span></p>`;
  }
}

/** Janela de retirada: a data da falta e o motivo são escolhidos na lista, sem digitação. */
function pedirRetirada(aluno, faltas) {
  const html = `
    <h2 id="retirar-titulo" class="esp-t-0">Retirar falta de ${esc(aluno.nome)}</h2>
    <fieldset class="campo"><legend>Data da falta</legend>
      <div class="lista-opcoes">${faltas.map((f, i) => `<label class="opcao-radio"><input type="radio" name="ret-data" value="${f.data}" ${i === 0 ? 'checked' : ''}><span>${dataBR(f.data)} <small class="texto-suave">· ${f.aulas} ${plural(f.aulas, 'aula', 'aulas')}</small></span></label>`).join('')}</div>
    </fieldset>
    <fieldset class="campo"><legend>Motivo</legend>
      <div class="lista-opcoes">${MOTIVOS_RETIRADA.map(([k, t]) => `<label class="opcao-radio"><input type="radio" name="ret-motivo" value="${k}"><span>${esc(t)}</span></label>`).join('')}</div>
      <p class="texto-suave texto-pequeno esp-t-1">Atestado médico não é retirada: é abono, e quem registra é a secretaria.</p>
      <p id="ret-erro" class="erro" role="alert"></p>
    </fieldset>
    <div class="linha-botoes fim">
      <button type="button" class="botao botao-secundario" data-acao="cancelar">Cancelar</button>
      <button type="button" class="botao" data-acao="retirar">Retirar falta</button>
    </div>`;
  return abrirJanela(html, {
    foco: 'input[name="ret-data"]:checked',
    aoClicar(e, fechar) {
      const acao = e.target.closest('[data-acao]')?.dataset.acao;
      if (acao === 'cancelar') fechar(null);
      if (acao !== 'retirar') return;
      const j = e.currentTarget;
      const data = j.querySelector('input[name="ret-data"]:checked')?.value;
      const motivo = j.querySelector('input[name="ret-motivo"]:checked')?.value;
      if (!motivo) { j.querySelector('#ret-erro').textContent = 'Escolha o motivo da retirada.'; j.querySelector('input[name="ret-motivo"]').focus(); return; }
      fechar({ data, motivo });
    }
  });
}
async function retirar(alunoId) {
  if (estadoDoBimestre(bimVer, atual()) !== 'aberto') return;
  const aluno = dados[turmaId].find((a) => a.id === alunoId);
  const faltas = faltasDoEstudante(chamadas, turmaId, alunoId, periodo(bimVer));
  if (!faltas.length) return;
  if (!estaOnline()) { avisar('Sem conexão: para retirar uma falta é preciso estar conectado.', 'erro'); return; }
  const escolha = await pedirRetirada(aluno, faltas);
  if (!escolha) return;
  lerObservacoes();
  try {
    recarregarDoServidor();
    const [cham, servidor] = await Promise.all([conjunto('chamadas'), diario()]);
    const r = retirarFalta({ chamadas: cham, alunos: servidor[turmaId], turmaId, data: escolha.data, alunoId, motivo: escolha.motivo, quando: new Date().toISOString(), por: prof.id });
    if (r.erro) { avisar(r.erro, 'erro'); return; }
    // A presença entra na média do bimestre: a média de quem já tem prova e atividade lançadas é refeita.
    servidor[turmaId] = atualizarMedias(r.diario, r.chamadas, turmaId, letivoAtual).map((a) => ({ ...a, obs: dados[turmaId].find((x) => x.id === a.id)?.obs ?? a.obs }));
    await salvarDados('chamadas', r.chamadas);
    await salvarDados('diario', servidor);
    await registrarAcao(prof.nome, `Retirou falta de ${aluno.nome} (${textoDoMotivo(escolha.motivo)})`, `${minhas.find((m) => m.turma.id === turmaId).turma.nome} · ${dataBR(escolha.data)}`);
    chamadas = r.chamadas; dados = servidor;
    desenhar();
    avisar(`Falta de ${dataBR(escolha.data)} retirada: ${textoDoMotivo(escolha.motivo).toLowerCase()}.`, 'ok');
  } catch {
    avisar('A falta não foi retirada. Confira a conexão e tente de novo.', 'erro');
  }
}

main.addEventListener('click', async (e) => {
  if (e.target.closest('#salvar')) { salvar(); return; }
  const ret = e.target.closest('[data-retirar]');
  if (ret) { retirar(ret.dataset.retirar); return; }
  const aba = e.target.closest('[data-bim]');
  if (aba && !aba.disabled) {
    lerObservacoes(); // a observação é do estudante, não do bimestre: continua na tela até ser salva
    bimVer = Number(aba.dataset.bim); desenhar(); main.querySelector(`[data-bim="${bimVer}"]`)?.focus();
  }
});
main.addEventListener('input', (e) => {
  if (e.target.dataset?.campo !== 'obs') return;
  const estado = main.querySelector('#estado-diario');
  if (estado) { estado.textContent = 'Há observações não salvas.'; estado.classList.add('cor-atencao'); }
});
main.addEventListener('keydown', (e) => {
  const c = e.target;
  if (c.dataset?.campo !== 'obs') return;
  const alt = /^Digit([1-6])$/.exec(e.code);
  if (e.altKey && alt) { e.preventDefault(); aplicarChip(c, CHIPS[Number(alt[1]) - 1]); return; }
  const passo = e.key === 'Enter' ? (e.shiftKey ? -1 : 1) : 0;
  if (!passo) return;
  e.preventDefault();
  const mesmos = [...main.querySelectorAll('[data-campo="obs"]')];
  mesmos[(mesmos.indexOf(c) + passo + mesmos.length) % mesmos.length]?.focus();
});
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { lerObservacoes(); turmaId = e.target.value; desenhar(); } });
mostrar();
