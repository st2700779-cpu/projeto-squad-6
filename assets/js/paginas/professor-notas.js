// Notas do professor (aba própria, separada do diário de classe).
// Só o bimestre em andamento recebe nota; os anteriores ficam só para consulta e os seguintes, bloqueados.
// Cada nota (prova, atividade) é lançada UMA vez: depois de lançada fica travada e não pode ser alterada.
// Para corrigir uma nota lançada, só pela secretaria. A média do bimestre junta prova (60%), atividade (30%)
// e presença (10%, vinda da chamada do registro de aula). Regras em dominio/diario-bimestral.js.
// Lançar exige conexão: como a nota fica definitiva, ela não espera numa fila offline.
import { iniciar, falhaDados, link } from '../app.js';
import { esc, avisar, icone, numeroBR, confirmar, dataBR, vazio, comEspera, plural } from '../ui.js';
import { carregar, diario, letivo, matriculas, turmasEscola, salvar as salvarDados, conjunto, registrarAcao, recarregarDoServidor } from '../dados.js';
import { estaOnline } from '../offline.js';
import { estudantesInativos } from '../dominio/movimentacao.js';
import { nomeCurto, turmasDoProfessor, sincronizarDiario, codigoDaTurma, semaforoNota } from '../regras.js';
import { PESOS, PARTES, bimestreAtual, estadoDoBimestre, periodoDoBimestre, frequenciaNoPeriodo, notaDePresenca, mediaDoBimestre, lerNota, lancarNotas, parteLancada } from '../dominio/diario-bimestral.js';
import { abasDeBimestre } from '../componentes/abas-bimestre.js';
import { semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/notas.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma');
let dados, prof, escolas, chamadas, minhas, lv, movs = [], meta = {};
let bimVer = null;
const ROTULO = Object.fromEntries(PARTES);

async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes, pedidos, enturmacao, letivoAtual] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), matriculas(), conjunto('enturmacao'), letivo()]);
    recarregarDoServidor();
    [dados, escolas, chamadas, meta, movs] = await Promise.all([diario(), carregar('escolas'), conjunto('chamadas'), conjunto('diario-meta'), conjunto('movimentacoes')]);
    lv = letivoAtual;
    prof = professores.find((p) => p.id === logado.professorId);
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
    const novos = minhas.map(({ turma }) => sincronizarDiario(dados, turma.id, { pedidos, enturmacao })).some(Boolean);
    if (novos) await salvarDados('diario', dados);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}

const atual = () => bimestreAtual(lv);
const presencaDe = (a, b) => frequenciaNoPeriodo(chamadas, turmaId, a.id, periodoDoBimestre(lv, b));
const nota = (v) => (v === null || v === undefined || v === '' ? '—' : numeroBR(v));
const quandoLancou = (a, b, c) => { const em = a.partes?.[b]?.em?.[c]; return em ? dataBR(em.slice(0, 10)).slice(0, 5) : ''; };
const celulaMedia = (id, m) => `<td class="num" data-rotulo="Média do bimestre"><div ${id ? `id="${id}-media"` : ''}>${m === null || m === undefined ? '<span class="texto-suave">—</span>' : semaforo({ ...semaforoNota(m), texto: numeroBR(m) })}</div></td>`;

/** Parte travada: o valor, um cadeado e quando foi lançada. */
const celulaTravada = (a, b, c) => `<td data-rotulo="${ROTULO[c]}"><div class="nota-travada" title="Lançada${quandoLancou(a, b, c) ? ` em ${quandoLancou(a, b, c)}` : ''}: não pode ser alterada">${icone('cadeado', 14)}<strong>${nota(a.partes[b][c])}</strong>${quandoLancou(a, b, c) ? `<small>${quandoLancou(a, b, c)}</small>` : ''}</div></td>`;
const celulaAberta = (a, b, c, pres) => `<td data-rotulo="${ROTULO[c]}"><label class="sr-only" for="${a.id}-${c}">${ROTULO[c]} do ${b}º bimestre de ${esc(a.nome)}</label><input id="${a.id}-${c}" class="entrada entrada-nota" inputmode="decimal" data-formato="nota" maxlength="5" autocomplete="off" data-aluno="${a.id}" data-nome="${esc(a.nome)}" data-campo="${c}" data-presenca="${pres}" placeholder="0 a 10"></td>`;

function linhaAberta(a, b) {
  const fr = presencaDe(a, b);
  const pres = notaDePresenca(fr.percentual);
  const p = a.partes?.[b] || {};
  const m = mediaDoBimestre({ prova: p.prova, atividade: p.atividade, presenca: pres });
  const completo = PARTES.every(([c]) => parteLancada(a, b, c));
  return `<tr class="${completo ? 'linha-travada' : ''}"><td>${esc(a.nome)}</td>
    ${PARTES.map(([c]) => (parteLancada(a, b, c) ? celulaTravada(a, b, c) : celulaAberta(a, b, c, pres))).join('')}
    <td class="num" data-rotulo="Presença (nota)"><div><strong>${numeroBR(pres)}</strong><small class="texto-suave">${fr.percentual === null ? 'sem chamada' : `${numeroBR(fr.percentual, 0)}% de presença`}</small></div></td>
    ${celulaMedia(a.id, m)}</tr>`;
}
function linhaFechada(a, b) {
  const p = a.partes?.[b];
  return `<tr><td>${esc(a.nome)}</td>${PARTES.map(([c]) => `<td class="num" data-rotulo="${ROTULO[c]}"><div>${p ? nota(p[c]) : '—'}</div></td>`).join('')}${celulaMedia('', a[`n${b}`])}</tr>`;
}

function desenhar() {
  if (!minhas.length) { main.innerHTML = `<h1>Notas</h1>${vazio('Nenhuma turma alocada', 'As notas abrem quando a coordenação da escola aloca você em uma turma aprovada.')}`; return; }
  if (!minhas.some((m) => m.turma.id === turmaId)) turmaId = minhas[0].turma.id;
  const at = atual();
  if (!bimVer || estadoDoBimestre(bimVer, at) === 'bloqueado') bimVer = at;
  const aberto = estadoDoBimestre(bimVer, at) === 'aberto';
  const { turma: t, componente } = minhas.find((m) => m.turma.id === turmaId);
  const escola = escolas.find((e) => e.id === t.escolaId);
  const inativos = estudantesInativos(movs);
  const alunos = dados[turmaId].filter((a) => !inativos.has(a.id));
  const per = periodoDoBimestre(lv, bimVer);
  const contagem = (c) => alunos.filter((a) => parteLancada(a, bimVer, c)).length;
  const faltam = aberto && PARTES.some(([c]) => contagem(c) < alunos.length);
  main.innerHTML = `
    <div class="barra-turma">
      <div class="campo campo-turma"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
      <p class="info-turma esp-b-0">${esc(nomeCurto(escola.nome))} · turma ${esc(codigoDaTurma(t))} · ${at}º bimestre em andamento</p>
      <a class="botao botao-secundario botao-mini" href="${link('professor/diario.html')}?turma=${turmaId}">Diário e frequência</a>
    </div>
    <h1 class="esp-b-3">Notas · ${esc(t.nome)} · ${esc(componente)}</h1>
    ${alunos.length ? `${abasDeBimestre(lv, at, bimVer)}
    <p class="esp-t-2 esp-b-2"><strong>${bimVer}º bimestre</strong>${per ? ` · ${dataBR(per.inicio)} a ${dataBR(per.fim)}` : ''} · ${aberto ? `média = prova × ${PESOS.prova * 100}% + atividade × ${PESOS.atividade * 100}% + presença × ${PESOS.presenca * 100}% (a presença vem da chamada).` : 'fechado: só consulta.'}</p>
    ${aberto ? `<div class="alerta-info esp-b-3">${icone('cadeado', 20)}<div><strong>Cada nota é lançada uma vez.</strong> Depois de lançada, fica travada e não pode ser alterada. Para corrigir uma nota lançada, procure a secretaria.</div></div>
    <p class="contagem esp-b-2">${PARTES.map(([c, r]) => `${r}: ${contagem(c)} de ${alunos.length} lançadas`).join(' · ')}</p>` : ''}
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes tabela-notas"><caption class="sr-only">Notas do ${bimVer}º bimestre de ${esc(t.nome)}, ${esc(componente)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Prova <small class="th-apoio">peso 60%</small></th><th scope="col">Atividade <small class="th-apoio">peso 30%</small></th>${aberto ? '<th scope="col" class="num">Presença <small class="th-apoio">peso 10%</small></th>' : ''}<th scope="col" class="num">Média do bimestre</th></tr></thead>
      <tbody>${alunos.map((a) => (aberto ? linhaAberta(a, bimVer) : linhaFechada(a, bimVer))).join('')}</tbody>
    </table></div>
    ${faltam ? `<p class="contagem">Enter desce para o próximo estudante · Shift+Enter sobe · deixe em branco quem ainda não fez a avaliação</p>
    <div class="barra-acoes compacta"><button type="button" class="botao" id="lancar">${icone('cadeado', 18)}Lançar notas do ${bimVer}º bimestre</button><span class="texto-suave" id="estado-notas">Só as notas preenchidas são lançadas.</span></div>` : aberto ? `<div class="alerta-info esp-t-3">${icone('ok', 20)}<div>Todas as notas do ${bimVer}º bimestre desta turma já foram lançadas.</div></div>` : ''}
    <div id="erro-notas" role="alert"></div>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.')}`;
}

function erroDoCampo(c) {
  const r = lerNota(c.value);
  return r.erro ? `${ROTULO[c.dataset.campo]} de ${c.dataset.nome}: ${r.erro}` : '';
}
function mostrarErro(c, texto) {
  const caixa = main.querySelector('#erro-notas');
  if (texto) {
    c.setAttribute('aria-invalid', 'true');
    c.setAttribute('aria-describedby', 'erro-notas');
    caixa.dataset.campo = c.id;
    caixa.innerHTML = `<p class="alerta-erro esp-t-2">${icone('alerta', 20)}<span>${esc(texto)}</span></p>`;
  } else {
    c.removeAttribute('aria-invalid');
    if (caixa.dataset.campo === c.id) { caixa.innerHTML = ''; caixa.dataset.campo = ''; }
  }
}

async function lancar() {
  if (estadoDoBimestre(bimVer, atual()) !== 'aberto') return;
  const campos = [...main.querySelectorAll('input[data-aluno]')];
  main.querySelector('#erro-notas').innerHTML = '';
  for (const c of campos) { const t = erroDoCampo(c); if (t) { mostrarErro(c, t); c.focus(); return; } }
  const porAluno = {};
  for (const c of campos) { const v = lerNota(c.value).valor; if (v !== null) (porAluno[c.dataset.aluno] ||= {})[c.dataset.campo] = v; }
  const qtd = Object.fromEntries(PARTES.map(([c]) => [c, Object.values(porAluno).filter((v) => v[c] !== undefined).length]));
  const total = qtd.prova + qtd.atividade;
  if (!total) { avisar('Preencha ao menos uma nota para lançar.', 'erro'); campos[0]?.focus(); return; }
  if (!estaOnline()) { avisar('Sem conexão: para lançar notas é preciso estar conectado, porque a nota lançada fica definitiva.', 'erro'); return; }
  const detalhe = PARTES.filter(([c]) => qtd[c]).map(([c, r]) => `${qtd[c]} ${plural(qtd[c], r.toLowerCase(), `${r.toLowerCase()}s`)}`).join(' e ');
  if (!(await confirmar({ titulo: `Lançar ${total} ${plural(total, 'nota', 'notas')}?`, texto: `Você vai lançar ${detalhe} do ${bimVer}º bimestre. Depois de lançadas, as notas ficam travadas e não podem ser alteradas.`, botao: 'Lançar e travar' }))) return;
  const quando = new Date().toISOString();
  try {
    await comEspera(main.querySelector('#lancar'), async () => {
      // Relê o "servidor": se a mesma nota já foi lançada em outro aparelho, ela não é sobrescrita.
      recarregarDoServidor();
      const servidor = await diario();
      const recusadas = [];
      servidor[turmaId] = servidor[turmaId].map((a) => {
        const v = porAluno[a.id];
        if (!v) return a;
        const r = lancarNotas(a, bimVer, v, notaDePresenca(presencaDe(a, bimVer).percentual), quando);
        if (r.erro) { recusadas.push(`${a.nome}: ${r.erro}`); return a; }
        if (r.lancou.length) meta[`${turmaId}|${a.id}`] = { em: quando };
        return r.aluno;
      });
      await salvarDados('diario', servidor);
      await salvarDados('diario-meta', meta);
      dados = servidor;
      const turma = minhas.find((m) => m.turma.id === turmaId).turma.nome;
      await registrarAcao(prof?.nome || 'Professor', `Lançou ${total} ${plural(total, 'nota', 'notas')} do ${bimVer}º bimestre`, turma);
      desenhar();
      if (recusadas.length) main.querySelector('#erro-notas').innerHTML = `<div class="alerta-erro esp-t-2">${icone('alerta', 20)}<div><strong>Algumas notas já tinham sido lançadas em outro aparelho e foram mantidas:</strong><ul class="lista-texto">${recusadas.map((t) => `<li>${esc(t)}</li>`).join('')}</ul></div></div>`;
      avisar(`${total} ${plural(total, 'nota lançada', 'notas lançadas')} e ${plural(total, 'travada', 'travadas')} na turma ${turma}.`);
    });
  } catch {
    main.querySelector('#erro-notas').innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>As notas não foram lançadas. Confira a conexão e tente de novo.</span></p>`;
  }
}

const preenchidas = () => [...main.querySelectorAll('input[data-aluno]')].some((c) => c.value.trim());
main.addEventListener('click', async (e) => {
  if (e.target.closest('#lancar')) { lancar(); return; }
  const aba = e.target.closest('[data-bim]');
  if (aba && !aba.disabled) {
    if (preenchidas() && !(await confirmar({ titulo: 'Trocar de bimestre sem lançar?', texto: 'As notas digitadas e ainda não lançadas vão se perder.', botao: 'Trocar sem lançar' }))) return;
    bimVer = Number(aba.dataset.bim); desenhar(); main.querySelector(`[data-bim="${bimVer}"]`)?.focus();
  }
});
// Média ao vivo: com prova e atividade (lançadas ou digitadas), mostra como a média vai ficar.
main.addEventListener('input', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  if (c.getAttribute('aria-invalid')) mostrarErro(c, erroDoCampo(c));
  const id = c.dataset.aluno;
  const a = dados[turmaId].find((x) => x.id === id);
  const valor = (campo) => (parteLancada(a, bimVer, campo) ? a.partes[bimVer][campo] : lerNota(main.querySelector(`#${CSS.escape(id)}-${campo}`)?.value).valor);
  const m = mediaDoBimestre({ prova: valor('prova'), atividade: valor('atividade'), presenca: Number(c.dataset.presenca) });
  const alvo = main.querySelector(`#${CSS.escape(id)}-media`);
  if (alvo) alvo.innerHTML = m === null ? '<span class="texto-suave">—</span>' : semaforo({ ...semaforoNota(m), texto: numeroBR(m) });
  const estado = main.querySelector('#estado-notas');
  if (estado) { estado.textContent = 'Há notas digitadas e ainda não lançadas.'; estado.classList.add('cor-atencao'); }
});
main.addEventListener('focusin', (e) => { if (e.target.dataset?.aluno) e.target.select(); });
main.addEventListener('keydown', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  const passo = e.key === 'Enter' ? (e.shiftKey ? -1 : 1) : e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
  if (!passo) return;
  e.preventDefault();
  const mesmos = [...main.querySelectorAll(`input[data-campo="${c.dataset.campo}"]`)];
  mesmos[(mesmos.indexOf(c) + passo + mesmos.length) % mesmos.length]?.focus();
});
main.addEventListener('focusout', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  const texto = erroDoCampo(c);
  mostrarErro(c, texto);
  if (!texto && c.value.trim() !== '') c.value = numeroBR(lerNota(c.value).valor);
});
main.addEventListener('change', async (e) => {
  if (e.target.id !== 'turma') return;
  if (preenchidas() && !(await confirmar({ titulo: 'Trocar de turma sem lançar?', texto: 'As notas digitadas e ainda não lançadas vão se perder.', botao: 'Trocar sem lançar' }))) { e.target.value = turmaId; return; }
  turmaId = e.target.value; desenhar();
});
addEventListener('beforeunload', (e) => { if (preenchidas()) e.preventDefault(); });
mostrar();
