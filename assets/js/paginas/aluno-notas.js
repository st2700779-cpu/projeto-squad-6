// W5 · Notas e faltas do estudante escolhido no início. Cada matéria abre as notas por bimestre e mostra a situação.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, numeroBR, etiqueta } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { diario, letivo, estudantes } from '../dados.js';
import { desempenho, MEDIA_APROVACAO, MEDIA_RECUPERACAO, PRESENCA_MINIMA } from '../regras.js';

const main = await iniciar({ perfil: 'aluno', assistente: true, titulo: 'Notas e faltas', voltar: 'aluno/index.html', estreito: true });
async function mostrar() {
  try {
    const [{ lista, atual: est }, dia, lv] = await Promise.all([estudantes(), diario(), letivo()]);
    const { linhas, presenca: pres, matematicaDoDiario } = desempenho(est, dia, lv.aulasDadas);
    const atencao = linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.situacao.chave)).map((l) => l.materia);
    const nome = est.nome.split(' ')[0];
    const resumo = `A presença de ${nome} está em ${pres.toFixed(0)} por cento. O mínimo é ${PRESENCA_MINIMA} por cento. ${atencao.length ? `Precisa de atenção em: ${atencao.join(', ')}.` : 'A média está boa em todas as matérias.'} A média para passar de ano é ${MEDIA_APROVACAO}.`;
    const nf = (v) => (v === null ? '—' : numeroBR(v));
    main.innerHTML = `
      <h1>Boletim de ${esc(est.nome)}</h1>
      <p class="pagina-descricao">${esc(est.turma)} · ${lv.bimestresLancados} de ${lv.totalBimestres} bimestres lançados · situação parcial</p>
      ${lista.length > 1 ? `<p class="texto-suave esp-t-0 esp-b-3">Para ver outro estudante, escolha na <a href="${link('aluno/index.html')}">página inicial da família</a>.</p>` : ''}
      <dl class="resumo-linha">
        <div class="${pres < PRESENCA_MINIMA ? 'alerta' : ''}"><dd>${pres.toFixed(1).replace('.', ',')}%</dd><dt>de frequência (mínimo ${PRESENCA_MINIMA}%)</dt></div>
        <div class="${atencao.length ? 'atencao' : ''}"><dd>${atencao.length}</dd><dt>${atencao.length === 1 ? 'matéria em atenção' : 'matérias em atenção'}</dt></div>
      </dl>
      <div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Notas por matéria e bimestre</caption>
        <thead><tr><th scope="col">Matéria</th><th scope="col" class="num">1º bimestre</th><th scope="col" class="num">2º bimestre</th><th scope="col" class="num">Média</th><th scope="col">Situação</th></tr></thead>
        <tbody>${linhas.map((l) => `<tr><td class="titulo-linha"><strong>${esc(l.materia)}</strong></td><td class="num" data-rotulo="1º bimestre">${nf(l.n1)}</td><td class="num" data-rotulo="2º bimestre">${nf(l.n2)}</td><td class="num negrito" data-rotulo="Média">${nf(l.media)}</td><td data-rotulo="Situação">${etiqueta(l.situacao.texto, l.situacao.tipo)}</td></tr>`).join('')}</tbody>
      </table></div>
      <p class="contagem">${linhas.length} matérias · aprovação: média ${MEDIA_APROVACAO} e frequência de ${PRESENCA_MINIMA}%; recuperação: média de ${MEDIA_RECUPERACAO} a menos de ${MEDIA_APROVACAO}.${matematicaDoDiario ? ' A nota de Matemática vem do diário do professor.' : ''}</p>
      <div class="linha-botoes esp-t-3">${botaoOuvir(resumo, 'Ouvir resumo')}</div>`;
  } catch { falhaDados(main, mostrar); }
}
mostrar();
