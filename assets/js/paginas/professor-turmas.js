// Minhas turmas: nasce da alocação feita pela escola (turmas aprovadas + componente), sem cadastro paralelo.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, etiqueta, vazio, icone, plural } from '../ui.js';
import { carregar, turmasEscola, conjunto, diario, letivo } from '../dados.js';
import { turmasDoProfessor, aulasAlocadas, presenca, PRESENCA_MINIMA } from '../regras.js';

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
    main.innerHTML = `
      <h1>Minhas turmas</h1>
      <p class="pagina-descricao">Resumo das suas turmas neste ano letivo.</p>
      <div class="numeros">
        <div class="numero"><span class="numero-icone">${icone('livro', 22)}</span><strong>${minhas.length}</strong><span>${plural(minhas.length, 'turma', 'turmas')}</span></div>
        <div class="numero"><span class="numero-icone">${icone('pessoas', 22)}</span><strong>${estudantes}</strong><span>${plural(estudantes, 'estudante no diário', 'estudantes no diário')}</span></div>
        <div class="numero${usadas > prof.cargaHorariaSemanal ? ' alerta' : ''}"><span class="numero-icone">${icone('relogio', 22)}</span><strong>${usadas}h</strong><span>de ${prof.cargaHorariaSemanal}h semanais</span></div>
        <div class="numero${emRisco ? ' alerta' : ' ok'}"><span class="numero-icone">${icone(emRisco ? 'alerta' : 'ok', 22)}</span><strong>${emRisco}</strong><span>${plural(emRisco, 'estudante', 'estudantes')} com frequência abaixo de ${PRESENCA_MINIMA}%</span></div>
      </div>
      <div class="cartao">
        <div class="d-flex justify-content-between flex-wrap gap-2"><div><strong class="titulo-cartao">${esc(prof.nome)}</strong><br><span class="texto-suave">Concurso: ${esc(prof.concurso)} · Formação: ${esc(prof.formacao)}</span></div>${etiqueta('Habilitação: ' + prof.habilitacao.join(', '), 'ok')}</div>
        <p class="texto-suave nota">Pela regra de habilitação, só há alocação em componentes compatíveis com o cargo do concurso e com a formação. As turmas abaixo vêm da alocação feita pela coordenação da escola.</p>
        <div class="d-flex justify-content-between"><strong>Carga horária semanal</strong><span>${usadas}h de ${prof.cargaHorariaSemanal}h</span></div>
        <div class="barra" role="img" aria-label="${usadas} de ${prof.cargaHorariaSemanal} horas semanais alocadas"><span style="width:${Math.min(100, (usadas / prof.cargaHorariaSemanal) * 100)}%"></span></div>
        <p class="texto-suave nota">Inclui ${prof.aulasEmOutrasTurmas}h em turmas de outras escolas e séries.</p>
      </div>
      ${minhas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas do professor</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col">Escola</th><th scope="col">Componente</th><th scope="col" class="num">Aulas por semana</th><th scope="col" class="num">Estudantes no diário</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${minhas.map(({ turma, componente, aulasSemana }) => `<tr><td class="titulo-linha"><strong>${esc(turma.nome)}</strong></td><td data-rotulo="Escola">${esc(escolas.find((e) => e.id === turma.escolaId).nome)}</td><td data-rotulo="Componente">${esc(componente)}</td><td data-rotulo="Aulas por semana" class="num">${aulasSemana}</td><td data-rotulo="Estudantes no diário" class="num">${(dia[turma.id] || []).length}</td><td class="acoes"><a class="botao botao-secundario botao-mini" href="${link('professor/diario.html')}?turma=${turma.id}">Abrir diário</a></td></tr>`).join('')}</tbody>
      </table></div>` : vazio('Nenhuma turma alocada', 'Quando a coordenação da escola alocar você em uma turma aprovada, ela aparece aqui.', 'livro')}`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
