// Diário de classe (HU11; wireframe W12 do mapa, tela W13): validação no próprio campo e gravação pela API.
// No celular, cada estudante vira um cartão (classe tabela-cartoes).
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, icone, numeroBR } from '../ui.js';
import { carregar, diario, salvar as salvarDados } from '../dados.js';
import { presenca, nomeCurto } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma') || 't1';
let dados, prof, escolas;

const CAMPOS = { n1: 'Nota 1ª unidade', n2: 'Nota 2ª unidade', faltas: 'Faltas' };

async function mostrar() {
  try {
    [prof, dados, escolas] = await Promise.all([carregar('professor'), diario(), carregar('escolas')]);
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
    <div class="tabela-rolagem" style="margin-top:1.2rem"><table class="tabela tabela-cartoes"><caption class="sr-only">Notas e faltas de ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Nota 1ª unidade</th><th scope="col">Nota 2ª unidade</th><th scope="col">Faltas</th><th scope="col">Presença</th></tr></thead>
      <tbody>${alunos.map((a) => { const p = `${presenca(a.faltas, prof.aulasDadas).toFixed(0)}%`; return `<tr><td>${esc(a.nome)}<span class="presenca-inline texto-suave">Presença ${p}</span></td>${campo(a, 'n1', 10)}${campo(a, 'n2', 10)}${campo(a, 'faltas', prof.aulasDadas)}<td class="presenca-celula">${p}</td></tr>`; }).join('')}</tbody>
    </table></div>
    <div id="erro-diario" role="alert"></div>
    <div class="linha-botoes" style="margin-top:1rem"><button type="button" class="botao" id="salvar">${icone('ok', 20)}Salvar diário</button><span class="texto-suave">As notas salvas aparecem para a família.</span></div>`;
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
main.addEventListener('click', (e) => { if (e.target.closest('#salvar')) salvar(); });
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; desenhar(); } });
mostrar();
