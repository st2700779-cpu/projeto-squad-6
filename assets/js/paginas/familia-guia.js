// Guia por voz: árvore de decisão fixa em data/arvore-voz.json, lida com speechSynthesis (sem reconhecimento de fala).
// Botões grandes, com ícone, texto e nome da cor (a cor nunca vem sozinha); Repetir e Voltar sempre na tela.
import { iniciar, link, falhaDados } from '../app.js';
import { esc, icone } from '../ui.js';
import { carregar } from '../dados.js';
import { ler, podeLer } from '../acessibilidade.js';

const main = await iniciar({ perfil: 'familia', assistente: false, titulo: 'Ouvir instruções', estreito: true });
const NOME_COR = { verde: 'botão verde', azul: 'botão azul', laranja: 'botão laranja', cinza: 'botão cinza' };
let arvore;
let atual = null;   // id do nó em exibição; null = tela de início do guia
const pilha = [];

function inicio() {
  atual = null;
  window.speechSynthesis?.cancel();
  main.innerHTML = `<div class="guia">
    <h1 tabindex="-1">Ouvir instruções</h1>
    <p class="texto-medio">${podeLer() ? 'Toque no botão para ouvir as instruções. O texto também aparece na tela.' : 'Este aparelho não lê em voz alta, mas as instruções aparecem na tela.'}</p>
    <button type="button" class="botao botao-grande botao-ouvir-grande" id="comecar">${icone('alto', 32)}${podeLer() ? 'Ouvir instruções' : 'Ver instruções'}</button>
    <p class="esp-t-4"><a href="${link('familia/matricula.html')}">Ir direto para a matrícula</a></p></div>`;
  main.querySelector('h1').focus();
}
function no(id, falar = true) {
  atual = id;
  const n = arvore.nos[id];
  main.innerHTML = `<div class="guia">
    <h1 tabindex="-1">${esc(n.titulo)}</h1>
    ${n.lista ? `<ul class="guia-lista">${n.lista.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
    <div class="guia-opcoes">${n.opcoes.map((o) => {
      const conteudo = `${icone(o.icone, 36)}<span>${esc(o.rotulo)}<small>${NOME_COR[o.cor]}</small></span>`;
      return o.link ? `<a class="guia-opcao ${o.cor}" href="${link(o.link)}">${conteudo}</a>` : `<button type="button" class="guia-opcao ${o.cor}" data-proximo="${esc(o.proximo)}">${conteudo}</button>`;
    }).join('')}</div>
    <div class="guia-barra"><button type="button" class="botao botao-secundario" data-repetir>${icone('repetir', 24)}Repetir</button><button type="button" class="botao botao-secundario" data-voltar>${icone('voltar', 24)}Voltar</button></div></div>`;
  main.querySelector('h1').focus();
  if (falar && podeLer()) ler(n.fala);
}
main.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.id === 'comecar') { pilha.length = 0; no(arvore.inicio); return; }
  if (b.dataset.proximo) { pilha.push(atual); no(b.dataset.proximo); return; }
  if ('repetir' in b.dataset) { if (podeLer()) ler(arvore.nos[atual].fala); return; }
  if ('voltar' in b.dataset) { if (pilha.length) no(pilha.pop()); else inicio(); }
});
async function mostrar() {
  try { arvore = await carregar('arvore-voz'); inicio(); } catch { falhaDados(main, mostrar); }
}
mostrar();
