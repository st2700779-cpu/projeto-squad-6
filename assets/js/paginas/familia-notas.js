// W5 · Notas e faltas do estudante escolhido no início. Cada matéria abre as notas por bimestre e mostra a situação.
import { iniciar, falhaDados } from '../app.js';
import { esc, numeroBR, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { diario, letivo, estudantes } from '../dados.js';
import { desempenho, MEDIA_APROVACAO, MEDIA_RECUPERACAO, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'familia', assistente: true, titulo: 'Notas e faltas', voltar: 'familia/index.html' });
async function mostrar() {
  try {
    const [{ lista, atual: est }, dia, lv] = await Promise.all([estudantes(), diario(), letivo()]);
    const { linhas, presenca: pres, matematicaDoDiario } = desempenho(est, dia, lv.aulasDadas);
    const atencao = linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.situacao.chave)).map((l) => l.materia);
    const nome = est.nome.split(' ')[0];
    const resumo = `A presença de ${nome} está em ${pres.toFixed(0)} por cento. O mínimo é ${PRESENCA_MINIMA} por cento. ${atencao.length ? `Precisa de atenção em: ${atencao.join(', ')}.` : 'A média está boa em todas as matérias.'} A média para passar de ano é ${MEDIA_APROVACAO}.`;
    main.innerHTML = `
      <h1 class="sr-only">Notas e faltas de ${esc(nome)}</h1>
      ${lista.length > 1 ? `<p class="texto-suave esp-t-0 esp-b-3">Estudante: <strong class="cor-tinta">${esc(est.nome)}</strong> · ${esc(est.turma)}</p>` : ''}
      <div class="cartao cartao-destaque">
        <div class="d-flex justify-content-between align-items-center gap-2 flex-wrap"><strong class="texto-medio">Presença nas aulas</strong>${botaoOuvir(resumo, 'Resumo')}</div>
        <p class="numero-grande">${pres.toFixed(0)}%</p>
        <p class="texto-suave esp-t-0 esp-b-3">Mínimo para passar de ano: ${PRESENCA_MINIMA}%</p>
        <div class="barra" role="img" aria-label="Presença de ${pres.toFixed(0)} por cento; mínimo de ${PRESENCA_MINIMA}"><span style="width:${pres}%"></span><i class="marca-minimo" style="left:${PRESENCA_MINIMA}%"></i></div>
      </div>
      <div class="materias-cabecalho" aria-hidden="true"><span>Matéria</span><span class="direita">Média</span><span>Situação</span></div>
      <ul class="materias lista-limpa" aria-label="Notas por matéria">
        ${linhas.map((l) => `
          <li><details class="materia">
            <summary><span>${esc(l.materia)}</span><strong><span class="sr-only">média </span>${l.media === null ? '—' : numeroBR(l.media)}</strong>${etiqueta(l.situacao.texto, l.situacao.tipo)}</summary>
            <div class="unidades"><span>1º bimestre: <strong>${l.n1 === null ? 'ainda não lançada' : numeroBR(l.n1)}</strong></span><span>2º bimestre: <strong>${l.n2 === null ? 'ainda não lançada' : numeroBR(l.n2)}</strong></span></div>
          </details></li>`).join('')}
      </ul>
      <p class="texto-suave esp-t-4">Toque em uma matéria para ver as notas de cada bimestre. A situação é parcial, pois o ano letivo ainda não terminou: considera a média até agora (aprovado: ${MEDIA_APROVACAO} ou mais; recuperação: ${MEDIA_RECUPERACAO} a menos de ${MEDIA_APROVACAO}) e a frequência mínima de ${PRESENCA_MINIMA}%.${matematicaDoDiario ? ' A nota de Matemática vem do diário do professor.' : ''}</p>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
