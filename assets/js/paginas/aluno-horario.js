// Horário da semana do estudante: um quadro por dia, com o dia de hoje em destaque.
import { iniciar, falhaDados } from '../app.js';
import { esc, plural, vazio } from '../ui.js';
import { estudantes, carregar } from '../dados.js';
import { painelDoEstudante } from '../painel-dados.js';
import { DIAS, NOME_DO_DIA, aulasDoDia, diaDaSemana } from '../regras.js';
import { dataPorExtenso } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/horario.html', assistente: true, titulo: 'Meu horário' });
async function mostrar() {
  try {
    const { atual: est } = await estudantes();
    const [p, professores] = await Promise.all([painelDoEstudante(est), carregar('professores')]);
    if (!p.grade) { main.innerHTML = `<h1>Meu horário</h1>${vazio('Horário ainda não publicado', `A escola ainda não publicou o horário da ${est.turma}. Quando publicar, ele aparece aqui.`)}`; return; }
    const hoje = diaDaSemana(p.hoje);
    const nome = (id) => professores.find((x) => x.id === id)?.nome;
    const aulas = p.aulasHoje;
    const resumo = aulas.length
      ? `Hoje tem ${aulas.length} ${plural(aulas.length, 'aula', 'aulas')}. A primeira é ${aulas[0].componente}, às ${aulas[0].inicio}.`
      : `Hoje não tem aula (${NOME_DO_DIA[hoje]}).`;
    main.innerHTML = `
      <h1>Meu horário</h1>
      <p class="pagina-descricao">${esc(est.turma)} · turno da ${esc(p.grade.turno.toLowerCase())} · ${esc(p.grade.sala)}</p>
      <p class="esp-b-4"><strong>${esc(dataPorExtenso(p.hoje))}.</strong> ${esc(resumo)}</p>
      <div class="semana">${DIAS.map((dia) => {
        const lista = aulasDoDia(p.grade, dia);
        return `<section class="dia-aulas${dia === hoje ? ' hoje' : ''}" aria-labelledby="dia-${dia}">
          <h3 id="dia-${dia}"><span>${NOME_DO_DIA[dia]}</span>${dia === hoje ? '<span>Hoje</span>' : ''}</h3>
          <ol>${lista.map((a) => `<li><span class="hora">${a.inicio} às ${a.fim}</span><span class="materia-nome">${esc(a.componente)}</span>${nome(a.professorId) ? `<small>${esc(nome(a.professorId))}</small>` : ''}</li>`).join('')}</ol></section>`;
      }).join('')}</div>
      <p class="texto-suave texto-pequeno">Cada aula dura 50 minutos. O intervalo é depois da segunda aula. Horário da escola, sujeito a ajuste pela coordenação.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
