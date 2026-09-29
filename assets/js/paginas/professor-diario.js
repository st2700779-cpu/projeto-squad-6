// Diário de classe (HU11; wireframe W13): turmas vindas da alocação da escola, estudantes vindos da enturmação,
// validação no próprio campo e gravação pela API. No celular, cada estudante vira um cartão (classe tabela-cartoes).
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, icone, numeroBR, confirmar, dataHoraBR, vazio, etiqueta, comEspera } from '../ui.js';
import { carregar, diario, letivo, matriculas, turmasEscola, salvar as salvarDados, conjunto, registrarAcao } from '../dados.js';
import { presenca, media, situacao, nomeCurto, turmasDoProfessor, sincronizarDiario } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma');
let dados, prof, escolas, chamadas, minhas, aulasDadas;
const ausentes = new Set(); // chamada rápida: todos começam presentes; o professor toca em quem faltou
const hoje = new Date().toISOString().slice(0, 10);

const CAMPOS = { n1: 'Nota do 1º bimestre', n2: 'Nota do 2º bimestre', faltas: 'Faltas' };

async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes, pedidos, enturmacao, lv] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), matriculas(), conjunto('enturmacao'), letivo()]);
    [dados, escolas, chamadas] = await Promise.all([diario(), carregar('escolas'), conjunto('chamadas')]);
    prof = professores.find((p) => p.id === logado.professorId);
    aulasDadas = lv.aulasDadas;
    minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes.versoes[0].componentes });
    // Estudantes enturmados pela secretaria entram no diário, com notas em branco.
    const novos = minhas.map(({ turma }) => sincronizarDiario(dados, turma.id, { pedidos, enturmacao })).some(Boolean);
    if (novos) await salvarDados('diario', dados);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
function desenhar() {
  if (!minhas.length) {
    main.innerHTML = `<h1>Diário de classe</h1>${vazio('Nenhuma turma alocada', 'O diário abre quando a coordenação da escola aloca você em uma turma aprovada.', 'livro')}`;
    return;
  }
  if (!minhas.some((m) => m.turma.id === turmaId)) turmaId = minhas[0].turma.id;
  const { turma: t, componente } = minhas.find((m) => m.turma.id === turmaId);
  const escola = escolas.find((e) => e.id === t.escolaId);
  const alunos = dados[turmaId];
  const campo = (a, c, max) => `<td data-rotulo="${CAMPOS[c]}"><label class="sr-only" for="${a.id}-${c}">${CAMPOS[c]} de ${esc(a.nome)}</label><input id="${a.id}-${c}" class="entrada" inputmode="decimal" data-aluno="${a.id}" data-nome="${esc(a.nome)}" data-campo="${c}" data-max="${max}" data-vazio="${c !== 'faltas' && a[c] === null}" value="${c === 'faltas' ? a[c] : (a[c] === null ? '' : numeroBR(a[c]))}"></td>`;
  main.innerHTML = `
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3 esp-b-5">
      <div><h1 class="esp-b-1">Diário de classe</h1><p class="texto-suave esp-t-0 esp-b-0">${esc(nomeCurto(escola.nome))} · ${aulasDadas} aulas dadas no ano</p></div>
      <div class="campo esp-t-0 esp-b-0 campo-turma"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
    </div>
    ${alunos.length ? `${painelChamada(t, alunos)}
    <h2>Notas e faltas acumuladas · ${esc(componente)}</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes tabela-notas"><caption class="sr-only">Notas e faltas de ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Nota do 1º bimestre</th><th scope="col">Nota do 2º bimestre</th><th scope="col" class="num">Faltas</th><th scope="col" class="num">Presença</th><th scope="col">Situação</th></tr></thead>
      <tbody>${alunos.map((a) => { const freq = presenca(a.faltas, aulasDadas); const p = `${freq.toFixed(0)}%`; const sit = situacao(media(a.n1, a.n2), freq); return `<tr><td>${esc(a.nome)}<span class="presenca-inline texto-suave">Presença ${p}</span></td>${campo(a, 'n1', 10)}${campo(a, 'n2', 10)}${campo(a, 'faltas', aulasDadas)}<td class="presenca-celula num">${p}</td><td class="situacao-celula" data-rotulo="Situação">${etiqueta(sit.texto, sit.tipo)}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <div class="barra-acoes compacta"><button type="button" class="botao" id="salvar">${icone('ok', 20)}Salvar diário</button><span class="texto-suave" id="estado-diario">As notas salvas aparecem para a família.</span></div>
    <div id="erro-diario" role="alert"></div>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.', 'pessoas')}`;
}
// Chamada rápida: todos começam presentes; um toque marca quem faltou. Registrar soma 1 falta a cada ausente.
function painelChamada(t, alunos) {
  const feita = chamadas[turmaId]?.[hoje];
  if (feita) {
    const nomes = alunos.filter((a) => feita.ausentes.includes(a.id)).map((a) => a.nome);
    return `<div class="cartao"><div class="linha-botoes entre"><strong class="texto-medio">Chamada de hoje</strong>${`<span class="etiqueta etiqueta-ok">Registrada</span>`}</div>
      <p class="esp-t-2 esp-b-0">${nomes.length ? `${nomes.length} falta${nomes.length > 1 ? 's' : ''}: ${esc(nomes.join(', '))}.` : 'Todos presentes.'}</p>
      <p class="registro esp-t-1 esp-b-0">${icone('relogio', 16)}Registrada em ${dataHoraBR(feita.quando)}</p></div>`;
  }
  return `<section class="cartao" aria-labelledby="chamada-titulo">
    <div class="linha-botoes entre"><h2 class="esp-t-0 esp-b-0 titulo-cartao" id="chamada-titulo">Chamada de hoje · ${esc(t.nome)}</h2><span class="texto-suave">${alunos.length - ausentes.size} presentes · ${ausentes.size} faltas</span></div>
    <p class="texto-suave esp-t-1 esp-b-3">Todos começam presentes. Toque só em quem faltou.</p>
    <div class="chamada-rapida">${alunos.map((a) => `<button type="button" data-faltou="${a.id}" aria-pressed="${ausentes.has(a.id)}">${ausentes.has(a.id) ? icone('fechar', 18) : icone('ok', 18)}<span>${esc(a.nome)}</span><small>${ausentes.has(a.id) ? 'Faltou' : 'Presente'}</small></button>`).join('')}</div>
    <button type="button" class="botao botao-largo esp-t-4" id="registrar-chamada">${icone('ok', 20)}${ausentes.size ? `Registrar chamada com ${ausentes.size} falta${ausentes.size > 1 ? 's' : ''}` : 'Todos presentes: registrar chamada'}</button>
  </section>`;
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
    alunos.forEach((a) => { if (ausentes.has(a.id)) a.faltas += 1; });
    chamadas[turmaId] = { ...(chamadas[turmaId] || {}), [hoje]: { ausentes: [...ausentes], quando: new Date().toISOString() } };
    await comEspera(main.querySelector('#registrar-chamada'), async () => {
      await salvarDados('diario', dados);
      await salvarDados('chamadas', chamadas);
    });
    await registrarAcao(prof.nome, `Registrou chamada (${ausentes.size} falta${ausentes.size === 1 ? '' : 's'})`, t.nome);
    ausentes.clear();
    desenhar();
    avisar('Chamada registrada.');
  } catch {
    avisar('Não foi possível registrar a chamada. Tente de novo.');
    mostrar();
  }
}
// Regra de um campo do diário: devolve a mensagem de erro ou '' se está certo.
// Nota: 0 a 10 (vírgula ou ponto); faltas: inteiro de 0 ao total de aulas dadas. Nota em branco só vale se ainda não foi lançada.
function erroDoCampo(c) {
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
    if (c.value.trim() === '') continue; // nota ainda não lançada: continua em branco
    const v = Number(c.value.replace(',', '.'));
    a[c.dataset.campo] = c.dataset.campo === 'faltas' ? v : Math.round(v * 10) / 10;
  }
  try {
    await comEspera(main.querySelector('#salvar'), () => salvarDados('diario', dados));
    desenhar();
    avisar('Diário salvo.');
  } catch {
    caixa.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>Não foi possível salvar o diário. Tente de novo.</span></p>`;
  }
}
main.addEventListener('click', async (e) => {
  if (e.target.closest('#salvar')) { salvar(); return; }
  const aluno = e.target.closest('[data-faltou]');
  if (aluno) {
    const id = aluno.dataset.faltou;
    if (ausentes.has(id)) ausentes.delete(id); else ausentes.add(id);
    desenhar();
    main.querySelector(`[data-faltou="${id}"]`)?.focus();
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
  if (e.key !== 'Enter' || !c.dataset?.aluno) return;
  e.preventDefault();
  const mesmos = [...main.querySelectorAll(`[data-campo="${c.dataset.campo}"]`)];
  mesmos[(mesmos.indexOf(c) + 1) % mesmos.length]?.focus();
});
main.addEventListener('focusout', (e) => {
  const c = e.target;
  if (!c.dataset?.aluno) return;
  const texto = erroDoCampo(c);
  mostrarErro(c, texto);
  if (!texto && c.dataset.campo !== 'faltas' && c.value.trim() !== '') c.value = numeroBR(Number(c.value.replace(',', '.')));
});
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; ausentes.clear(); desenhar(); } });
mostrar();
