// Painel de frequência: o anel muda de cor (sempre com número e palavra), mostra a margem de faltas e deixa simular uma falta.
// A simulação é só conta no navegador: não grava nada e some ao recarregar.
import { iniciar, falhaDados } from '../app.js';
import { esc, numeroBR, plural } from '../ui.js';
import { botaoOuvir } from '../acessibilidade.js';
import { estudantes } from '../dados.js';
import { painelDoEstudante } from '../painel-dados.js';
import { PRESENCA_MINIMA, FREQUENCIA_BOA, fraseDaMargem, simularFaltas, semaforoFrequencia, proximoDiaDeAula, aulasDoDia, NOME_DO_DIA } from '../regras.js';
import { anelDeFrequencia, barraDeNivel, semaforo } from '../componentes/indicadores.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/frequencia.html', assistente: true, titulo: 'Frequência', estreito: true });
let diasSimulados = 0;
let ctx;

const legenda = () => [
  [semaforoFrequencia(FREQUENCIA_BOA), `${FREQUENCIA_BOA}% ou mais`],
  [semaforoFrequencia(PRESENCA_MINIMA), `de ${PRESENCA_MINIMA}% a menos de ${FREQUENCIA_BOA}%`],
  [semaforoFrequencia(0), `abaixo de ${PRESENCA_MINIMA}%`]
].map(([n, faixa]) => `<li>${semaforo(n)} <span class="texto-suave">${faixa}</span></li>`).join('');

// Quantas aulas o aluno perderia faltando um dia: as de hoje, ou as do próximo dia com aula.
function diaDaSimulacao() {
  const { grade, aulasHoje, hoje } = ctx;
  if (aulasHoje.length) return { n: aulasHoje.length, rotulo: 'hoje', nome: 'hoje' };
  const p = proximoDiaDeAula(grade, hoje);
  const n = p ? aulasDoDia(grade, p.dia).length : 1;
  return { n, rotulo: p ? `no próximo dia de aula (${NOME_DO_DIA[p.dia].toLowerCase()})` : 'em um dia de aula', nome: p ? NOME_DO_DIA[p.dia].toLowerCase() : 'um dia' };
}

function blocoSimulacao() {
  const { d, lv, margem, semFreq } = ctx;
  const dia = diaDaSimulacao();
  const botao = diasSimulados ? 'Simular mais um dia de falta' : `Simular falta ${dia.rotulo} (${dia.n} ${plural(dia.n, 'aula', 'aulas')})`;
  let resultado = '<p class="texto-suave esp-t-0">Veja o que muda se faltar. Nada é gravado.</p>';
  if (diasSimulados) {
    const s = simularFaltas(d.faltas, lv.aulasDadas, dia.n * diasSimulados);
    const quanto = dia.n * diasSimulados;
    resultado = `<div role="status" aria-live="polite">
      <p class="esp-t-0"><strong>Se faltar ${diasSimulados} ${plural(diasSimulados, 'dia', 'dias')} (${quanto} ${plural(quanto, 'aula', 'aulas')}):</strong></p>
      <dl>
        <div><dt>Frequência</dt><dd>${numeroBR(s.presenca)}%<span class="antes">hoje: ${numeroBR(d.presenca)}%</span></dd></div>
        <div><dt>Faltas que ainda cabem</dt><dd>${Math.max(0, s.margem.restantes)}<span class="antes">hoje: ${Math.max(0, margem.restantes)}</span></dd></div>
        <div><dt>Situação</dt><dd>${semaforo(s.semaforo)}<span class="antes">hoje: ${esc(semFreq.texto)}</span></dd></div>
      </dl>
      <p class="esp-b-0">${esc(fraseDaMargem(s.margem))}</p></div>`;
  }
  return `<section class="simulacao" aria-labelledby="sim-titulo"><h3 id="sim-titulo">Simular falta</h3>${resultado}
    <div class="linha-botoes"><button type="button" class="botao botao-secundario" id="simular">${botao}</button>${diasSimulados ? '<button type="button" class="botao botao-texto" id="limpar-sim">Limpar simulação</button>' : ''}</div></section>`;
}

async function mostrar() {
  try {
    const { atual: est } = await estudantes();
    ctx = await painelDoEstudante(est);
    const { d, lv, margem, semFreq } = ctx;
    const falado = `Sua frequência é de ${d.presenca.toFixed(0)} por cento. Situação: ${semFreq.texto}. ${fraseDaMargem(margem)}`;
    main.innerHTML = `
      <h1>Frequência</h1>
      <p class="pagina-descricao">${esc(est.nome)} · ${esc(est.turma)}</p>
      <div class="painel-freq">
        ${anelDeFrequencia(d.presenca, semFreq)}
        <div>
          <p class="esp-t-0 esp-b-2">${semaforo(semFreq, { grande: true })}</p>
          <p class="esp-b-3"><strong>${d.faltas} ${plural(d.faltas, 'falta', 'faltas')}</strong> em ${lv.aulasDadas} aulas dadas${d.abonadas ? ` (já sem ${d.abonadas} ${plural(d.abonadas, 'falta abonada', 'faltas abonadas')} por justificativa aceita)` : ''}. O mínimo para aprovar é <strong>${PRESENCA_MINIMA}%</strong>.</p>
          ${barraDeNivel(d.presenca, semFreq)}
          <div class="barra-legenda"><span>0%</span><span>mínimo ${PRESENCA_MINIMA}%</span><span>100%</span></div>
        </div>
      </div>
      <div class="margem nivel-${semFreq.chave}"><strong>Margem de segurança: ${Math.max(0, margem.restantes)} ${plural(Math.max(0, margem.restantes), 'falta', 'faltas')}</strong><p>${esc(fraseDaMargem(margem))}</p></div>
      <div class="linha-botoes esp-b-3">${botaoOuvir(falado, 'Ouvir resumo')}</div>
      <div id="simulacao">${blocoSimulacao()}</div>
      <div class="so-detalhe">
        <h2>Como ler as cores</h2>
        <ul class="legenda">${legenda()}</ul>
        <details class="esp-t-3"><summary>Como a margem é calculada</summary>
          <p>Cada aula perdida conta como uma falta. O limite é de 25% das aulas dadas até hoje: com ${lv.aulasDadas} aulas dadas, cabem ${margem.limite} faltas. A cada aula dada o limite sobe um pouco.</p>
          <p>A frequência é calculada sobre as aulas dadas até hoje, como no boletim.</p></details>
      </div>`;
  } catch { falhaDados(main, mostrar); }
}

main.addEventListener('click', (e) => {
  if (e.target.closest('#simular')) { diasSimulados += 1; document.querySelector('#simulacao').innerHTML = blocoSimulacao(); document.querySelector('#simular').focus(); }
  if (e.target.closest('#limpar-sim')) { diasSimulados = 0; document.querySelector('#simulacao').innerHTML = blocoSimulacao(); document.querySelector('#simular').focus(); }
});
mostrar();
