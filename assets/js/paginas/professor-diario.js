// Diário de classe (HU11; wireframe W12 do mapa, tela W13): validação no próprio campo e gravação pela API.
// No celular, cada estudante vira um cartão (classe tabela-cartoes).
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, icone, numeroBR, confirmar, dataHoraBR } from '../ui.js';
import { carregar, diario, salvar as salvarDados, conjunto, registrarAcao } from '../dados.js';
import { presenca, nomeCurto } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma') || 't1';
let dados, prof, escolas, chamadas;
const ausentes = new Set(); // chamada rápida: todos começam presentes; o professor toca em quem faltou
const hoje = new Date().toISOString().slice(0, 10);

const CAMPOS = { n1: 'Nota 1ª unidade', n2: 'Nota 2ª unidade', faltas: 'Faltas' };

async function mostrar() {
  try {
    [prof, dados, escolas, chamadas] = await Promise.all([carregar('professor'), diario(), carregar('escolas'), conjunto('chamadas')]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
function desenhar() {
  const turmas = prof.turmas.filter((t) => dados[t.id]);
  if (!dados[turmaId]) turmaId = turmas[0].id;
  const t = prof.turmas.find((x) => x.id === turmaId);
  const escola = escolas.find((e) => e.id === t.escolaId);
  const alunos = dados[turmaId];
  const campo = (a, c, max) => `<td data-rotulo="${CAMPOS[c]}"><label class="sr-only" for="${a.id}-${c}">${CAMPOS[c]} de ${esc(a.nome)}</label><input id="${a.id}-${c}" class="entrada" inputmode="decimal" data-aluno="${a.id}" data-nome="${esc(a.nome)}" data-campo="${c}" data-max="${max}" value="${c === 'faltas' ? a[c] : numeroBR(a[c])}"></td>`;
  main.innerHTML = `
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
      <div><h1 style="margin-bottom:.2rem">Diário de classe</h1><p class="texto-suave" style="margin:0">${esc(nomeCurto(escola.nome))} · ${prof.aulasDadas} aulas dadas no ano</p></div>
      <div class="campo" style="margin:0;min-width:min(300px,100%)"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} — ${esc(x.componente)}</option>`).join('')}</select></div>
    </div>
    ${painelChamada(t, alunos)}
    <h2>Notas e faltas acumuladas</h2>
    <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Notas e faltas de ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Nota 1ª unidade</th><th scope="col">Nota 2ª unidade</th><th scope="col">Faltas</th><th scope="col">Presença</th></tr></thead>
      <tbody>${alunos.map((a) => { const p = `${presenca(a.faltas, prof.aulasDadas).toFixed(0)}%`; return `<tr><td>${esc(a.nome)}<span class="presenca-inline texto-suave">Presença ${p}</span></td>${campo(a, 'n1', 10)}${campo(a, 'n2', 10)}${campo(a, 'faltas', prof.aulasDadas)}<td class="presenca-celula">${p}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <div id="erro-diario" role="alert"></div>
    <div class="linha-botoes" style="margin-top:1rem"><button type="button" class="botao" id="salvar">${icone('ok', 20)}Salvar diário</button><span class="texto-suave">As notas salvas aparecem para a família.</span></div>`;
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
  const t = prof.turmas.find((x) => x.id === turmaId);
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
    if (c.value.trim() === '' || Number.isNaN(v) || v < 0 || v > max || (faltas && !Number.isInteger(v))) {
      c.setAttribute('aria-invalid', 'true');
      const texto = faltas
        ? `Faltas inválidas em ${c.dataset.nome}: use um número inteiro de 0 a ${max}.`
        : `Nota inválida em ${c.dataset.nome}, ${c.dataset.campo === 'n1' ? '1ª' : '2ª'} unidade: use um valor de 0 a ${max}.`;
      caixa.innerHTML = `<p class="alerta-erro" style="margin-top:.5rem">${icone('alerta', 20)}<span>${esc(texto)}</span></p>`;
      c.focus();
      return;
    }
  }
  for (const c of campos) {
    const a = dados[turmaId].find((x) => x.id === c.dataset.aluno);
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
