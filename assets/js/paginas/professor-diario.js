// Diário de classe (HU11; wireframe W13): turmas vindas da alocação da escola, estudantes vindos da enturmação,
// validação no próprio campo e gravação pela API. No celular, cada estudante vira um cartão (classe tabela-cartoes).
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, icone, numeroBR, confirmar, dataHoraBR, vazio } from '../ui.js';
import { carregar, diario, letivo, matriculas, turmasEscola, salvar as salvarDados, conjunto, registrarAcao } from '../dados.js';
import { presenca, nomeCurto, turmasDoProfessor, sincronizarDiario } from '../regras.js';

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
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
      <div><h1 style="margin-bottom:.2rem">Diário de classe</h1><p class="texto-suave" style="margin:0">${esc(nomeCurto(escola.nome))} · ${aulasDadas} aulas dadas no ano</p></div>
      <div class="campo" style="margin:0;min-width:min(300px,100%)"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
    </div>
    ${alunos.length ? `${painelChamada(t, alunos)}
    <h2>Notas e faltas acumuladas · ${esc(componente)}</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Notas e faltas de ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Nota do 1º bimestre</th><th scope="col">Nota do 2º bimestre</th><th scope="col">Faltas</th><th scope="col">Presença</th></tr></thead>
      <tbody>${alunos.map((a) => { const p = `${presenca(a.faltas, aulasDadas).toFixed(0)}%`; return `<tr><td>${esc(a.nome)}<span class="presenca-inline texto-suave">Presença ${p}</span></td>${campo(a, 'n1', 10)}${campo(a, 'n2', 10)}${campo(a, 'faltas', aulasDadas)}<td class="presenca-celula">${p}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <div id="erro-diario" role="alert"></div>
    <div class="linha-botoes" style="margin-top:1rem"><button type="button" class="botao" id="salvar">${icone('ok', 20)}Salvar diário</button><span class="texto-suave">As notas salvas aparecem para a família.</span></div>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.', 'pessoas')}`;
}
// Chamada rápida: todos começam presentes; um toque marca quem faltou. Registrar soma 1 falta a cada ausente.
function painelChamada(t, alunos) {
  const feita = chamadas[turmaId]?.[hoje];
  if (feita) {
    const nomes = alunos.filter((a) => feita.ausentes.includes(a.id)).map((a) => a.nome);
    return `<div class="cartao"><div class="linha-botoes" style="justify-content:space-between"><strong style="font-size:1.1rem">Chamada de hoje</strong>${`<span class="etiqueta etiqueta-ok">Registrada</span>`}</div>
      <p style="margin:.4rem 0 0">${nomes.length ? `${nomes.length} falta${nomes.length > 1 ? 's' : ''}: ${esc(nomes.join(', '))}.` : 'Todos presentes.'}</p>
      <p class="registro" style="margin:.3rem 0 0">${icone('relogio', 16)}Registrada em ${dataHoraBR(feita.quando)}</p></div>`;
  }
  return `<section class="cartao" aria-labelledby="chamada-titulo">
    <div class="linha-botoes" style="justify-content:space-between"><h2 id="chamada-titulo" style="margin:0;font-size:1.15rem">Chamada de hoje · ${esc(t.nome)}</h2><span class="texto-suave">${alunos.length - ausentes.size} presentes · ${ausentes.size} faltas</span></div>
    <p class="texto-suave" style="margin:.3rem 0 .8rem">Todos começam presentes. Toque só em quem faltou.</p>
    <div class="chamada-rapida">${alunos.map((a) => `<button type="button" data-faltou="${a.id}" aria-pressed="${ausentes.has(a.id)}">${ausentes.has(a.id) ? icone('fechar', 18) : icone('ok', 18)}<span>${esc(a.nome)}</span><small>${ausentes.has(a.id) ? 'Faltou' : 'Presente'}</small></button>`).join('')}</div>
    <button type="button" class="botao botao-largo" id="registrar-chamada" style="margin-top:.9rem">${icone('ok', 20)}${ausentes.size ? `Registrar chamada com ${ausentes.size} falta${ausentes.size > 1 ? 's' : ''}` : 'Todos presentes: registrar chamada'}</button>
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
    await salvarDados('diario', dados);
    await salvarDados('chamadas', chamadas);
    await registrarAcao(prof.nome, `Registrou chamada (${ausentes.size} falta${ausentes.size === 1 ? '' : 's'})`, t.nome);
    ausentes.clear();
    desenhar();
    avisar('Chamada registrada.');
  } catch {
    avisar('Não foi possível registrar a chamada. Tente de novo.');
    mostrar();
  }
}
async function salvar() {
  const campos = [...main.querySelectorAll('[data-aluno]')];
  campos.forEach((c) => c.removeAttribute('aria-invalid'));
  const caixa = main.querySelector('#erro-diario');
  caixa.innerHTML = '';
  for (const c of campos) {
    const v = Number(c.value.replace(',', '.'));
    const max = Number(c.dataset.max);
    const faltas = c.dataset.campo === 'faltas';
    const podeVazio = c.dataset.vazio === 'true' && c.value.trim() === '';
    if (!podeVazio && (c.value.trim() === '' || Number.isNaN(v) || v < 0 || v > max || (faltas && !Number.isInteger(v)))) {
      c.setAttribute('aria-invalid', 'true');
      const texto = faltas
        ? `Faltas inválidas em ${c.dataset.nome}: use um número inteiro de 0 a ${max}.`
        : `Nota inválida em ${c.dataset.nome}, ${c.dataset.campo === 'n1' ? '1º' : '2º'} bimestre: use um valor de 0 a ${max}.`;
      caixa.innerHTML = `<p class="alerta-erro" style="margin-top:.5rem">${icone('alerta', 20)}<span>${esc(texto)}</span></p>`;
      c.focus();
      return;
    }
  }
  for (const c of campos) {
    const a = dados[turmaId].find((x) => x.id === c.dataset.aluno);
    if (c.value.trim() === '') continue; // nota ainda não lançada: continua em branco
    const v = Number(c.value.replace(',', '.'));
    a[c.dataset.campo] = c.dataset.campo === 'faltas' ? v : Math.round(v * 10) / 10;
  }
  try {
    await salvarDados('diario', dados);
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
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; ausentes.clear(); desenhar(); } });
mostrar();
