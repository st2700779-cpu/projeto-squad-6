// Gestão de horários: a coordenação troca a matéria de cada aula na grade da turma. A troca é bloqueada se o professor
// já estiver em outra turma no mesmo horário, e o quadro mostra quantas aulas de cada matéria a grade tem em relação à matriz.
// Arrastar e soltar fica para uma segunda fase.
import { iniciar, falhaDados } from '../app.js';
import { sessao } from '../auth.js';
import { esc, avisar, vazio, plural } from '../ui.js';
import { carregar, conjunto, salvar, registrarAcao } from '../dados.js';
import { DIAS, NOME_DO_DIA, horaDaAula, conflitosDeHorario, colunaDaMatriz } from '../regras.js';
import { semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'coordenador', pagina: 'coordenador/horarios.html', assistente: false });
let horarios, professores, alocacoes, matrizes, escolaId, turmaId;

const nomeDe = (id) => professores.find((p) => p.id === id)?.nome;
// Professor da matéria na turma: o da alocação; sem alocação, o primeiro habilitado da escola.
const professorPara = (tId, componente) => alocacoes.find((a) => a.turmaId === tId && a.componente === componente)?.professorId ?? professores.find((p) => p.escolaId === escolaId && p.habilitacao.includes(componente))?.id ?? null;

function esperadoDaMatriz(grade) {
  const col = colunaDaMatriz(grade.turma.includes('série') ? `${grade.turma.slice(0, 2)} série EM` : '');
  if (!col) return null;
  const versao = col === 3 ? matrizes.versoes[1] : matrizes.versoes[0];
  return Object.fromEntries(versao.componentes.map(([nome, ...aulas]) => [nome, aulas[col - 1]]));
}
function quadroDeAulas(grade) {
  const contagem = {};
  DIAS.forEach((d) => grade.aulas[d].forEach((a) => { contagem[a.componente] = (contagem[a.componente] || 0) + 1; }));
  const esperado = esperadoDaMatriz(grade);
  const itens = Object.keys({ ...(esperado || {}), ...contagem }).filter((c) => contagem[c] || esperado?.[c]).sort();
  return `<div class="tabela-rolagem sem-limite"><table class="tabela" style="min-width:0"><caption class="sr-only">Aulas por semana de cada matéria</caption>
    <thead><tr><th scope="col">Matéria</th><th scope="col" class="num">Na grade</th>${esperado ? '<th scope="col" class="num">Na matriz</th><th scope="col">Situação</th>' : ''}</tr></thead>
    <tbody>${itens.map((c) => { const g = contagem[c] || 0, e = esperado?.[c] ?? 0; const dif = g - e; return `<tr><td>${esc(c)}</td><td class="num">${g}</td>${esperado ? `<td class="num">${e}</td><td>${dif === 0 ? semaforo({ chave: 'verde', icone: 'ok', texto: 'Igual à matriz' }) : semaforo({ chave: 'amarelo', icone: 'alerta', texto: dif < 0 ? `Falta ${-dif} ${plural(-dif, 'aula', 'aulas')}` : `${dif} ${plural(dif, 'aula', 'aulas')} a mais` })}</td>` : ''}</tr>`; }).join('')}</tbody></table></div>`;
}
function desenhar() {
  const grade = horarios.find((h) => h.turmaId === turmaId);
  const comps = [...new Set(DIAS.flatMap((d) => grade.aulas[d].map((a) => a.componente)))].sort();
  const n = grade.aulas.seg.length;
  main.innerHTML = `
    <div class="barra-turma"><div class="campo campo-turma"><label for="turma">Turma</label><select id="turma" class="entrada">${horarios.map((h) => `<option value="${h.turmaId}" ${h.turmaId === turmaId ? 'selected' : ''}>${esc(h.turma)} · ${esc(h.turno)}</option>`).join('')}</select></div><p class="info-turma esp-b-0">${esc(grade.sala)} · a troca vale na hora e aparece no horário dos estudantes e do professor</p></div>
    <h1 class="esp-b-3">Horários · ${esc(grade.turma)}</h1>
    <div id="estado-horario" role="status" aria-live="polite" class="esp-b-2"></div>
    <div class="tabela-rolagem sem-limite"><table class="tabela grade-horario"><caption class="sr-only">Grade semanal da ${esc(grade.turma)}. Escolha a matéria de cada aula.</caption>
      <thead><tr><th scope="col">Horário</th>${DIAS.map((d) => `<th scope="col">${NOME_DO_DIA[d]}</th>`).join('')}</tr></thead>
      <tbody>${Array.from({ length: n }, (_, i) => { const h = horaDaAula(grade.turno, i); return `<tr><th scope="row">${h.inicio} às ${h.fim}</th>${DIAS.map((d) => { const a = grade.aulas[d][i]; return `<td><label class="sr-only" for="h-${d}-${i}">${NOME_DO_DIA[d]}, ${h.inicio}: matéria</label><select id="h-${d}-${i}" class="entrada" data-dia="${d}" data-indice="${i}">${comps.map((c) => `<option ${c === a.componente ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><small class="texto-suave">${esc(nomeDe(a.professorId) || 'Sem professor definido')}</small></td>`; }).join('')}</tr>`; }).join('')}</tbody></table></div>
    <h2>Aulas por semana</h2>${quadroDeAulas(grade)}`;
}
async function mostrar() {
  try {
    escolaId = sessao().escolaId;
    const [todos, profs, aloc, mat] = await Promise.all([conjunto('horarios'), carregar('professores'), conjunto('alocacoes'), carregar('matrizes')]);
    horarios = todos.filter((h) => h.escolaId === escolaId); professores = profs; alocacoes = aloc; matrizes = mat;
    if (!horarios.length) { main.innerHTML = `<h1>Horários</h1>${vazio('Nenhuma grade montada', 'Quando houver turmas aprovadas, as grades aparecem aqui.')}`; return; }
    if (!horarios.some((h) => h.turmaId === turmaId)) turmaId = horarios[0].turmaId;
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', async (e) => {
  if (e.target.id === 'turma') { turmaId = e.target.value; desenhar(); main.querySelector('#turma').focus(); return; }
  const sel = e.target.closest('[data-dia]');
  if (!sel) return;
  const grade = horarios.find((h) => h.turmaId === turmaId);
  const { dia, indice } = sel.dataset;
  const i = Number(indice);
  const anterior = grade.aulas[dia][i];
  const professorId = professorPara(turmaId, sel.value);
  const todos = await conjunto('horarios');
  const conflitos = conflitosDeHorario(todos, { turmaId, dia, indice: i, professorId });
  const estado = main.querySelector('#estado-horario');
  if (conflitos.length) {
    sel.value = anterior.componente;
    estado.innerHTML = `<p class="alerta-erro" role="alert">${esc(conflitos[0])} Escolha outra matéria ou outro horário.</p>`;
    sel.focus();
    return;
  }
  try {
    const alvo = todos.find((h) => h.turmaId === turmaId);
    alvo.aulas[dia][i] = { componente: sel.value, professorId };
    await salvar('horarios', todos);
    await registrarAcao(sessao().nome, `Trocou aula de ${anterior.componente} para ${sel.value}`, `${grade.turma}, ${NOME_DO_DIA[dia].toLowerCase()}`);
    horarios = todos.filter((h) => h.escolaId === escolaId);
    estado.innerHTML = '';
    avisar(`Horário salvo: ${sel.value}, ${NOME_DO_DIA[dia].toLowerCase()}.`);
    const foco = sel.id;
    desenhar();
    main.querySelector(`#${foco}`)?.focus();
  } catch { sel.value = anterior.componente; avisar('Não foi possível salvar a troca. Confira a conexão e tente de novo.'); }
});
mostrar();
