// Minhas turmas: nasce da alocação feita pela escola (turmas aprovadas + componente), sem cadastro paralelo.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, vazio, plural, dataBR } from '../ui.js';
import { carregar, turmasEscola, conjunto, diarioParaLeitura, letivo } from '../dados.js';
import { turmasDoProfessor, aulasAlocadas, presenca, PRESENCA_MINIMA, codigoDaTurma, nomeCurto, aulasDoProfessor, diaDaSemana, NOME_DO_DIA, semaforoPrazo, diasEntre } from '../regras.js';
import { hojeISO } from '../dominio/hoje.js';
import { semaforo, dataPorExtenso } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/index.html', assistente: true });
async function mostrar() {
  try {
    const [logado, professores, escolas, turmas, alocacoes, matrizes, dia, lv, horarios] = await Promise.all([carregar('professor'), carregar('professores'), carregar('escolas'), turmasEscola(), conjunto('alocacoes'), carregar('matrizes'), diarioParaLeitura({ soAtivos: true }), letivo(), conjunto('horarios')]);
    const prof = professores.find((p) => p.id === logado.professorId);
    const ctx = { alocacoes, turmas, matriz: matrizes };
    const minhas = turmasDoProfessor(prof.id, ctx);
    const usadas = prof.aulasEmOutrasTurmas + aulasAlocadas(prof.id, ctx);
    const estudantes = minhas.reduce((s, { turma }) => s + (dia[turma.id] || []).length, 0);
    const emRisco = minhas.reduce((s, { turma }) => s + (dia[turma.id] || []).filter((a) => presenca(a.faltas, lv.aulasDadas) < PRESENCA_MINIMA).length, 0);
    const perc = Math.min(100, (usadas / prof.cargaHorariaSemanal) * 100);
    // Painel "hoje": aulas do dia, atividades esperando correção e o próximo prazo de lançamento
    const hoje = lv.dataReferencia;
    const aulasHoje = aulasDoProfessor(horarios, prof.id).filter((a) => a.dia === diaDaSemana(hoje));
    const atividades = (logado.atividades || []).map((a) => ({ ...a, faltam: a.entregues - a.corrigidas, turma: turmas.find((t) => t.id === a.turmaId)?.nome || a.turmaId })).filter((a) => a.faltam > 0);
    const aCorrigir = atividades.reduce((n, a) => n + a.faltam, 0);
    const prazo = (lv.prazosLancamento || []).filter((x) => x.ate >= hoje).sort((a, b) => a.ate.localeCompare(b.ate))[0];
    const painelHoje = `<div class="painel-hoje" aria-label="Painel de hoje">
      <section aria-labelledby="hj-aulas"><h2 id="hj-aulas">Aulas hoje</h2>${aulasHoje.length ? `<p class="grande">${aulasHoje.length}</p><ul>${aulasHoje.map((a) => `<li><strong>${a.inicio}</strong> · ${esc(a.turma)} · ${esc(a.componente)}</li>`).join('')}</ul>` : `<p class="grande">0</p><p class="esp-b-0 texto-suave">Sem aula na ${esc(NOME_DO_DIA[diaDaSemana(hoje)].toLowerCase())}.</p>`}</section>
      <section aria-labelledby="hj-corrigir"><h2 id="hj-corrigir">Para corrigir</h2><p class="grande">${aCorrigir}</p>${atividades.length ? `<ul>${atividades.map((a) => `<li>${a.faltam} em ${esc(a.titulo)} <span class="texto-suave">(${esc(a.turma)})</span></li>`).join('')}</ul>` : '<p class="esp-b-0 texto-suave">Nada esperando correção.</p>'}</section>
      <section aria-labelledby="hj-prazo"><h2 id="hj-prazo">Próximo prazo</h2>${prazo ? `<p class="grande">${dataBR(prazo.ate).slice(0, 5)}</p><p class="esp-t-0">${esc(prazo.rotulo)}</p>${semaforo(semaforoPrazo(diasEntre(hoje, prazo.ate)))}` : '<p class="grande">—</p><p class="esp-b-0 texto-suave">Nenhum prazo aberto.</p>'}</section></div>
      <p class="texto-suave texto-pequeno esp-t-0">Hoje: ${esc(dataPorExtenso(hoje))} (data da demonstração).</p>`;
    main.innerHTML = `
      <h1>Minhas turmas · 2026</h1>
      <p class="pagina-descricao">${esc(prof.nome)} · ${esc(prof.concurso)} · ${esc(prof.formacao)}</p>
      ${painelHoje}
      <dl class="resumo-linha">
        <div><dd>${minhas.length}</dd><dt>${plural(minhas.length, 'turma', 'turmas')}</dt></div>
        <div><dd>${estudantes}</dd><dt>${plural(estudantes, 'estudante no diário', 'estudantes no diário')}</dt></div>
        <div class="${emRisco ? 'alerta' : ''}"><dd>${emRisco}</dd><dt>${plural(emRisco, 'estudante', 'estudantes')} com frequência abaixo de ${PRESENCA_MINIMA}%</dt></div>
      </dl>
      ${minhas.length ? `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Turmas do professor</caption>
        <thead><tr><th scope="col">Turma</th><th scope="col">Código</th><th scope="col">Escola</th><th scope="col">Componente</th><th scope="col" class="num">Aulas por semana</th><th scope="col" class="num">Estudantes no diário</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead>
        <tbody>${minhas.map(({ turma, componente, aulasSemana }) => `<tr><td class="titulo-linha"><strong>${esc(turma.nome)}</strong></td><td data-rotulo="Código">${esc(codigoDaTurma(turma))}</td><td data-rotulo="Escola">${esc(nomeCurto(escolas.find((e) => e.id === turma.escolaId).nome))}</td><td data-rotulo="Componente">${esc(componente)}</td><td data-rotulo="Aulas por semana" class="num">${aulasSemana}</td><td data-rotulo="Estudantes no diário" class="num">${(dia[turma.id] || []).length}</td><td class="acoes"><div class="linha-botoes coluna-botoes"><a class="botao botao-secundario botao-mini" href="${link('professor/diario.html')}?turma=${turma.id}">Abrir diário</a><a class="botao botao-secundario botao-mini" href="${link('professor/mapa.html')}?turma=${turma.id}">Mapa de calor</a></div></td></tr>`).join('')}</tbody>
      </table></div>
      <p class="contagem">${minhas.length} ${plural(minhas.length, 'turma', 'turmas')} · dados de ${esc(dataBR(hojeISO()))}</p>` : vazio('Nenhuma turma alocada', 'Quando a coordenação da escola alocar você em uma turma aprovada, ela aparece aqui.')}
      <h2>Carga horária semanal</h2>
      <p class="esp-b-2">${usadas} de ${prof.cargaHorariaSemanal} aulas semanais, incluindo ${prof.aulasEmOutrasTurmas} em turmas de outras escolas e séries.</p>
      <div class="barra" role="img" aria-label="${usadas} de ${prof.cargaHorariaSemanal} aulas semanais alocadas"><span style="width:${perc}%"></span></div>
      <p class="texto-suave nota">Habilitação: ${esc(prof.habilitacao.join(', '))}. Pela regra de habilitação, a alocação só vale para componentes compatíveis com o concurso e a formação.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
