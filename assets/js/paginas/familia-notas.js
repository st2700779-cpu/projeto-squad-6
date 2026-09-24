// W5 · Notas e faltas. Cada matéria abre as notas por unidade.
import { iniciar, falhaDados } from '../app.js';
import { esc, numeroBR, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, diario } from '../dados.js';
import { media, presenca, MEDIA_APROVACAO, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Notas e faltas', voltar: 'familia/index.html' });
async function mostrar() {
  try {
    const [est, dia] = await Promise.all([carregar('estudante'), diario()]);
    const mat = dia[est.turmaId].find((a) => a.id === est.id);
    const linhas = [['Matemática', mat.n1, mat.n2], ...Object.entries(est.notas).map(([m, [a, b]]) => [m, a, b])];
    const pres = presenca(mat.faltas, est.aulasDadas);
    const atencao = linhas.filter(([, a, b]) => media(a, b) < MEDIA_APROVACAO).map(([m]) => m);
    const nome = est.nome.split(' ')[0];
    const resumo = `A presença de ${nome} está em ${pres.toFixed(0)} por cento. O mínimo é ${PRESENCA_MINIMA} por cento. ${atencao.length ? `Precisa de atenção em: ${atencao.join(', ')}.` : 'A média está boa em todas as matérias.'} A média para passar de ano é ${MEDIA_APROVACAO}.`;
    main.innerHTML = `
      <h1 class="sr-only">Notas e faltas de ${esc(nome)}</h1>
      <div class="cartao" style="padding:1.2rem 1.4rem">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><strong style="font-size:1.15rem">Presença nas aulas</strong>${botaoOuvir(resumo, 'Resumo')}</div>
        <p style="font-size:2.6rem;font-weight:700;margin:.2rem 0 0;line-height:1.2">${pres.toFixed(0)}%</p>
        <p class="texto-suave" style="margin:0 0 .6rem">Mínimo para passar de ano: ${PRESENCA_MINIMA}%</p>
        <div class="barra" role="img" aria-label="Presença de ${pres.toFixed(0)} por cento; mínimo de ${PRESENCA_MINIMA}"><span style="width:${pres}%"></span><i class="marca-minimo" style="left:${PRESENCA_MINIMA}%"></i></div>
      </div>
      <div class="materias-cabecalho" aria-hidden="true"><span>Matéria</span><span style="text-align:right">Média</span><span>Situação</span></div>
      <div class="materias" role="list" aria-label="Notas por matéria">
        ${linhas.map(([m, a, b]) => { const md = media(a, b); return `
          <details class="materia" role="listitem">
            <summary><span>${esc(m)}</span><strong><span class="sr-only">média </span>${numeroBR(md)}</strong>${md >= MEDIA_APROVACAO ? etiqueta('Indo bem', 'ok') : etiqueta('Precisa de atenção', 'atencao')}</summary>
            <div class="unidades"><span>1ª unidade: <strong style="color:var(--tinta)">${numeroBR(a)}</strong></span><span>2ª unidade: <strong style="color:var(--tinta)">${numeroBR(b)}</strong></span></div>
          </details>`; }).join('')}
      </div>
      <p class="texto-suave" style="margin-top:1rem">Toque em uma matéria para ver as notas de cada unidade.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
