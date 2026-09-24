// Diário de classe (HU11): validação no próprio campo e gravação no estado da sessão.
import { iniciar, falhaDados } from '../app.js';
import { esc, avisar, icone } from '../ui.js';
import { carregar, diario } from '../dados.js';
import { definir } from '../estado.js';
import { presenca } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/diario.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma') || 't1';
let dados, prof;

async function mostrar() {
  try {
    [prof, dados] = await Promise.all([carregar('professor'), diario()]);
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
function desenhar() {
  const turmas = prof.turmas.filter((t) => dados[t.id]);
  if (!dados[turmaId]) turmaId = turmas[0].id;
  const t = prof.turmas.find((x) => x.id === turmaId);
  const alunos = dados[turmaId];
  const campo = (a, c, max, rotulo) => `<label class="sr-only" for="${a.id}-${c}">${rotulo} de ${esc(a.nome)}</label><input id="${a.id}-${c}" class="entrada" inputmode="decimal" data-aluno="${a.id}" data-campo="${c}" data-max="${max}" data-rotulo="${rotulo} de ${esc(a.nome)}" value="${String(a[c]).replace('.', ',')}">`;
  main.innerHTML = `
    <div class="d-flex justify-content-between align-items-end flex-wrap gap-3">
      <div><h1>Diário de classe</h1><p class="texto-suave" style="margin:0">${prof.aulasDadas} aulas dadas no ano</p></div>
      <div class="campo" style="margin:0;min-width:260px"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${turmas.map((x) => `<option value="${x.id}" ${x.id === turmaId ? 'selected' : ''}>${esc(x.nome)} — ${esc(x.componente)}</option>`).join('')}</select></div>
    </div>
    <div class="tabela-rolagem" style="margin-top:1rem"><table class="tabela"><caption class="sr-only">Notas e faltas de ${esc(t.nome)}</caption>
      <thead><tr><th scope="col">Estudante</th><th scope="col">Nota 1ª unidade</th><th scope="col">Nota 2ª unidade</th><th scope="col">Faltas</th><th scope="col">Presença</th></tr></thead>
      <tbody>${alunos.map((a) => `<tr><td>${esc(a.nome)}</td><td>${campo(a, 'n1', 10, 'Nota 1')}</td><td>${campo(a, 'n2', 10, 'Nota 2')}</td><td>${campo(a, 'faltas', prof.aulasDadas, 'Faltas')}</td><td>${presenca(a.faltas, prof.aulasDadas).toFixed(0)}%</td></tr>`).join('')}</tbody>
    </table></div>
    <div id="erro-diario" role="alert"></div>
    <div class="linha-botoes" style="margin-top:1rem"><button type="button" class="botao" id="salvar">${icone('ok', 20)}Salvar diário</button><span class="texto-suave">As notas salvas aparecem para a família.</span></div>`;
}
function salvar() {
  const campos = [...main.querySelectorAll('[data-aluno]')];
  campos.forEach((c) => c.removeAttribute('aria-invalid'));
  const caixa = main.querySelector('#erro-diario');
  caixa.innerHTML = '';
  for (const c of campos) {
    const v = Number(c.value.replace(',', '.'));
    const max = Number(c.dataset.max);
    const inteiro = c.dataset.campo === 'faltas';
    if (c.value.trim() === '' || Number.isNaN(v) || v < 0 || v > max || (inteiro && !Number.isInteger(v))) {
      c.setAttribute('aria-invalid', 'true');
      caixa.innerHTML = `<p class="alerta-erro">${icone('alerta', 20)}<span>Valor inválido em ${esc(c.dataset.rotulo)}: use ${inteiro ? 'um número inteiro' : 'um valor'} de 0 a ${max}.</span></p>`;
      c.focus();
      return;
    }
  }
  for (const c of campos) {
    const a = dados[turmaId].find((x) => x.id === c.dataset.aluno);
    const v = Number(c.value.replace(',', '.'));
    a[c.dataset.campo] = c.dataset.campo === 'faltas' ? v : Math.round(v * 10) / 10;
  }
  definir('diario', dados);
  desenhar();
  avisar('Diário salvo.');
}
main.addEventListener('click', (e) => { if (e.target.closest('#salvar')) salvar(); });
main.addEventListener('change', (e) => { if (e.target.id === 'turma') { turmaId = e.target.value; desenhar(); } });
mostrar();
