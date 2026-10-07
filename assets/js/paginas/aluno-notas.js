// Notas e faltas do estudante. Serve ao aluno e ao responsável (o perfil vem de <body data-perfil>).
// Cada matéria mostra as notas por bimestre, o semáforo da nota (cor, símbolo e palavra) e a situação.
// O responsável escolhe o filho no alto e pode ligar o modo simplificado (só matéria, nota e semáforo).
import { iniciar, falhaDados, controleModoSimples } from '../app.js';
import { esc, numeroBR, etiqueta, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { diario, letivo, estudantes, escolherEstudante } from '../dados.js';
import { desempenho, MEDIA_APROVACAO, MEDIA_RECUPERACAO, PRESENCA_MINIMA, semaforoNota, semaforoFrequencia, margemDeFaltas } from '../regras.js';
import { semaforo, seletorDeEstudante } from '../componentes/indicadores.js';

const perfil = document.body.dataset.perfil || 'aluno';
const main = await iniciar({ perfil, pagina: perfil === 'aluno' ? 'aluno/notas.html' : 'responsavel/boletim.html', assistente: true, titulo: 'Notas e faltas', estreito: true });
async function mostrar() {
  try {
    const [{ lista, atual: est }, dia, lv] = await Promise.all([estudantes(), diario(), letivo()]);
    const { linhas, presenca: pres, faltas, matematicaDoDiario } = desempenho(est, dia, lv.aulasDadas);
    const atencao = linhas.filter((l) => ['recuperacao', 'reprovado'].includes(l.situacao.chave)).map((l) => l.materia);
    const semFreq = semaforoFrequencia(pres);
    const margem = margemDeFaltas(faltas, lv.aulasDadas);
    const nome = est.nome.split(' ')[0];
    const resumo = `A presença de ${nome} está em ${pres.toFixed(0)} por cento, ${semFreq.texto}. O mínimo é ${PRESENCA_MINIMA} por cento. ${atencao.length ? `Precisa de atenção em: ${atencao.join(', ')}.` : 'A média está boa em todas as matérias.'} A média para passar de ano é ${MEDIA_APROVACAO}.`;
    const nf = (v) => (v === null ? '—' : numeroBR(v));
    main.innerHTML = `
      <h1>Boletim de ${esc(est.nome)}</h1>
      <p class="pagina-descricao">${esc(est.turma)} · ${lv.bimestresLancados} de ${lv.totalBimestres} bimestres lançados · situação parcial</p>
      ${perfil === 'responsavel' ? `${seletorDeEstudante(lista, est.id)}<div class="esp-b-3">${controleModoSimples()}</div>` : ''}
      <dl class="resumo-linha">
        <div class="${pres < PRESENCA_MINIMA ? 'alerta' : semFreq.chave === 'amarelo' ? 'atencao' : ''}"><dd>${numeroBR(pres)}%</dd><dt>de frequência (mínimo ${PRESENCA_MINIMA}%) · ${semaforo(semFreq)}</dt></div>
        <div class="so-completo"><dd>${Math.max(0, margem.restantes)}</dd><dt>${plural(Math.max(0, margem.restantes), 'falta ainda cabe', 'faltas ainda cabem')}</dt></div>
        <div class="${atencao.length ? 'atencao' : ''}"><dd>${atencao.length}</dd><dt>${plural(atencao.length, 'matéria em atenção', 'matérias em atenção')}</dt></div>
      </dl>
      <div class="tabela-rolagem sem-limite"><table class="tabela tabela-cartoes"><caption class="sr-only">Notas por matéria e bimestre</caption>
        <thead><tr><th scope="col">Matéria</th><th scope="col" class="num so-completo">1º bimestre</th><th scope="col" class="num so-completo">2º bimestre</th><th scope="col" class="num">Média</th><th scope="col">Nota</th><th scope="col" class="so-completo">Situação</th></tr></thead>
        <tbody>${linhas.map((l) => `<tr><td class="titulo-linha"><strong>${esc(l.materia)}</strong></td><td class="num so-completo" data-rotulo="1º bimestre"><div>${nf(l.n1)}</div></td><td class="num so-completo" data-rotulo="2º bimestre"><div>${nf(l.n2)}</div></td><td class="num negrito" data-rotulo="Média"><div>${nf(l.media)}</div></td><td data-rotulo="Nota"><div>${semaforo(semaforoNota(l.media))}</div></td><td data-rotulo="Situação" class="so-completo"><div>${etiqueta(l.situacao.texto, l.situacao.tipo)}</div></td></tr>`).join('')}</tbody>
      </table></div>
      <p class="contagem so-completo">${linhas.length} matérias · aprovação: média ${MEDIA_APROVACAO} e frequência de ${PRESENCA_MINIMA}%; recuperação: média de ${MEDIA_RECUPERACAO} a menos de ${MEDIA_APROVACAO}.${matematicaDoDiario ? ' A nota de Matemática vem do diário do professor.' : ''}</p>
      <p class="contagem">Nota: verde é média ${MEDIA_APROVACAO} ou mais; amarelo, de ${MEDIA_RECUPERACAO} a menos de ${MEDIA_APROVACAO}; vermelho, abaixo de ${MEDIA_RECUPERACAO}.</p>
      <div class="linha-botoes esp-t-3">${botaoOuvir(resumo, 'Ouvir resumo')}</div>`;
  } catch { falhaDados(main, mostrar); }
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('[data-estudante]');
  if (!b) return;
  escolherEstudante(b.dataset.estudante);
  mostrar().then(() => main.querySelector(`[data-estudante="${b.dataset.estudante}"]`)?.focus());
});
mostrar();
