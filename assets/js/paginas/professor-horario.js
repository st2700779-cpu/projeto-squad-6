// Horário da semana do professor: as aulas de todas as turmas, dia a dia, com o dia de hoje em destaque.
import { iniciar, falhaDados } from '../app.js';
import { esc, plural, vazio } from '../ui.js';
import { carregar, conjunto, dataDeReferencia } from '../dados.js';
import { DIAS, NOME_DO_DIA, aulasDoProfessor, diaDaSemana } from '../regras.js';
import { dataPorExtenso } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'professor', pagina: 'professor/horario.html', assistente: true, titulo: 'Meu horário' });
async function mostrar() {
  try {
    const [logado, horarios, hoje] = await Promise.all([carregar('professor'), conjunto('horarios'), dataDeReferencia()]);
    const aulas = aulasDoProfessor(horarios, logado.professorId);
    if (!aulas.length) { main.innerHTML = `<h1>Meu horário</h1>${vazio('Horário ainda não montado', 'Quando a coordenação montar a grade das suas turmas, as aulas aparecem aqui.')}`; return; }
    const dia = diaDaSemana(hoje);
    const turmas = new Set(aulas.map((a) => a.turma));
    main.innerHTML = `
      <h1>Meu horário</h1>
      <p class="pagina-descricao">${aulas.length} ${plural(aulas.length, 'aula', 'aulas')} por semana em ${turmas.size} ${plural(turmas.size, 'turma', 'turmas')}. Hoje é ${esc(dataPorExtenso(hoje))}.</p>
      <div class="semana">${DIAS.map((d) => {
        const lista = aulas.filter((a) => a.dia === d);
        return `<section class="dia-aulas${d === dia ? ' hoje' : ''}${lista.length ? '' : ' sem-aula'}" aria-labelledby="dia-${d}">
          <h3 id="dia-${d}"><span>${NOME_DO_DIA[d]}</span>${d === dia ? '<span>Hoje</span>' : ''}</h3>
          ${lista.length ? `<ol>${lista.map((a) => `<li><span class="hora">${a.inicio} às ${a.fim}</span><span class="materia-nome">${esc(a.turma)}</span><small>${esc(a.componente)} · ${esc(a.sala)}</small></li>`).join('')}</ol>` : '<p class="texto-suave esp-t-2 esp-b-2 texto-pequeno" style="padding-inline:var(--sp-3)">Sem aula.</p>'}</section>`;
      }).join('')}</div>
      <p class="texto-suave texto-pequeno">Horário montado pela coordenação da escola. Quem altera a grade é a coordenação pedagógica.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
