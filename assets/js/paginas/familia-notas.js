// W5 · Notas e faltas do estudante escolhido no início. Cada matéria abre as notas por unidade.
import { iniciar, falhaDados } from '../app.js';
import { esc, numeroBR, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { diario, estudantes } from '../dados.js';
import { desempenho, MEDIA_APROVACAO, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Notas e faltas', voltar: 'familia/index.html' });
async function mostrar() {
  try {
    const [{ lista, atual: est }, dia] = await Promise.all([estudantes(), diario()]);
    const { linhas, presenca: pres, matematicaDoDiario } = desempenho(est, dia);
    const atencao = linhas.filter((l) => l.media < MEDIA_APROVACAO).map((l) => l.materia);
    const nome = est.nome.split(' ')[0];
    const resumo = `A presença de ${nome} está em ${pres.toFixed(0)} por cento. O mínimo é ${PRESENCA_MINIMA} por cento. ${atencao.length ? `Precisa de atenção em: ${atencao.join(', ')}.` : 'A média está boa em todas as matérias.'} A média para passar de ano é ${MEDIA_APROVACAO}.`;
    main.innerHTML = `
      <h1 class="sr-only">Notas e faltas de ${esc(nome)}</h1>
      ${lista.length > 1 ? `<p class="texto-suave" style="margin:0 0 .6rem">Estudante: <strong style="color:var(--tinta)">${esc(est.nome)}</strong> · ${esc(est.turma)}</p>` : ''}
      <div class="cartao" style="padding:1.2rem 1.4rem">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><strong style="font-size:1.15rem">Presença nas aulas</strong>${botaoOuvir(resumo, 'Resumo')}</div>
        <p style="font-size:2.6rem;font-weight:700;margin:.2rem 0 0;line-height:1.2">${pres.toFixed(0)}%</p>
        <p class="texto-suave" style="margin:0 0 .6rem">Mínimo para passar de ano: ${PRESENCA_MINIMA}%</p>
        <div class="barra" role="img" aria-label="Presença de ${pres.toFixed(0)} por cento; mínimo de ${PRESENCA_MINIMA}"><span style="width:${pres}%"></span><i class="marca-minimo" style="left:${PRESENCA_MINIMA}%"></i></div>
      </div>
      <div class="materias-cabecalho" aria-hidden="true"><span>Matéria</span><span style="text-align:right">Média</span><span>Situação</span></div>
      <div class="materias" role="list" aria-label="Notas por matéria">
        ${linhas.map((l) => `
          <details class="materia" role="listitem">
            <summary><span>${esc(l.materia)}</span><strong><span class="sr-only">média </span>${numeroBR(l.media)}</strong>${l.media >= MEDIA_APROVACAO ? etiqueta('Indo bem', 'ok') : etiqueta('Precisa de atenção', 'atencao')}</summary>
            <div class="unidades"><span>1ª unidade: <strong style="color:var(--tinta)">${numeroBR(l.n1)}</strong></span><span>2ª unidade: <strong style="color:var(--tinta)">${numeroBR(l.n2)}</strong></span></div>
          </details>`).join('')}
      </div>
      <p class="texto-suave" style="margin-top:1rem">Toque em uma matéria para ver as notas de cada unidade.${matematicaDoDiario ? ' A nota de Matemática vem do diário do professor.' : ''}</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
