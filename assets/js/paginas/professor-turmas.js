// Minhas turmas: nasce da alocação feita pela escola (turmas aprovadas + componente), sem cadastro paralelo.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, vazio, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto, diario, letivo } from '../dados.js';
import { turmasDoProfessor, aulasAlocadas, presenca, PRESENCA_MINIMA, codigoDaTurma } from '../regras.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/index.html', assistente: true });
async function mostrar() {
  try {
    const [logado, professores, escolas, turmas, alocacoes, matrizes, dia, lv] = await Promise.all([carregar('professor'), carregar('professores'), carregar('escolas'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), diario(), letivo()]);
    const prof = professores.find((p) => p.id === logado.professorId);
    const ctx = { alocacoes, turmas, matriz: matrizes.versoes[0].componentes };
    const minhas = turmasDoProfessor(prof.id, ctx);
    const usadas = prof.aulasEmOutrasTurmas + aulasAlocadas(prof.id, ctx);
    const estudantes = minhas.reduce((s, { turma }) => s + (dia[turma.id] || []).length, 0);
    const emRisco = minhas.reduce((s, { turma }) => s + (dia[turma.id] || []).filter((a) => presenca(a.faltas, lv.aulasDadas) < PRESENCA_MINIMA).length, 0);
    const perc = Math.min(100, (usadas / prof.cargaHorariaSemanal) * 100);
    main.innerHTML = `
      <h1>Minhas turmas · 2026</h1>
      <p class="pagina-descricao">${esc(prof.nome)} · ${esc(prof.concurso)} · ${esc(prof.formacao)}</p>
      <dl class="resumo-linha">
        <div><dd>${minhas.length}</dd><dt>${plural(minhas.length, 'turma', 'turmas')}</dt></div>
        <div><dd>${estudantes}</dd><dt>${plural(estudantes, 'estudante no diário', 'estudantes no diário')}</dt></div>
        <div class="${emRisco ? 'alerta' : ''}"><dd>${emRisco}</dd><dt>${plural(emRisco, 'estudante', 'estudantes')} com frequência abaixo de ${PRESENCA_MINIMA}%</dt></div>
      </dl>
      ${minhas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas do professor</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col">Código</th><th scope="col">Escola</th><th scope="col">Componente</th><th scope="col" class="num">Aulas por semana</th><th scope="col" class="num">Estudantes no diário</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${minhas.map(({ turma, componente, aulasSemana }) => `<tr><td class="titulo-linha"><strong>${esc(turma.nome)}</strong></td><td data-rotulo="Código">${esc(codigoDaTurma(turma))}</td><td data-rotulo="Escola">${esc(escolas.find((e) => e.id === turma.escolaId).nome)}</td><td data-rotulo="Componente">${esc(componente)}</td><td data-rotulo="Aulas por semana" class="num">${aulasSemana}</td><td data-rotulo="Estudantes no diário" class="num">${(dia[turma.id] || []).length}</td><td class="acoes"><a class="botao botao-secundario botao-mini" href="${link('professor/diario.html')}?turma=${turma.id}">Abrir diário</a></td></tr>`).join('')}</tbody>
      </table></div>
      <p class="contagem">${minhas.length} ${plural(minhas.length, 'turma', 'turmas')} · dados de ${esc(new Date().toLocaleDateString('pt-BR'))}</p>` : vazio('Nenhuma turma alocada', 'Quando a coordenação da escola alocar você em uma turma aprovada, ela aparece aqui.')}
      <h2>Carga horária semanal</h2>
      <p class="esp-b-2">${usadas} de ${prof.cargaHorariaSemanal} aulas semanais, incluindo ${prof.aulasEmOutrasTurmas} em turmas de outras escolas e séries.</p>
      <div class="barra" role="img" aria-label="${usadas} de ${prof.cargaHorariaSemanal} aulas semanais alocadas"><span style="width:${perc}%"></span></div>
      <p class="texto-suave nota">Habilitação: ${esc(prof.habilitacao.join(', '))}. Pela regra de habilitação, a alocação só vale para componentes compatíveis com o concurso e a formação.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
