import { iniciar, link, falhaDados } from '../app.js';
import { icone, esc, numeroBR, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { carregar, diario } from '../dados.js';
import { media, presenca, MEDIA_APROVACAO, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true });
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
      <a class="voltar" href="${link('familia/index.html')}">${icone('voltar', 20)}Voltar ao início</a>
      <h1 style="margin-top:.5rem">Notas e faltas</h1>
      <div class="cartao">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><strong>Presença nas aulas</strong>${botaoOuvir(resumo, 'Ouvir resumo')}</div>
        <p style="font-size:2rem;font-weight:700;margin:.3rem 0 0">${pres.toFixed(0)}%</p>
        <p class="texto-suave" style="margin:0 0 .5rem">Mínimo para passar de ano: ${PRESENCA_MINIMA}%</p>
        <div class="barra" role="img" aria-label="Presença de ${pres.toFixed(0)} por cento; mínimo de ${PRESENCA_MINIMA}"><span style="width:${pres}%"></span><i class="marca-minimo" style="left:${PRESENCA_MINIMA}%"></i></div>
      </div>
      <div class="tabela-rolagem"><table class="tabela" style="min-width:0"><caption class="sr-only">Notas por matéria</caption>
        <thead><tr><th scope="col">Matéria</th><th scope="col">1ª unid.</th><th scope="col">2ª unid.</th><th scope="col">Média</th><th scope="col">Situação</th></tr></thead>
        <tbody>${linhas.map(([m, a, b]) => { const md = media(a, b); return `<tr><td>${esc(m)}</td><td>${numeroBR(a)}</td><td>${numeroBR(b)}</td><td><strong>${numeroBR(md)}</strong></td><td>${md >= MEDIA_APROVACAO ? etiqueta('Indo bem', 'ok') : etiqueta('Precisa de atenção', 'atencao')}</td></tr>`; }).join('')}</tbody>
      </table></div>
      <p class="texto-suave" style="font-size:.9rem">A nota de Matemática vem do diário do professor e muda quando ele lança notas.</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
