// Quiz por unidade: perguntas de data/quiz.json (por série, matéria e bimestre), uma por vez, com retorno imediato.
// Nada vai para servidor: as respostas e o histórico de tentativas ficam só neste navegador.
import { iniciar, falhaDados } from '../app.js';
import { esc, icone, vazio, dataBR, plural } from '../ui.js';
import { estudantes, carregar, dataDeReferencia } from '../dados.js';
import { tentativasDoQuiz, registrarTentativa } from '../painel-dados.js';

const main = await iniciar({ perfil: 'aluno', pagina: 'aluno/quiz.html', assistente: true, titulo: 'Quiz' });
const LETRAS = ['A', 'B', 'C', 'D'];
let est, bancos, hoje;
let sessao = null; // { banco, indice, respostas: [indice escolhido | null] }

const doEstudante = () => bancos.filter((b) => b.serie === est.serie);
const melhor = (lista) => lista.reduce((m, t) => (t.certas > m ? t.certas : m), 0);

function telaLista() {
  sessao = null;
  const lista = doEstudante();
  const hist = tentativasDoQuiz(est.id);
  main.innerHTML = `
    <h1>Quiz</h1>
    <p class="pagina-descricao">Perguntas sobre o que a sua turma está estudando. Você escolhe a matéria e o bimestre, responde uma pergunta por vez e vê na hora se acertou.</p>
    ${lista.length ? `<ul class="lista-limpa grade-cartoes">${lista.map((b) => {
      const t = hist.filter((x) => x.banco === b.id);
      return `<li class="cartao-turma"><h3>${esc(b.componente)} <span class="texto-suave texto-pequeno peso-normal">${esc(b.unidade)}</span></h3>
        <p class="esp-t-0 esp-b-1">${esc(b.topico)}</p>
        <p class="texto-suave texto-pequeno esp-t-0 esp-b-2">${b.perguntas.length} perguntas${t.length ? ` · melhor resultado: ${melhor(t)} de ${b.perguntas.length} · ${t.length} ${plural(t.length, 'tentativa', 'tentativas')}` : ''}</p>
        <button type="button" class="botao" data-banco="${b.id}">${icone('pergunta', 20)}${t.length ? 'Tentar de novo' : 'Começar'}<span class="sr-only">: ${esc(b.componente)}, ${esc(b.unidade)}</span></button></li>`;
    }).join('')}</ul>` : vazio('Ainda não há quiz para a sua turma', 'Os quizzes seguem a matriz curricular da série. Quando o da sua série for publicado, ele aparece aqui.')}
    ${hist.length ? `<h2>Suas tentativas</h2>${tabelaHistorico(hist)}` : ''}`;
}
function tabelaHistorico(hist) {
  return `<div class="tabela-rolagem"><table class="tabela tabela-cartoes"><caption class="sr-only">Histórico de tentativas do quiz, por unidade</caption>
    <thead><tr><th scope="col">Matéria e unidade</th><th scope="col" class="num">Última</th><th scope="col" class="num">Melhor</th><th scope="col" class="num">Tentativas</th><th scope="col">Data da última</th></tr></thead>
    <tbody>${[...new Set(hist.map((t) => t.banco))].map((id) => {
      const b = bancos.find((x) => x.id === id); const t = hist.filter((x) => x.banco === id);
      return `<tr><td class="titulo-linha"><strong>${esc(b.componente)}</strong> · ${esc(b.unidade)}</td><td class="num" data-rotulo="Última"><div>${t[0].certas} de ${t[0].total}</div></td><td class="num" data-rotulo="Melhor"><div>${melhor(t)} de ${t[0].total}</div></td><td class="num" data-rotulo="Tentativas"><div>${t.length}</div></td><td data-rotulo="Data da última"><div>${dataBR(t[0].quando)}</div></td></tr>`;
    }).join('')}</tbody></table></div>`;
}

function telaPergunta(foco = true) {
  const { banco, indice, respostas } = sessao;
  const q = banco.perguntas[indice];
  const marcada = respostas[indice];
  const respondida = marcada !== null;
  const total = banco.perguntas.length;
  const ultima = indice === total - 1;
  main.innerHTML = `
    <p class="quiz-topo"><span>${esc(banco.componente)} · ${esc(banco.unidade)}</span><span id="quiz-passo">Pergunta ${indice + 1} de ${total}</span></p>
    <div class="progresso" role="img" aria-label="Pergunta ${indice + 1} de ${total}"><span style="width:${((indice + (respondida ? 1 : 0)) / total) * 100}%"></span></div>
    <h1 class="quiz-pergunta" id="quiz-enunciado" tabindex="-1">${esc(q.enunciado)}</h1>
    <div class="opcoes" role="group" aria-labelledby="quiz-enunciado">${q.opcoes.map((o, i) => {
      const certa = i === q.correta;
      const classe = respondida ? (certa ? ' certa' : i === marcada ? ' errada' : '') : '';
      const retorno = respondida ? (certa ? `<span class="retorno">${icone('ok', 18)}${i === marcada ? 'Correta' : 'Resposta certa'}</span>` : i === marcada ? `<span class="retorno">${icone('fechar', 18)}Errada</span>` : '') : '';
      return `<button type="button" class="opcao${classe}" data-opcao="${i}" ${respondida ? 'disabled aria-disabled="true"' : ''} aria-pressed="${i === marcada}"><strong aria-hidden="true">${LETRAS[i]}</strong><span>${esc(o)}</span>${retorno}</button>`;
    }).join('')}</div>
    <div id="quiz-retorno" role="status" aria-live="polite">${respondida ? `<p class="explicacao"><strong>${marcada === q.correta ? 'Acertou.' : 'Não foi dessa vez.'}</strong> ${esc(q.explicacao)}</p>` : ''}</div>
    <div class="barra-acoes compacta">
      <button type="button" class="botao botao-secundario" id="anterior" ${indice === 0 ? 'disabled' : ''}>Anterior</button>
      ${ultima ? `<button type="button" class="botao" id="finalizar" ${respondida ? '' : 'disabled'}>Ver resultado</button>` : `<button type="button" class="botao" id="proxima" ${respondida ? '' : 'disabled'}>Próxima</button>`}
      <button type="button" class="botao botao-texto" id="sair-quiz">Sair do quiz</button>
    </div>`;
  if (foco) main.querySelector('#quiz-enunciado').focus();
}

async function finalizar() {
  const { banco, respostas } = sessao;
  const certas = banco.perguntas.filter((q, i) => respostas[i] === q.correta).length;
  const total = banco.perguntas.length;
  registrarTentativa(est.id, { banco: banco.id, quando: hoje, certas, total });
  const ant = tentativasDoQuiz(est.id).filter((t) => t.banco === banco.id);
  main.innerHTML = `
    <div class="quiz-resultado">
      <h1 tabindex="-1" id="quiz-resultado">Resultado: ${esc(banco.componente)} · ${esc(banco.unidade)}</h1>
      <p class="placar" role="status">${certas} de ${total} ${plural(certas, 'acerto', 'acertos')}</p>
      <p>${certas === total ? 'Você acertou todas.' : certas / total >= 0.6 ? 'Bom resultado. Veja as que errou e tente de novo se quiser.' : 'Vale rever o conteúdo e tentar de novo. Você pode repetir quantas vezes quiser.'}</p>
      ${ant.length > 1 ? `<p class="texto-suave">Tentativas anteriores nesta unidade: ${ant.slice(1, 4).map((t) => `${t.certas} de ${t.total} (${dataBR(t.quando)})`).join(' · ')}.</p>` : ''}
      <h2>Pergunta por pergunta</h2>
      <ol class="lista-texto">${banco.perguntas.map((q, i) => { const ok = respostas[i] === q.correta; return `<li><span class="semaforo nivel-${ok ? 'verde' : 'vermelho'}"><span class="sinal" aria-hidden="true">${icone(ok ? 'ok' : 'fechar', 16)}</span><span>${ok ? 'Acertou' : 'Errou'}</span></span> ${esc(q.enunciado)}${ok ? '' : `<br><span class="texto-suave">Resposta certa: ${esc(q.opcoes[q.correta])}</span>`}</li>`; }).join('')}</ol>
      <h2>Por unidade</h2>${tabelaHistorico(tentativasDoQuiz(est.id))}
      <div class="linha-botoes esp-t-4"><button type="button" class="botao" id="repetir" data-banco="${banco.id}">Tentar de novo</button><button type="button" class="botao botao-secundario" id="sair-quiz">Voltar aos quizzes</button></div>
    </div>`;
  main.querySelector('#quiz-resultado').focus();
}

const comecar = (id) => { sessao = { banco: bancos.find((b) => b.id === id), indice: 0, respostas: bancos.find((b) => b.id === id).perguntas.map(() => null) }; telaPergunta(); };

main.addEventListener('click', (e) => {
  const iniciarBanco = e.target.closest('[data-banco]');
  if (iniciarBanco) { comecar(iniciarBanco.dataset.banco); return; }
  const opcao = e.target.closest('[data-opcao]');
  if (opcao && sessao) {
    sessao.respostas[sessao.indice] = Number(opcao.dataset.opcao);
    telaPergunta(false);
    main.querySelector('#proxima, #finalizar').focus();
    return;
  }
  if (e.target.closest('#proxima')) { sessao.indice += 1; telaPergunta(); }
  else if (e.target.closest('#anterior')) { sessao.indice -= 1; telaPergunta(); }
  else if (e.target.closest('#finalizar')) finalizar();
  else if (e.target.closest('#sair-quiz')) telaLista();
});

(async function iniciarQuiz() {
  try {
    ({ atual: est } = await estudantes());
    [{ bancos }, hoje] = await Promise.all([carregar('quiz'), dataDeReferencia()]);
    telaLista();
  } catch { falhaDados(main, iniciarQuiz); }
})();
