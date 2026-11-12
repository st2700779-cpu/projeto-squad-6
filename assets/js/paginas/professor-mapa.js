// Mapa de calor da turma: cada estudante numa linha, cada indicador numa coluna colorida (cor, símbolo e palavra).
// Mostra de relance quem está com nota baixa ou falta alta, sem abrir aluno por aluno.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, numeroBR, plural, vazio } from '../ui.js';
import { carregar, turmasEscola, conjunto, diarioParaLeitura, letivo } from '../dados.js';
import { turmasDoProfessor, presenca, media, semaforoNota, semaforoFrequencia, PRESENCA_MINIMA, nomeCurto } from '../regras.js';
import { celulaDeCalor, legendaDeNiveis, semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/mapa.html', assistente: true });
let turmaId = new URLSearchParams(location.search).get('turma');
let ordem = 'risco';
let ctx;

const GRAVE = { vermelho: 0, amarelo: 1, verde: 2, neutro: 3 };
function linhas() {
  const alunos = ctx.dados[turmaId] || [];
  const l = alunos.map((a) => { const m = media(a.n1, a.n2, a.n3, a.n4); const f = presenca(a.faltas, ctx.aulasDadas); return { a, m, f, sm: semaforoNota(m), sf: semaforoFrequencia(f) }; });
  if (ordem === 'nome') return l.sort((x, y) => x.a.nome.localeCompare(y.a.nome, 'pt-BR'));
  const pior = (x) => Math.min(GRAVE[x.sm.chave], GRAVE[x.sf.chave]);
  return l.sort((x, y) => pior(x) - pior(y) || (x.m ?? 99) - (y.m ?? 99) || x.f - y.f);
}

function desenhar() {
  const { minhas } = ctx;
  if (!minhas.length) { main.innerHTML = `<h1>Mapa de calor</h1>${vazio('Nenhuma turma alocada', 'O mapa abre quando a coordenação da escola aloca você em uma turma aprovada.')}`; return; }
  if (!minhas.some((m) => m.turma.id === turmaId)) turmaId = minhas[0].turma.id;
  const { turma: t, componente } = minhas.find((m) => m.turma.id === turmaId);
  const lista = linhas();
  const emRisco = lista.filter((x) => x.sm.chave === 'vermelho' || x.sf.chave === 'vermelho').length;
  const emAtencao = lista.filter((x) => x.sm.chave !== 'vermelho' && x.sf.chave !== 'vermelho' && (x.sm.chave === 'amarelo' || x.sf.chave === 'amarelo')).length;
  const nf = (v) => (v === null ? '—' : numeroBR(v));
  main.innerHTML = `
    <div class="barra-turma">
      <div class="campo campo-turma"><label for="turma">Turma e componente</label><select id="turma" class="entrada">${minhas.map((m) => `<option value="${m.turma.id}" ${m.turma.id === turmaId ? 'selected' : ''}>${esc(m.turma.nome)} — ${esc(m.componente)}</option>`).join('')}</select></div>
      <div class="campo"><label for="ordem">Ordem</label><select id="ordem" class="entrada"><option value="risco" ${ordem === 'risco' ? 'selected' : ''}>Quem precisa de atenção primeiro</option><option value="nome" ${ordem === 'nome' ? 'selected' : ''}>Ordem alfabética</option></select></div>
      <a class="botao botao-secundario botao-mini" href="${link('professor/diario.html')}?turma=${turmaId}">Abrir o diário</a>
    </div>
    <h1 class="esp-b-1">Mapa de calor · ${esc(t.nome)} · ${esc(componente)}</h1>
    <p class="pagina-descricao">${esc(nomeCurto(ctx.escola.nome))} · ${ctx.bimestres + 1}º bimestre em andamento · ${ctx.aulasDadas} aulas dadas no ano</p>
    ${lista.length ? `<dl class="resumo-linha">
      <div><dd>${lista.length}</dd><dt>${plural(lista.length, 'estudante', 'estudantes')}</dt></div>
      <div class="${emRisco ? 'alerta' : ''}"><dd>${emRisco}</dd><dt>em risco (nota ou frequência)</dt></div>
      <div class="${emAtencao ? 'atencao' : ''}"><dd>${emAtencao}</dd><dt>pedem atenção</dt></div></dl>
    ${legendaDeNiveis([[semaforoNota(7), 'nota 6,0 ou mais · frequência 85% ou mais'], [semaforoNota(5), 'nota de 4,0 a 5,9 · frequência de 75% a 84,9%'], [semaforoNota(2), 'nota abaixo de 4,0 · frequência abaixo de 75%']])}
    <div class="tabela-rolagem sem-limite"><table class="tabela mapa-calor"><caption class="sr-only">Mapa de calor de ${esc(t.nome)}, ${esc(componente)}: notas e frequência por estudante</caption>
      <thead><tr><th scope="col">Estudante</th>${[1, 2, 3, 4].map((b) => `<th scope="col">${b}º bim.</th>`).join('')}<th scope="col">Média</th><th scope="col" class="num">Faltas <small class="th-apoio">aulas perdidas</small></th><th scope="col">Frequência <small class="th-apoio">% de presença</small></th><th scope="col">Observação</th></tr></thead>
      <tbody>${lista.map(({ a, m, f, sm, sf }) => { const pior = GRAVE[sm.chave] <= GRAVE[sf.chave] ? sm : sf; return `<tr><th scope="row" class="nome nome-${pior.chave}"><span class="ponto-desempenho" aria-hidden="true"></span>${esc(a.nome)}<span class="sr-only"> (${esc(pior.texto)})</span></th>${[1, 2, 3, 4].map((b) => (a[`n${b}`] === null || a[`n${b}`] === undefined ? '<td class="celula-vazia"><span class="texto-suave">—</span></td>' : celulaDeCalor(nf(a[`n${b}`]), semaforoNota(a[`n${b}`])))).join('')}${celulaDeCalor(nf(m), sm)}<td class="num celula-faltas"><strong>${a.faltas}</strong> <span class="texto-suave texto-pequeno">${a.faltas === 1 ? 'aula' : 'aulas'}</span></td>${celulaDeCalor(`${numeroBR(f, 0)}%`, sf)}<td>${esc(a.obs || '')}</td></tr>`; }).join('')}</tbody></table></div>
    <p class="contagem">A cor do nome mostra o desempenho geral do estudante (o pior entre média e frequência): verde em dia, amarelo pede atenção, vermelho em risco.</p>
    <p class="contagem">${lista.length} estudantes · mínimo de frequência: ${PRESENCA_MINIMA}%. Para lançar ou corrigir, abra o diário.</p>` : vazio('Nenhum estudante enturmado', 'Quando a secretaria colocar estudantes nesta turma, eles aparecem aqui.')}`;
}

async function mostrar() {
  try {
    const [logado, professores, turmas, alocacoes, matrizes, escolas, lv] = await Promise.all([carregar('professor'), carregar('professores'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), carregar('escolas'), letivo()]);
    const prof = professores.find((p) => p.id === logado.professorId);
    const minhas = turmasDoProfessor(prof.id, { alocacoes, turmas, matriz: matrizes });
    ctx = { minhas, dados: await diarioParaLeitura({ soAtivos: true }), escola: escolas.find((e) => e.id === prof.escolaId), aulasDadas: lv.aulasDadas, bimestres: lv.bimestresLancados };
    desenhar();
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('change', (e) => {
  if (e.target.id === 'turma') { turmaId = e.target.value; history.replaceState(null, '', `?turma=${turmaId}`); desenhar(); main.querySelector('#turma').focus(); }
  if (e.target.id === 'ordem') { ordem = e.target.value; desenhar(); main.querySelector('#ordem').focus(); }
});
mostrar();
